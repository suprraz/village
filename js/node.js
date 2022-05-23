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
      routes: [],
    };

    this.pending = true;
    this.setHandshakeTimeout();

    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(config.RTC);
  }

  setHandshakeTimeout() {
    setTimeout(() => {
      if(this.pending === true) {
        logMessage(`Node Connection attempt to ${this.profile.nodeId} timed out.  Closing.`);
        this.pending = false;
        MessageRouter.onNetworkChange();
      }
    }, config.RTC.handshakeTimeout);
  }

  terminate() {
    this.pc.close();
    this.pending = false;
  }

  setProfile(profile) {
    this.profile.nodeId = profile.nodeId;
    this.profile.routes = profile.routes;
    this.pending = false;
  }

  setRoutes(routes) {
    this.profile.routes = routes;
  }

  setNodeId(nodeId) {
    if(NodeStore.getNodeById(nodeId)) {
      logError(`Node Duplicate node with same id: ${nodeId}`);
      throw new Error(`Node Duplicate node with same id: ${nodeId}`);
    }
    this.profile.nodeId = nodeId;
  }

  onConnectionStateChange() {
    MessageRouter.onNetworkChange();
  }

  registerDataChannelListeners() {
    this.dataChannel.onopen = (e) => this.onConnection(this);
    this.dataChannel.onmessage = (e) => this.onMessage(e, this);
    this.dataChannel.onbufferedamountlow = (e) => logError(`Node Datachannel Buffered Amount Low: ${e}`);
    this.dataChannel.onerror = (e) => logError(`Node Datachannel Error: ${e}`);
  }

  registerPCListeners() {
    this.pc.oniceconnectionstatechange = e =>  this.onConnectionStateChange();
    this.pc.onconnectionstatechange = e => this.onConnectionStateChange();
    this.pc.onicecandidateerror = e => logError(`Node ICE Candidate error: ${e}`);
    this.pc.onnegotiationneeded = e => logError(`Node ICE Negotiation needed: ${e}`);
  }

  createOffer() {
    return new Promise((resolve, reject) => {
      try {
        logMessage('Node Creating Offer');
        this.registerPCListeners();

        this.pc.onicecandidate = e => {
          if (e.candidate == null) {
            const offerKey = btoa(JSON.stringify(this.pc.localDescription));
            resolve(offerKey);
          }
        };

        this.dataChannel = this.pc.createDataChannel('offerChannel');
        this.registerDataChannelListeners();

        this.pc.createOffer().then( (desc) => {
            this.pc.setLocalDescription(desc);
          },
        );
      } catch (e) {
        logError(`Node Error while creating offer: ${e}`);
        reject(e);
      }
    });
  }

  acceptOffer(offerKey) {
    return new Promise((resolve, reject) => {
      try {
        logMessage('Node Accept Offer');
        this.registerPCListeners();

        this.pc.ondatachannel = (e) => {
          this.dataChannel = e.channel;
          this.registerDataChannelListeners();
        };

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
