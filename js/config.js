
export default {
  appName: 'Village OS',
  appNameConcat: 'VillageOS',
  mqttBrokers: ['wss://broker.emqx.io:8084/mqtt'],
  mqttOptions: {
    keepalive: 60,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,   // 30 sec
    useSSL: true,
  },
  maxConnectedNeighbors: 100,
  invoiceExpiration: 5*60*1000,  // 5 min
  RTC: {
    handshakeTimeout: 15 * 1000,
    iceServers: [
      {
        urls: "stun:openrelay.metered.ca:80",
      },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ]
  }
}
