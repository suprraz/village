
export default {
  appName: 'Village OS',
  appNameConcat: 'VillageOS',
  appVersion: '0.1',
  maxLogSize: 100,
  mqttBrokers: ['wss://broker.emqx.io:8084/mqtt'],
  mqttOptions: {
    keepalive: 60,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,             // 30 sec
    useSSL: true,
  },
  mqttParallelReqs: 3,
  villageParallelReqs: 3,
  maxConnectedNeighbors: 100,
  maxHops: 5,
  routingTableUpdateFrequency: 30000,      // 30 sec
  busyRouteRetry: 5*60*1000,               // 5 min
  invoiceExpiration: 5*60*1000,            // 5 min
  RTC: {
    handshakeTimeout: 30 * 1000,
    iceServers: [{
      urls: [ "stun:ws-turn2.xirsys.com" ]
    }, {
      username: "S9xK4lf35CfR8NxQlo0kQBbkEJcQvAXLVd7a0IDvkOQ5rJsmvxrp_sbBtJHmZgvfAAAAAGKMMPRzdXBycmF6",
      credential: "8fab7834-dafe-11ec-94b5-0242ac140004",
      urls: [
        "turn:ws-turn2.xirsys.com:80?transport=udp",
        "turn:ws-turn2.xirsys.com:3478?transport=udp",
        "turn:ws-turn2.xirsys.com:80?transport=tcp",
        "turn:ws-turn2.xirsys.com:3478?transport=tcp",
        "turns:ws-turn2.xirsys.com:443?transport=tcp",
        "turns:ws-turn2.xirsys.com:5349?transport=tcp"
      ]
    }]
  }
}
