
export default {
  appName: 'Village OS',
  appNameConcat: 'VillageOS',
  mqttBrokers: ['wss://broker.emqx.io:8084/mqtt'],
  maxConnectedNeighbors: 10,
  RTC: {
    iceServers: [
      {
        urls: "stun:openrelay.metered.ca:80"
      },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  }
}
