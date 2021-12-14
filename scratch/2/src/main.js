// client-side js, loaded by index.html
// run by the browser each time the page is loaded

let RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
let peerConn = new RTCPeerConnection({'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]});

let messagesEl = document.querySelector('.messages');
let peerIdEl = document.querySelector('#connect-to-peer');
let htmlCode = document.querySelector('#htmlCode');

let conn = null;

let logMessage = (message) => {
  let newMessage = document.createElement('div');
  newMessage.innerHTML = message;
  messagesEl.appendChild(newMessage);
};

function create() {
  console.log("Creating ...");
  let dataChannel = peerConn.createDataChannel('test');
  dataChannel.onopen = (e) => {
    window.say = (msg) => { dataChannel.send(msg); };
    logMessage('Say things with say("hi")');
  };
  dataChannel.onmessage = (e) => { console.log('Got message:', e.data); };
  peerConn.createOffer({})
    .then((desc) => peerConn.setLocalDescription(desc))
    .then(() => {})
    .catch((err) => console.error(err));

  peerConn.onicecandidate = (e) => {
    if (e.candidate == null) {
      logMessage("Connection string: <br />" + JSON.stringify(peerConn.localDescription));
    }
  };
  window.gotAnswer = (answer) => {
    logMessage("Initializing ...");
    peerConn.setRemoteDescription(new RTCSessionDescription(answer));
  };
}
create();


function join(offer) {
  logMessage("Joining ...");

  peerConn.ondatachannel = (e) => {
    logMessage("got a datachannel");
    var dataChannel = e.channel;
    dataChannel.onopen = (e) => {
      window.say = (msg) => { dataChannel.send(msg); };
      logMessage('Say things with say("hi")');
    };
    dataChannel.onmessage = (e) => { console.log('Got message:', e.data); }
  };

  peerConn.onicecandidate = (e) => {
    logMessage("got an ice candidate");
    if (e.candidate == null) {
      logMessage("Get the creator to call: gotAnswer(" +  JSON.stringify(peerConn.localDescription));
    }
  };

  var offerDesc = new RTCSessionDescription(offer);

  peerConn.onSignalingState = (state) => {
    console.log(state);
    // if (state === RTCSignalingState.RTCSignalingStateHaveRemoteOffer) {
    //   // answer here
    // }
  };

  peerConn.setRemoteDescription(offerDesc, () => {
    peerConn.createAnswer({})
      .then((answerDesc) => peerConn.setLocalDescription(answerDesc))
      .catch((err) => console.warn("Couldn't create answer", err));
  }, (err) => {
    console.warn(err);
  });

}


//
// // Handle incoming data connection
// peer.on('connection', (conn) => {
//   logMessage('incoming peer connection!');
//
//   conn.on('data', (data) => {
//     if(data.msg) {
//       logMessage(`received: ${data.msg}`);
//     }
//
//     if(data.run) {
//       eval(data.run);
//     }
//   });
//
//   conn.on('open', () => {
//     conn.send({msg: 'msg hello!'});
//
//     conn.send({msg: 'msg hello2!'});
//   });
// });


// Initiate outgoing connection
let connectToPeer = () => {
  let connectionString = peerIdEl.value;
  logMessage(`Connecting to ${connectionString}...`);

  let connectionObj = {};

  try{
    connectionObj = JSON.parse(connectionString);
  } catch (e) {
    logMessage("bad connection string");
    return;
  }

  join(connectionObj);
};

let send = (obj) => {
  let peerId = peerIdEl.value;
  if(!conn) {
    conn = peer.connect(peerId);
    conn.on('open', () => {
      conn.send(obj);
    });
  }
  conn.send(obj);
}

let sendCode = () => {
  send({msg: htmlCode.value});
}

let runCode = () => {
  send({run: htmlCode.value});
}
window.connectToPeer = connectToPeer;
