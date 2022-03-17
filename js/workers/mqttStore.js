import config from '../config.js';
import Profile from "../store/profile.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";
import NodeStore from "../store/nodeStore.js";
import MessageRouter from "../messageRouter.js";

class _MqttStore {
  constructor() {
    this.parentOnConnection = (node) => MessageRouter.onConnection(node);
    this.parentOnMessage = (data, node) => MessageRouter.onMessage(data, node);
    this.connectingNode = null;
    this.client = null;
    this.broadcastTopic = `mqtt/${config.appNameConcat}/bcast`;
    this.msgTopic = `mqtt/${config.appNameConcat}/msg`;

    this.mqttBroker = config.mqttBrokers[Math.floor(Math.random() * config.mqttBrokers.length)];

    this.init();
  }

  disconnect() {
    if(this.client) {
      this.client.end();
    }
  }

  init() {
    try {
      this.connect();

      this.client.on('connect', () => {
        this.registerListeners();
        this.broadcastAvailable();
      });
    } catch (e) {
      throw e;
    }
  }

  connect() {
    const options = {
      keepalive: 60,
      clientId: Profile.getNodeID(),
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
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
    logMessage([topic, payload].join(": "));
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
    if(message.fromId !== Profile.getNodeID()) {
      let answerKey = null;
      try {
        const node = new _Node({
          onConnection: (node) => this.parentOnConnection(node),
          onMessage: (data, node) => this.onMessage(data, node),
        });
        NodeStore.addNode(node);

        answerKey = await node.acceptOffer(message.offerKey);

        const answerMsg = {
          fromId: Profile.getNodeID(),
          type: 'answer-key',
          date: new Date(),
          answerKey,
        };

        this.sendMessage(message.fromId, answerMsg);
      } catch (e) {
        throw new Error(e);
      }
    }

  }

  async onAnswer(message) {
    if(message.fromId !== Profile.getNodeID()) {
      try {
        const connectionObj = JSON.parse(atob(message.answerKey));

        this.connectingNode.setRemoteDescription(connectionObj);
        this.broadcastAvailable();
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
      this.client.end();
      // try to reconnect
      setTimeout(this.init, 2000);
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

  async sendOffer(toId) {
    let offerKey = null;

    try {
      this.connectingNode = new _Node({
        onConnection: (node) => this.parentOnConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });
      NodeStore.addNode(this.connectingNode);
      offerKey = await this.connectingNode.createOffer();

      const offerMsg = {
        type: 'offer-key',
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
        offerKey,
      };

      this.sendMessage(toId, offerMsg);
    } catch (e) {
      logMessage(e);
    }
  }

  channelAvailable(toId) {
    if(NodeStore.getNodes().length === 0) {
      this.sendMessage(toId, {
        type: 'channel-request',
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  sendMessage(toId, message) {
    this.client.publish(`${this.msgTopic}/${toId}`, JSON.stringify(message), {qos: 1, retain: false});
  }

  broadcastMessage(message) {
    this.client.publish(`${this.broadcastTopic}/${Profile.getNodeID()}`, JSON.stringify(message), {qos: 0, retain: false});
  }

  parseMessage(message) {
    logMessage('Parsing message of type: '+ message.type);
    switch (message.type) {
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

export default _MqttStore;
