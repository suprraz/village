// const targetPeerEl = document.querySelector('#targetPeer');
// const remotePeerEl = document.querySelector('#remotePeer');
// const messagesEl = document.querySelector('#logs');
// const messageTextEl = document.querySelector('#messageText');
// const iceCandidateEl = document.querySelector('#iceCandidate');

const landingEl = document.querySelector('#landing');
const osViewEl = document.querySelector('#osView');

const configRPC = {'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]};

function logMessage(msg) {
  console.log(msg);
}

class _Village {
  constructor() {
    this.nodeCount = 0;
    this.pc = null;
  }

  start() {
    landingEl.classList.add('is-hidden');
    osViewEl.classList.remove('is-hidden');

    active.classList.remove("active");
    /*
    if( network has > 1 node) {
      openNodeCreateOffer();
    } else {
      createOffer();
    }
     */

    if(this.nodeCount > 0) {

    } else {
      this.createOffer();
    }

  }

  createOffer() {
    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(configRPC);

    this.dataChannel = this.pc.createDataChannel('offerChannel');
    this.dataChannel.onmessage = (e) => {
      logMessage(`<i>${e.data}</i>`);
    }
    this.dataChannel.addEventListener("open", (event) => {
      logMessage('Data chennel open')
    });

    this.pc.createOffer().then( (desc) => {
        this.pc.setLocalDescription(desc);
        logMessage(`Local Description: \n${JSON.stringify(desc)}`);
      },
    );
  }

}

const Village = new _Village();
