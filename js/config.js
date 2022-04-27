
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
    connectTimeout: 30 * 1000,
    useSSL: true,
  },
  maxConnectedNeighbors: 100,
  RTC: {
    handshakeTimeout: 15 * 1000,
    iceServers: [
      {
        "url": "stun:global.stun.twilio.com:3478?transport=udp",
        "urls": "stun:global.stun.twilio.com:3478?transport=udp"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
    ]
  }
}
