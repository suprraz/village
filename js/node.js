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
    this.profile.routes = profile.routes;
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

  registerDataChannelListeners() {
    this.pc.ondatachannel = (e) => {
      this.dataChannel = e.channel;

      this.dataChannel.onopen = (e) => this.onConnection(this);
      this.dataChannel.onmessage = (e) => this.onMessage(e, this);
      this.dataChannel.onbufferedamountlow = (e) => logError(`Datachannel Buffered Amount Low: ${e}`);
      this.dataChannel.onerror = (e) => logError(`Datachannel Error: ${e}`);
    };
  }

  registerPCListeners() {
    this.pc.oniceconnectionstatechange = e =>  this.onConnectionStateChange();
    this.pc.onconnectionstatechange = e => this.onConnectionStateChange();
    this.pc.onicecandidateerror = e => logError(`ICE Candidate error: ${e}`);
    this.pc.onnegotiationneeded = e => logError(`ICE Negotiation needed: ${e}`);
  }

  createOffer() {
    return new Promise((resolve, reject) => {
      try {
        this.registerDataChannelListeners();
        this.registerPCListeners();

        this.pc.onicecandidate = e => {
          if (e.candidate == null) {
            const offerKey = btoa(JSON.stringify(this.pc.localDescription));
            resolve(offerKey);
          }
        };

        this.pc.createDataChannel('offerChannel');

        this.pc.createOffer().then((desc) => {
            this.pc.setLocalDescription(desc);
          },
        )
      } catch (e) {
        logError(`Error while creatign offer: ${e}`);
        reject(e);
      }
    });
  }

  acceptOffer(offerKey) {
    return new Promise((resolve, reject) => {
      try {
        this.registerPCListeners();
        this.registerDataChannelListeners();

        this.pc.onicecandidate = e => {
          if (e.candidate == null) {
            const answerKey = btoa(JSON.stringify(this.pc.localDescription));
            resolve(answerKey);
          }
        };

        const connectionObj = JSON.parse(atob(offerKey));
        this.pc.setRemoteDescription(connectionObj);

        this.pc.createAnswer().then((answerDesc) => {
          this.pc.setLocalDescription(answerDesc);
        })
      } catch (e) {
        logError(`Error while accepting offer: ${e}`);
        reject(e);
      }
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
    if (this.pc.connectionState === 'connected' && this.dataChannel && this.dataChannel.readyState === 'open') {
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
