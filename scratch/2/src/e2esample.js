var pc1, pc2, offer, answer;

let wRTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;

pc1 = new wRTCPeerConnection({'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]});
pc2 = new wRTCPeerConnection({'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]});

pc1.onicecandidate = function(candidate) {
  pc2.addIceCandidate(candidate);
};

pc2.onicecandidate = function(candidate) {
  pc1.addIceCandidate(candidate);
};

pc1.createOffer(onOfferCreated, onError);

function onError(err) {
  window.alert(err.message);
}

function onOfferCreated(description) {
  offer = description;
  pc1.setLocalDescription(offer, onPc1LocalDescriptionSet, onError);
}

function onPc1LocalDescriptionSet() {
  // after this function returns, pc1 will start firing icecandidate events
  pc2.setRemoteDescription(offer, onPc2RemoteDescriptionSet, onError);
}

function onPc2RemoteDescriptionSet() {
  pc2.createAnswer(onAnswerCreated, onError);
}

function onAnswerCreated(description) {
  answer = description;
  pc2.setLocalDescription(answer, onPc2LocalDescriptionSet, onError);
}

function onPc2LocalDescriptionSet() {
  // after this function returns, you'll start getting icecandidate events on pc2
  pc1.setRemoteDescription(answer, onPc1RemoteDescriptionSet, onError);
}

function onPc1RemoteDescriptionSet() {
  window.alert('Yay, we finished signaling offers and answers');
}

