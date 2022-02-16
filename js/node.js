import { logMessage, logError } from './utils/logger.js';
import Profile from "./store/profile.js";

const configRPC = {
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
};

class _Node {
  constructor({onConnection, onMessage}) {

    this.onConnection = onConnection;
    this.onMessage = onMessage;

    this.pc = null;

    this.profile = {
      nodeId: null,
      neighborList: []
    };

    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(configRPC);
  }

  updateProfile(profile) {
    this.profile.nodeId = profile.nodeId;
    this.profile.neighborList = profile.neighborList;
  }

  onConnectionStateChange() {
    let stateElem = document.getElementById("connstate");
    stateElem.innerText = this.pc.iceConnectionState;
  }

  createOffer() {
    return new Promise((resolve, reject) => {
      this.pc.onicecandidate = e => {
        if (e.candidate == null) {
          const offerKey = btoa(JSON.stringify(this.pc.localDescription));
          resolve(offerKey);
        }
      };

      this.dataChannel = this.pc.createDataChannel('offerChannel');
      this.dataChannel.onmessage = (e) => this.onMessage(e, this);

      this.pc.addEventListener("iceconnectionstatechange", ev => {
        this.onConnectionStateChange();
      }, false);

      this.dataChannel.addEventListener("open", (event) => {
        logMessage('Data channel open');
        this.onConnection(this);
      });

      this.pc.createOffer().then( (desc) => {
          this.pc.setLocalDescription(desc);
        },
      );
    });
  }

  acceptOffer(offerKey) {
    return new Promise((resolve, reject) => {
      logMessage("<b>Accepting Offer</b>");

      this.pc.onicecandidate = e => {
        if (e.candidate == null) {
          const answerKey = btoa(JSON.stringify(this.pc.localDescription));
          resolve(answerKey);
        }
      };

      let connectionObj = {};

      try{
        connectionObj = JSON.parse(atob(offerKey));
      } catch (e) {
        logMessage(`Bad offerKey: ${offerKey}`);
        return;
      }

      this.pc.addEventListener("iceconnectionstatechange", ev => {
        let stateElem = document.getElementById("connstate");
        stateElem.innerText = this.pc.iceConnectionState;
        logMessage(`Connection state: ${this.pc.iceConnectionState}`);
      }, false);

      this.pc.ondatachannel = (e) => {
        logMessage("Got a data channel");

        this.dataChannel = e.channel;

        this.dataChannel.addEventListener("open", (event) => {
          logMessage('Data channel open');

          this.onConnection(this);
        });

        this.dataChannel.onmessage = (e) => this.onMessage(e, this);
      };

      this.pc.setRemoteDescription(connectionObj);
      this.pc.createAnswer().then((answerDesc) => {
        this.pc.setLocalDescription(answerDesc);
        logMessage(`Local Description: \n${JSON.stringify(answerDesc)}`);
      })

    });
  }

  setRemoteDescription(connectionObj) {
    this.pc.setRemoteDescription(connectionObj);
  }

  send(msgObj) {
    try {
      const msg = JSON.stringify({
        destinationId: this.profile.nodeId,  //overridable
        senderId: Profile.getNodeID(),
        ...msgObj
      });

      logMessage(msg);
      this.dataChannel.send(msg);

    } catch (e) {
      logError(e);
    }
  }
}

export default _Node;
