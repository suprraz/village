import { logMessage, logError } from './logger.js';

const configRPC = {'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]};

class _Node {
  constructor({onConnection, onMessage, onOfferUrl}) {

    this.onConnection = onConnection;
    this.onMessage = onMessage;
    this.onOfferUrl = onOfferUrl;

    this.pc = null;

    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(configRPC);
  }

  createOffer() {
    this.pc.onicecandidate = e => {
      if (e.candidate == null) {
        logMessage("Connection string: <br />" + JSON.stringify(this.pc.localDescription));

        const offerUrl = new URL(window.location.href);
        offerUrl.searchParams.set('offerKey', btoa(JSON.stringify(this.pc.localDescription)));

        this.onOfferUrl(offerUrl);
      }
    };

    this.dataChannel = this.pc.createDataChannel('offerChannel');
    this.dataChannel.onmessage = (e) => this.onMessage(e);

    this.pc.addEventListener("iceconnectionstatechange", ev => {
      let stateElem = document.getElementById("connstate");
      stateElem.innerText = this.pc.iceConnectionState;
      logMessage(`Connection state: ${this.pc.iceConnectionState}`);
    }, false);

    this.dataChannel.addEventListener("open", (event) => {
      logMessage('Data channel open');

      this.onConnection();
    });

    this.pc.createOffer().then( (desc) => {
        this.pc.setLocalDescription(desc);
        logMessage(`Local Description: \n${JSON.stringify(desc)}`);
      },
    );
  }

  acceptOffer(offerKey) {
    logMessage("<b>Accepting Offer</b>");

    this.pc.onicecandidate = e => {
      if (e.candidate == null) {
        logMessage("Connection string: <br />" + JSON.stringify(this.pc.localDescription));
        document.getElementById('answer').innerText = btoa(JSON.stringify(this.pc.localDescription));
      }
    };

    let connectionObj = {};

    try{
      connectionObj = JSON.parse(atob(offerKey));
    } catch (e) {
      logMessage("<span class=\"error\"> Bad connection string </span> ");
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

        this.onConnection();
      });

      this.dataChannel.onmessage = (e) => this.onMessage(e);
    };

    this.pc.setRemoteDescription(connectionObj);
    this.pc.createAnswer().then((answerDesc) => {
      this.pc.setLocalDescription(answerDesc);
      logMessage(`Local Description: \n${JSON.stringify(answerDesc)}`);
    })
  }

  setRemoteDescription(connectionObj) {
    this.pc.setRemoteDescription(connectionObj);
  }

  send(msg) {
    this.dataChannel.send(msg);
  }

}

export default _Node;
