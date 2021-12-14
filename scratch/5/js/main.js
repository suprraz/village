

const targetPeerEl = document.querySelector('#targetPeer');
const remotePeerEl = document.querySelector('#remotePeer');
const messagesEl = document.querySelector('#logs');
const messageTextEl = document.querySelector('#messageText');
const iceCandidateEl = document.querySelector('#iceCandidate');

const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
const pc = new RTCPeerConnection({'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]});

let dataChannel = null;

let logMessage = (message) => {
  let newMessage = document.createElement('div');
  newMessage.innerHTML = message;
  messagesEl.appendChild(newMessage);
};

pc.onicecandidate = e => {
  // if (e.candidate) {
  //   logMessage("ICE CANDIDATE: " + JSON.stringify(e.candidate));
  // }
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
      logMessage(`Local Description: \n${JSON.stringify(desc)}`);
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

  pc.setRemoteDescription(connectionObj);
}

function addIceCandidate() {
  logMessage("<b>Setting ICE candidate</b>");

  let candidateString = iceCandidateEl.value;

  let candidateObj = {};

  try{
    candidateObj = JSON.parse(candidateString);
  } catch (e) {
    logMessage("<span class=\"error\"> Bad candidate string </span> ");
    return;
  }

  pc.addIceCandidate(candidateObj);
}

async function acceptOffer() {
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
    logMessage("Got a data channel");
    dataChannel = e.channel;
    dataChannel.onmessage = (e) => {
      logMessage(`<i>${e.data}</i>`);
    }
  };

  await pc.setRemoteDescription(connectionObj);
  pc.createAnswer().then((answerDesc) => {
    pc.setLocalDescription(answerDesc);
    logMessage(`Local Description: \n${JSON.stringify(answerDesc)}`);

  })

}

function sendMsg() {
  const data = messageTextEl.value;
  dataChannel.send(data);
  logMessage('Sent Data: ' + data);
}

