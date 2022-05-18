import config from '../config.js';
import Profile from "../store/profile.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";
import NodeStore from "../store/nodeStore.js";
import MessageRouter from "../messageRouter.js";

class _MqttWorker {
  constructor() {
    this.parentOnConnection = (node) => MessageRouter.onConnection(node);
    this.parentOnMessage = (data, node) => MessageRouter.onMessage(data, node);
    this.client = null;
    this.broadcastTopic = `mqtt/${config.appNameConcat}/bcast`;
    this.msgTopic = `mqtt/${config.appNameConcat}/msg`;
    this.targetNodeId = null;
    this.initialized = false;

    this.mqttBroker = config.mqttBrokers[Math.floor(Math.random() * config.mqttBrokers.length)];
  }

  seekNodes() {
    if(this.client) {
      this.broadcastAvailable();
    } else {
      logMessage('Initializing MQTT connection.')
      try {
        this.connect();

        this.client.on('connect', () => {
          if(!this.initialized) {
            this.registerListeners();
            this.broadcastAvailable();
          }
          this.initialized = true;
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
        topic: `${this.nodeTopic}/${Profile.getNodeID()}`,
        payload: JSON.stringify({
          type: 'offline',
          fromId: Profile.getNodeID(),
          date: new Date()
        }),
        qos: 0,
        retain: false
      },
    }

    try {
      logMessage('MQTT Client connecting:');
      this.client = mqtt.connect(this.mqttBroker, options);
    } catch (e) {
      throw e;
    }
  }

  onMessage(e, senderNode) {
    if (e.data) {
      try {
        const data = JSON.parse(e.data);

        this.parentOnMessage(data, senderNode);
      } catch (e) {
        logError(e);
      }
    }
  }

  onNotification(topic, payload) {
    if(topic === `${this.msgTopic}/${Profile.getNodeID()}`) {
      try {
        const message = JSON.parse(payload);

        this.parseMessage(message);
      } catch (e) {
        logError(e);
      }
    } else if(topic.startsWith(this.broadcastTopic) && !topic.endsWith(Profile.getNodeID())) {
      try {
        const message = JSON.parse(payload);

        this.parseBroadcast(message);
      } catch (e) {
        logError(e);
      }
    }
  }

  async onOffer(message) {
    if(message.fromId !== Profile.getNodeID() && !NodeStore.getNodeById(message.fromId)) {
      let answerKey = null;
      try {
        const node = new _Node({
          onConnection: (node) => this.parentOnConnection(node),
          onMessage: (data, node) => this.onMessage(data, node),
        });
        node.setNodeId(message.fromId);
        NodeStore.addNode(node);

        answerKey = await node.acceptOffer(message.offerKey);


        const answerMsg = {
          fromId: Profile.getNodeID(),
          type: 'answer-key',
          date: new Date(),
          answerKey,
        };

        this.sendMessage(message.fromId, answerMsg);
        this.targetNodeId = null;
      } catch (e) {
        throw new Error(e);
      }
    }

  }

  async onAnswer(message) {
    if(message.fromId !== Profile.getNodeID()) {
      try {
        const connectionObj = JSON.parse(atob(message.answerKey));

        const node = NodeStore.getNodeById(message.fromId);

        node.setRemoteDescription(connectionObj);
        this.targetNodeId = null;
      } catch (e) {
        logError(e);
      }
    }
  }

  async sendOffer(toId) {
    if(toId !== Profile.getNodeID() && !NodeStore.getNodeById(toId)) {
      try {
        const node = new _Node({
          onConnection: (node) => this.parentOnConnection(node),
          onMessage: (data, node) => this.onMessage(data, node),
        });
        node.setNodeId(toId);
        NodeStore.addNode(node);
        const offerKey = await node.createOffer();

        const offerMsg = {
          type: 'offer-key',
          fromId: Profile.getNodeID(),
          toId,
          date: new Date(),
          offerKey,
        };

        this.sendMessage(toId, offerMsg);
      } catch (e) {
        logError(e);
      }
    }
  }

  registerListeners() {
    logMessage('MQTT Client connected.')

    this.client.subscribe(`${this.broadcastTopic}/+`);
    this.client.subscribe(`${this.msgTopic}/${Profile.getNodeID()}`);

    this.client.on("message", (topic, payload) => this.onNotification(topic, payload));

    this.client.on('error', (err) => {
      logMessage('MQTT Connection error: ', err);
    });

    this.client.on('reconnect', () => {
      logMessage('MQTT Reconnecting...');
    });
  }

  broadcastAvailable() {
    const message = {
      type: 'available',
      fromId: Profile.getNodeID(),
      date: new Date(),
    }

    this.broadcastMessage(message);
  }

  channelAvailable(toId) {
    if(NodeStore.getNodeById(toId)) {
      // Stale connection, kill it
      NodeStore.deleteNodesById(toId);
    }
    if(NodeStore.getNodes().length < config.maxConnectedNeighbors) {
      this.sendMessage(toId, {
        type: 'channel-available',
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  channelRequest(toId) {
    if(NodeStore.getNodes().length === 0 && this.targetNodeId == null) {
      this.targetNodeId = toId;
      this.sendMessage(toId, {
        type: 'channel-request',
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  sendMessage(toId, message) {
    logMessage(`Sending message: ${this.msgTopic}/${toId}`);
    this.client.publish(`${this.msgTopic}/${toId}`, JSON.stringify(message), {qos: 1, retain: false});
  }

  broadcastMessage(message) {
    logMessage(`Broadcasting message: ${this.broadcastTopic}/${Profile.getNodeID()}`);
    this.client.publish(`${this.broadcastTopic}/${Profile.getNodeID()}`, JSON.stringify(message), {qos: 0, retain: false});
  }

  parseMessage(message) {
    logMessage('Parsing message of type: '+ message.type);
    switch (message.type) {
      case 'channel-available':
        this.channelRequest(message.fromId);
        break;
      case 'channel-request':
        this.sendOffer(message.fromId);
        break;
      case 'offer-key':
        this.onOffer(message);
        break;
      case 'answer-key':
        this.onAnswer(message);
        break;
      default:
        break;
    }
  }

  parseBroadcast(message) {
    switch (message.type) {
      case 'available':
        this.channelAvailable(message.fromId);
        break;
    }
  }
}

export default _MqttWorker;
