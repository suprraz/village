import { logMessage, logError } from './utils/logger.js';
import Profile from "./store/profile.js";
import MessageRouter from "./messageRouter.js";
import config from "./config.js";
import NodeStore from "./store/nodeStore.js";

class _Node {
  constructor({nodeId, onConnection, onMessage, sendCandidate}) {

    this.onConnection = onConnection;
    this.onMessage = onMessage;
    this.sendCandidate = sendCandidate;

    this.pc = null;

    this.profile = {
      nodeId: nodeId || null,
      routes: [],
    };

    this.candidateType = null;
    this.pending = true;

    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(config.RTC);

    this.registerPCListeners();

    this.setHandshakeTimeout();
  }

  isConnected() {
    return !['failed','closed','disconnected'].includes(this.pc.iceConnectionState) && this.dataChannel?.readyState === 'open';
  }

  terminate() {
    this.pc.close();
    this.pending = false;
  }

  setProfile(profile) {
    this.profile.nodeId = profile.nodeId;
    this.profile.routes = profile.routes;
    this.pending = false;

    if(this.candidateType === null) {
      this.setCandidateType();
    }
  }

  setRoutes(routes) {
    this.profile.routes = routes;
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


  onConnectionStateChange(e) {
    MessageRouter.onNetworkChange();
  }

  registerDataChannelListeners() {
    this.dataChannel.onopen = (e) => this.onConnection(this);
    this.dataChannel.onmessage = (e) => this.onMessage(e, this);
    this.dataChannel.onerror = (e) => logError(`Node Datachannel Error: ${e}`);
  }

  registerPCListeners() {
    this.pc.oniceconnectionstatechange = e =>  this.onConnectionStateChange(e);
    this.pc.onconnectionstatechange = e => this.onConnectionStateChange(e);
    this.pc.onicecandidateerror = e => logError(`Node ICE Candidate error: ${e}`);
    this.pc.onnegotiationneeded = e => logError(`Node ICE Negotiation needed: ${e}`);

    this.pc.onicecandidate = e => {
      if(this.pc.canTrickleIceCandidates && typeof this.sendCandidate === "function") {
        this.sendCandidate(e.candidate);
      }
    }
  }

  addIceCandidate(candidate) {
    logMessage('Node Adding Ice candidate')
    this.pc.addIceCandidate(candidate)
      .catch((e) => logError(`Node Error adding ice candidate: ${e}`));
  }

  waitForLocalDescription() {
    if (this.pc.canTrickleIceCandidates && typeof this.sendCandidate === 'function') {
      logMessage(`Node Trickle enabled.`);
      return this.pc.localDescription;
    }
    logMessage(`Node Trickle disabled.`);
    return new Promise((r) => {
      this.pc.addEventListener('icegatheringstatechange', e => {
        if (e.target.iceGatheringState === 'complete') {
          r(this.pc.localDescription);
        }
      });
    })
  }

  createOffer() {
    return new Promise((resolve, reject) => {
      try {
        logMessage('Node Creating Offer');

        this.dataChannel = this.pc.createDataChannel('offerChannel');
        this.registerDataChannelListeners();

        this.pc.createOffer()
          .then( (desc) => this.pc.setLocalDescription(desc))
          .then(() => this.waitForLocalDescription())
          .then((offer) => {
            const offerKey = btoa(JSON.stringify(offer));
            resolve(offerKey);
          })
          .catch( e => {
            logError(`Node Error while creating offer: ${e}`);
          });
      } catch (e) {
        logError(`Node Error while creating offer: ${e}`);
        reject(e);
      }
    });
  }

  acceptOffer(offerKey) {
    return new Promise((resolve, reject) => {
      logMessage('Node Accept Offer');

      this.pc.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this.registerDataChannelListeners();
      };

      const remoteOffer = JSON.parse(atob(offerKey));
      this.pc.setRemoteDescription(remoteOffer)
        .then(() => this.pc.createAnswer())
        .then(answerDesc => this.pc.setLocalDescription(answerDesc))
        .then(() => this.waitForLocalDescription())
        .then(answer => {
          const answerKey = btoa(JSON.stringify(answer));
          resolve(answerKey);

        }).catch((e) => {
          logError(`Node Error while accepting offer: ${e}`);
          reject(e);
        });
    });
  }

  async setRemoteDescription(desc) {
    try {
      await this.pc.setRemoteDescription(desc);
    } catch (e) {
      logError(`Node Error while setting remote description: ${e}`);
    }
  }

  send(msgObj) {
    if ( this.isConnected() ) {
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

  async setCandidateType() {
    const stats = await this.pc.getStats();
    let selectedLocalCandidate;
    for (const {type, state, localCandidateId} of stats.values())
      if (type === 'candidate-pair' && state === 'succeeded' && localCandidateId) {
        selectedLocalCandidate = localCandidateId;
        break;
      }

    if(selectedLocalCandidate) {
      this.candidateType = stats.get(selectedLocalCandidate)?.candidateType;

      MessageRouter.onNetworkChange();  // refresh connections dashboard
    } else {
      this.candidateType = null;
    }
  }
}

export default _Node;
