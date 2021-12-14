// client-side js, loaded by index.html
// run by the browser each time the page is loaded

let Peer = window.Peer;

let messagesEl = document.querySelector('.messages');
let peerIdEl = document.querySelector('#connect-to-peer');
let htmlCode = document.querySelector('#htmlCode');

let conn = null;

let logMessage = (message) => {
  let newMessage = document.createElement('div');
  newMessage.innerHTML = message;
  messagesEl.appendChild(newMessage);
};

// Register with the peer server
let peer = new Peer({
  host: '/',
  path: '/peerjs/myapp'
});
peer.on('open', (id) => {
  logMessage('My peer ID is: ' + id);
});
peer.on('error', (error) => {
  console.error(error);
});

// Handle incoming data connection
peer.on('connection', (conn) => {
  logMessage('incoming peer connection!');

  conn.on('data', (data) => {
    if(data.msg) {
      logMessage(`received: ${data.msg}`);
    }

    if(data.run) {
      eval(data.run);
    }
  });

  conn.on('open', () => {
    conn.send({msg: 'msg hello!'});

    conn.send({msg: 'msg hello2!'});
  });
});


// Initiate outgoing connection
let connectToPeer = () => {
  let peerId = peerIdEl.value;
  logMessage(`Connecting to ${peerId}...`);

  send({msg: 'msg hi!'});

  conn.on('data', (data) => {
    logMessage(`received: ${data.msg}`);
  });

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
