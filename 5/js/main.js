

const targetPeerEl = document.querySelector('#targetPeer');
const remotePeerEl = document.querySelector('#remotePeer');
const messagesEl = document.querySelector('#logs');
const messageTextEl = document.querySelector('#messageText');

const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
const pc = new RTCPeerConnection({'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]});

let dataChannel = null;

let logMessage = (message) => {
  let newMessage = document.createElement('div');
  newMessage.innerHTML = message;
  messagesEl.appendChild(newMessage);
};

pc.onicecandidate = e => {
  if (e.candidate == null) {
    logMessage("Connection string: <br />" + JSON.stringify(pc.localDescription));
  }
};

function createOffer() {
  logMessage("<b>Creating Offer</b>");

  dataChannel = pc.createDataChannel('offerChannel');
  dataChannel.onmessage = (e) => {
    logMessage(`<i>${e.data}</i>`);
  }
  dataChannel.addEventListener("open", (event) => {
    logMessage('Data chennel open')
  });

  pc.createOffer().then( (desc) => {
      pc.setLocalDescription(desc);
      console.log(`Offer from localConnection\n${desc.sdp}`);
    },
  );
}

function setRemote() {
  logMessage("<b>Setting remote</b>");

  let connectionString = remotePeerEl.value;

  let connectionObj = {};

  try{
    connectionObj = JSON.parse(connectionString);
  } catch (e) {
    logMessage("<span class=\"error\"> Bad connection string </span> ");
    return;
  }

  const offer = new RTCSessionDescription(connectionObj);

  pc.setRemoteDescription(offer);
}

function acceptOffer() {
  logMessage("<b>Accepting Offer</b>");

  let connectionString = targetPeerEl.value;

  let connectionObj = {};

  try{
    connectionObj = JSON.parse(connectionString);
  } catch (e) {
    logMessage("<span class=\"error\"> Bad connection string </span> ");
    return;
  }

  pc.ondatachannel = (e) => {
    dataChannel = e.channel;
    dataChannel.onmessage = (e) => {
      logMessage(`<i>${e.data}</i>`);
    }
  };

  const offer = new RTCSessionDescription(connectionObj);

  pc.setRemoteDescription(offer);
  pc.createAnswer().then((answerDesc) => {
    logMessage("Answering connection string");
    pc.setLocalDescription(answerDesc);
  })

}

function sendMsg() {
  const data = messageTextEl.value;
  dataChannel.send(data);
  logMessage('Sent Data: ' + data);
}

