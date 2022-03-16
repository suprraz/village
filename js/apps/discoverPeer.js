import config from '../config.js';
import Profile from "../store/profile.js";
import {logMessage} from "../utils/logger.js";

class _DiscoverPeer {
  constructor() {

    this.client = null;
    this.nodeOnlineTopic = `mqtt/${config.appNameConcat}/online`;
    this.mqttBroker = config.mqttBrokers[Math.floor(Math.random() * config.mqttBrokers.length)];
    this.nodesOnline = [];
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
        this.advertise();
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
        topic: 'WillMsg',
        payload: 'Node disconnected without saying goodbye.',
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

  onMessage(topic, payload) {
    logMessage([topic, payload].join(": "));
    if(topic === this.nodeOnlineTopic) {
      this.onPeerDiscovered(payload);
    }
  }

  onPeerDiscovered(connectionString) {
    this.nodesOnline.push(connectionString);

  }

  registerListeners() {
    logMessage('MQTT Client connected:')

    this.client.subscribe(this.nodeOnlineTopic);
    this.client.on("message", this.onMessage);

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

  advertise() {
    this.client.publish(this.nodeOnlineTopic, "online", { qos: 0, retain: true });
  }
}

const DiscoverPeer = new _DiscoverPeer();

export default DiscoverPeer;
