export default {
  appName: "Village Protocol",
  appNameConcat: "VillageProtocol",
  appVersion: "0.1",
  maxLogSize: 100,
  signalingNetwork: "mqtt",
  mqttBrokers: ["wss://mqtt.flespi.io:443"],
  mqttOptions: {
    keepalive: 60,
    protocolId: "MQTT",
    protocolVersion: 5,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 4000, // 4 sec
    username:
      "FlespiToken xV4HrIugGoaWLMG7Kxpd4WrBhGumf0jDMd83Kt8gF62gIwdiRrkLdBaj8utdlDEV",
  },
  mqttParallelReqs: 3,
  villageParallelReqs: 3,
  maxConnectedNeighbors: 100,
  maxHops: 5,
  routingTableUpdateFrequency: 30 * 1000, // 30 sec
  busyRouteRetry: 5 * 60 * 1000, // 5 min
  invoiceExpiration: 10 * 60 * 1000, // 10 min
  checkForUpgradeFreq: 60 * 60 * 1000, // 1 hour
  RTC: {
    handshakeTimeout: 30 * 1000, // 30 sec
    iceServers: [
      {
        urls: ["stun:ws-turn2.xirsys.com"],
      },
      {
        username:
          "S9xK4lf35CfR8NxQlo0kQBbkEJcQvAXLVd7a0IDvkOQ5rJsmvxrp_sbBtJHmZgvfAAAAAGKMMPRzdXBycmF6",
        credential: "8fab7834-dafe-11ec-94b5-0242ac140004",
        urls: [
          "turn:ws-turn2.xirsys.com:80?transport=udp",
          "turn:ws-turn2.xirsys.com:3478?transport=udp",
          "turn:ws-turn2.xirsys.com:80?transport=tcp",
          "turn:ws-turn2.xirsys.com:3478?transport=tcp",
          "turns:ws-turn2.xirsys.com:443?transport=tcp",
          "turns:ws-turn2.xirsys.com:5349?transport=tcp",
        ],
      },
    ],
  },
  lnbits: {
    villageWalletId: "d5447e7968c64b2cbe975cb4a0201834",
  },
};
