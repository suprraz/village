import config from "../../config.js";
import Profile from "../profile.js";
import { logError, logMessage } from "../../utils/logger.js";
import _Node from "../node.js";
import NodeStore from "../nodeStore.js";

class _MqttWorker {
  #onNetworkChangeHandler;
  #onConnectionHandler;
  #onMessageHandler;
  #client;
  #broadcastTopic;
  #msgTopic;
  #mqttBroker;
  #connectingNodes;

  constructor(onNetworkChangeHandler, onConnectionHandler, onMessageHandler) {
    this.#onNetworkChangeHandler = onNetworkChangeHandler;
    this.#onConnectionHandler = onConnectionHandler;
    this.#onMessageHandler = onMessageHandler;

    this.#client = null;
    this.#broadcastTopic = `mqtt/${config.appNameConcat}/${config.appVersion}/bcast`;
    this.#msgTopic = `mqtt/${config.appNameConcat}/${config.appVersion}/msg`;

    this.#mqttBroker =
      config.mqttBrokers[Math.floor(Math.random() * config.mqttBrokers.length)];

    this.#connectingNodes = [];
  }

  seekNodes() {
    if (this.#connectingNodes.length >= config.mqttParallelReqs) {
      return;
    }

    logMessage("MQTT Seeking nodes");
    if (this.#client) {
      logMessage("MQTT Client ready");
      this.broadcastAvailable();
    } else {
      logMessage("MQTT Initializing connection.");
      try {
        this.connect();

        this.#client.once("connect", () => {
          logMessage("MQTT Connected.");

          this.registerListeners();
          this.broadcastAvailable();
        });
      } catch (e) {
        throw e;
      }
    }
  }

  connect() {
    const options = {
      ...config.mqttOptions,
      clientId: Profile.getNodeID(),
      will: {
        topic: `${this.#msgTopic}/${Profile.getNodeID()}`,
        payload: JSON.stringify({
          type: "offline",
          fromId: Profile.getNodeID(),
          date: new Date(),
        }),
        qos: 0,
        retain: false,
      },
    };

    try {
      logMessage("MQTT Client connecting");
      this.#client = mqtt.connect(this.#mqttBroker, options);
    } catch (e) {
      throw e;
    }
  }

  onMessage(e, senderNode) {
    if (e.data) {
      try {
        const data = JSON.parse(e.data);

        this.#onMessageHandler(data, senderNode);
      } catch (e) {
        logError(`MQTT message receive error: ${e}`);
      }
    }
  }

  onNotification(topic, payload) {
    if (topic === `${this.#msgTopic}/${Profile.getNodeID()}`) {
      try {
        const message = JSON.parse(payload);

        this.parseMessage(message);
      } catch (e) {
        logError(`MQTT notification error: ${e}`);
      }
    } else if (
      topic.startsWith(this.#broadcastTopic) &&
      !topic.endsWith(Profile.getNodeID())
    ) {
      try {
        const message = JSON.parse(payload);

        this.parseBroadcast(message);
      } catch (e) {
        logError(`MQTT broadcast receive error: ${e}`);
      }
    }
  }

  async acceptOffer(message) {
    if (
      message.fromId !== Profile.getNodeID() &&
      !NodeStore.getNodeById(message.fromId)
    ) {
      let answerKey = null;
      try {
        const node = new _Node({
          nodeId: message.fromId,
          onConnection: (node) => this.#onConnectionHandler(node),
          onMessage: (data, node) => this.onMessage(data, node),
          signalProtocol: "mqtt",
        });

        answerKey = await node.acceptOffer(message.offerKey);

        this.#connectingNodes = this.#connectingNodes.filter(
          (nId) => nId !== message.fromId
        );
        if (NodeStore.getNodeById(message.fromId)) {
          logMessage(`MQTT terminating node duplicate ${message.fromId}`);
          node.terminate();
          return;
        }

        NodeStore.addNode(node);

        const answerMsg = {
          fromId: Profile.getNodeID(),
          type: "answer-key",
          date: new Date(),
          answerKey,
        };

        logMessage(`MQTT sending answer to ${message.fromId}`);
        this.sendMessage(message.fromId, answerMsg);
      } catch (e) {
        throw new Error(e);
      }
    }
  }

  async onAnswer(message) {
    if (message.fromId !== Profile.getNodeID()) {
      try {
        const connectionObj = JSON.parse(atob(message.answerKey));

        const node = NodeStore.getNodeById(message.fromId);

        if (node) {
          node.setRemoteDescription(connectionObj);
        }
      } catch (e) {
        logError(e);
      }
    }
  }

  sendCandidate(toId, candidate) {
    const candidateMsg = {
      type: "routing",
      subtype: "ice-candidate",
      fromId: Profile.getNodeID(),
      toId,
      date: new Date(),
      candidate,
    };

    logMessage(`MQTT Sending ICE candidate to ${toId}`);
    this.sendMessage(toId, candidateMsg);
  }

  onCandidate(message) {
    try {
      const node = NodeStore.getNodeById(message.fromId);
      if (node) {
        logMessage(
          `MQTT Adding Ice candidate to ${node?.getProfile()?.nodeId}`
        );
        node.addIceCandidate(message.candidate);
      }
    } catch (e) {
      logError(e);
    }
  }

  async sendOffer(toId) {
    if (
      toId !== Profile.getNodeID() &&
      !NodeStore.getNodeById(toId) &&
      !this.#connectingNodes.includes(toId)
    ) {
      this.#connectingNodes.push(toId);

      setTimeout(() => {
        this.#connectingNodes = this.#connectingNodes.filter(
          (nId) => nId !== toId
        );
      }, config.RTC.handshakeTimeout);

      try {
        const node = new _Node({
          nodeId: toId,
          onConnection: (node) => this.#onConnectionHandler(node),
          onMessage: (data, node) => this.onMessage(data, node),
          signalProtocol: "mqtt",
        });

        const offerKey = await node.createOffer();

        this.#connectingNodes = this.#connectingNodes.filter(
          (nId) => nId !== toId
        );
        if (NodeStore.getNodeById(toId)) {
          logMessage(`MQTT terminating node duplicate ${toId}`);
          node.terminate();
          return;
        }

        NodeStore.addNode(node);

        const offerMsg = {
          type: "offer-key",
          fromId: Profile.getNodeID(),
          toId,
          date: new Date(),
          offerKey,
        };

        logMessage(`MQTT Sending offer to ${toId}`);
        this.sendMessage(toId, offerMsg);
      } catch (e) {
        logError(e);
      }
    }
  }

  registerListeners() {
    logMessage("MQTT Registering listeners");

    this.#client.subscribe(`${this.#broadcastTopic}/+`);
    this.#client.subscribe(`${this.#msgTopic}/${Profile.getNodeID()}`);

    this.#client.on("message", (topic, payload) =>
      this.onNotification(topic, payload)
    );

    this.#client.on("error", (err) => {
      logMessage("MQTT Connection error: ", err);
    });

    this.#client.on("reconnect", () => {
      logMessage("MQTT Reconnected");
      this.#onNetworkChangeHandler();
    });
  }

  broadcastAvailable() {
    const message = {
      type: "available",
      fromId: Profile.getNodeID(),
      date: new Date(),
    };

    logMessage(`MQTT Broadcasting available, source: ${Profile.getNodeID()}`);
    this.broadcastMessage(message);
  }

  channelAvailable(toId) {
    if (
      NodeStore.getNodeById(toId) ||
      toId === Profile.getNodeID() ||
      this.#connectingNodes.includes(toId)
    ) {
      return;
    }

    if (NodeStore.getNodes().length < config.maxConnectedNeighbors) {
      logMessage(`MQTT sending channel-available to ${toId}`);
      this.sendMessage(toId, {
        type: "channel-available",
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  channelRequest(toId) {
    if (
      this.#connectingNodes.length < config.mqttParallelReqs &&
      !NodeStore.getNodeById(toId) &&
      !this.#connectingNodes.includes(toId)
    ) {
      logMessage(`MQTT Sending channel-request to: ${toId}`);

      this.sendMessage(toId, {
        type: "channel-request",
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  sendMessage(toId, message) {
    this.#client.publish(`${this.#msgTopic}/${toId}`, JSON.stringify(message), {
      qos: 1,
      retain: false,
    });
  }

  broadcastMessage(message) {
    this.#client.publish(
      `${this.#broadcastTopic}/${Profile.getNodeID()}`,
      JSON.stringify(message),
      { qos: 0, retain: false }
    );
  }

  parseBroadcast(message) {
    logMessage("MQTT Parsing broadcast from: " + message.fromId);
    switch (message.type) {
      case "available":
        this.channelAvailable(message.fromId);
        break;
    }
  }

  parseMessage(message) {
    logMessage("MQTT Parsing message of type: " + message.type);
    switch (message.type) {
      case "channel-available":
        this.channelRequest(message.fromId);
        break;
      case "channel-request":
        this.sendOffer(message.fromId);
        break;
      case "offer-key":
        this.acceptOffer(message);
        break;
      case "answer-key":
        this.onAnswer(message);
        break;
      case "candidate":
        this.onCandidate(message);
        break;
      default:
        break;
    }
  }
}

export default _MqttWorker;
