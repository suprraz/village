
export default {
  appName: 'Village OS',
  appNameConcat: 'VillageOS',
  appVersion: '0.1',
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
  mqttParallelReqs: 20,
  maxConnectedNeighbors: 21,
  maxHops: 5,
  routingTableUpdateFrequency: 30000,      // 30 sec
  invoiceExpiration: 5*60*1000,            // 5 min
  RTC: {
    handshakeTimeout: 30 * 1000,
    iceServers: [{
      urls: ["stun:global.stun.twilio.com:3478?transport=udp"]
      // urls: [ "stun:ws-turn1.xirsys.com" ]
    }, {
      username: "d46e0JMasUOXnul7UhpIdiwfN6CAZcHm2BRXQ79o8uiHDcKfVUljY2QjTKhq84B9AAAAAGJ-xm9zdXBycmF6",
      credential: "6d7b1f32-d2ff-11ec-9699-0242ac140004",
      urls: [
        "turn:ws-turn1.xirsys.com:80?transport=udp",
        "turn:ws-turn1.xirsys.com:3478?transport=udp",
        "turn:ws-turn1.xirsys.com:80?transport=tcp",
        "turn:ws-turn1.xirsys.com:3478?transport=tcp",
        "turns:ws-turn1.xirsys.com:443?transport=tcp",
        "turns:ws-turn1.xirsys.com:5349?transport=tcp"
      ]
    }]
  }
}
