const configRPC = {'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]};

function logMessage(msg) {
  console.log(msg);
}

function hide(elementId) {
  document.getElementById(elementId).classList.add('is-hidden');
}
function show(elementId) {
  document.getElementById(elementId).classList.remove('is-hidden');
}

function offerClicked() {
  if(navigator.clipboard) {
    navigator.clipboard.writeText(document.getElementById('offer').innerText);
  }
  hide('offer');
  show('copiedOfferNotification');
  show('peerKeyPrompt');
}

function answerClicked() {
  if(navigator.clipboard) {
    navigator.clipboard.writeText(document.getElementById('answer').innerText);
  }
  hide('answer');
  show('copiedAnswerNotification');
  show('waitToConnect');
}

class _Village {
  constructor() {
    this.nodeCount = 0;
    this.pc = null;
    this.dataChannel = null;
    this.chatLog = [];
    this.updateChat();

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('offerKey')) {
      const offerKey = urlParams.get('offerKey');
      this.acceptOffer(offerKey);
    }
  }

  startOS() {
    hide('landing');
    show('osView');
  }

  start() {
    this.startOS();
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

    this.pc.onicecandidate = e => {
      if (e.candidate == null) {
        logMessage("Connection string: <br />" + JSON.stringify(this.pc.localDescription));

        var offerUrl = new URL(window.location.href);
        offerUrl.searchParams.set('offerKey', btoa(JSON.stringify(this.pc.localDescription)));

        document.getElementById('offer').innerText = offerUrl;
      }
    };

    this.dataChannel = this.pc.createDataChannel('offerChannel');
    this.dataChannel.onmessage = (e) => {
      logMessage(`<i>${e.data}</i>`);
      this.chatLog.push('Them: ' + e.data);
      this.updateChat();
    }
    this.dataChannel.addEventListener("open", (event) => {
      logMessage('Data chennel open');

      show('connectedView');
      hide('offerCard');
      hide('answerCard');
    });

    this.pc.createOffer().then( (desc) => {
        this.pc.setLocalDescription(desc);
        logMessage(`Local Description: \n${JSON.stringify(desc)}`);
      },
    );
  }

  acceptOffer(offerKey) {
    this.startOS();
    hide('offerCard');
    show('answerCard');

    logMessage("<b>Accepting Offer</b>");
    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(configRPC);

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

    this.pc.ondatachannel = (e) => {
      logMessage("Got a data channel");
      show('connectedView');
      hide('offerCard');
      hide('answerCard');

      this.dataChannel = e.channel;
      this.dataChannel.onmessage = (e) => {
        logMessage(`<i>${e.data}</i>`);
        this.chatLog.push('Them: ' + e.data);
        this.updateChat();
      }
    };

    this.pc.setRemoteDescription(connectionObj);
    this.pc.createAnswer().then((answerDesc) => {
      this.pc.setLocalDescription(answerDesc);
      logMessage(`Local Description: \n${JSON.stringify(answerDesc)}`);
    })
  }

  peerKeyEntered() {
    console.log('enabling');
    document.getElementById('submitKey').disabled=false;
  }

  setRemote() {
    logMessage("<b>Setting remote</b>");

    let connectionString = document.getElementById('peerKey').value;

    let connectionObj = {};

    try{
      connectionObj = JSON.parse(atob(connectionString));
    } catch (e) {
      logMessage("<span class=\"error\"> Bad connection string </span> ");
      return;
    }

    this.pc.setRemoteDescription(connectionObj);
  }

  chatKeyUp(event) {
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("myBtn").click();
    }
  }
  sendMessage() {
    const msg = document.getElementById('chatBoxMessage').value;
    this.dataChannel.send(msg);
    this.chatLog.push('Me: ' + msg);
    this.updateChat();
    document.getElementById('chatBoxMessage').value = '';
  }
  updateChat() {
    document.getElementById('chatLog').innerText = this.chatLog.join('\n');
  }
}

const Village = new _Village();

document.getElementById("chatBoxMessage").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    Village.sendMessage();
  }
});
