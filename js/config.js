
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
  mqttParallelReqs: 3,
  maxConnectedNeighbors: 100,
  maxHops: 5,
  routingTableUpdateFrequency: 30000,      // 30 sec
  invoiceExpiration: 5*60*1000,            // 5 min
  RTC: {
    handshakeTimeout: 30 * 1000,
    iceServers: [
      {
        "url": "stun:global.stun.twilio.com:3478?transport=udp",
        "urls": "stun:global.stun.twilio.com:3478?transport=udp"
      },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ]
  }
}
