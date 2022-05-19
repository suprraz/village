import { logMessage, logError } from './utils/logger.js';
import Profile from "./store/profile.js";
import MessageRouter from "./messageRouter.js";
import config from "./config.js";
import NodeStore from "./store/nodeStore.js";

class _Node {
  constructor({onConnection, onMessage}) {

    this.onConnection = onConnection;
    this.onMessage = onMessage;

    this.pc = null;

    this.profile = {
      nodeId: null,
      neighborList: []
    };

    this.pending = true;
    this.setHandshakeTimeout();

    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(config.RTC);
  }

  setHandshakeTimeout() {
    setTimeout(() => {
      if(this.pending === true) {
        logMessage(`Connection attempt to ${this.profile.nodeId} timed out.  Closing.`);
        this.pending = false;
        MessageRouter.onNetworkChange();
      }
    }, config.RTC.handshakeTimeout);
  }

  terminate() {
    this.pc.close();
  }

  setProfile(profile) {
    this.profile.nodeId = profile.nodeId;
    this.profile.neighborList = profile.neighborList;
    this.pending = false;
  }

  setNodeId(nodeId) {
    if(NodeStore.getNodeById(nodeId)) {
      logError(`Duplicate node with same id: ${nodeId}`);
      throw new Error(`Duplicate node with same id: ${nodeId}`);
    }
    this.profile.nodeId = nodeId;
  }

  onConnectionStateChange() {
    MessageRouter.onNetworkChange();
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

      this.pc.addEventListener("connectionstatechange", ev => {
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
      logMessage("Accepting Offer");

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
        this.onConnectionStateChange();
      }, false);

      this.pc.addEventListener("connectionstatechange", ev => {
        this.onConnectionStateChange();
      }, false);

      this.pc.ondatachannel = (e) => {
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
      })

    });
  }

  setRemoteDescription(connectionObj) {
    try {
      this.pc.setRemoteDescription(connectionObj);
    } catch (e) {
      logError(e);
    }
  }

  send(msgObj) {
    if (this.pc.connectionState === 'connected') {
      try {
        const msg = JSON.stringify({
          destinationId: this.profile.nodeId,  //overridable
          senderId: Profile.getNodeID(),
          ...msgObj,
          version: config.appVersion
        });

        this.dataChannel.send(msg);

      } catch (e) {
        logError(e);
      }
    }
  }
}

export default _Node;
