import AppStore from './appStore.js';

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

class _Village {
  constructor() {
    this.nodeCount = 0;
    this.pc = null;
    this.dataChannel = null;
    this.chatLog = [];
    this.availableApps = [];
    this.updateChat();

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('offerKey')) {
      const offerKey = urlParams.get('offerKey');
      this.acceptOffer(offerKey);
    }

    this.registerListeners();
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

  onMessage (e) {
    if(e.data) {
      try {
        const data = JSON.parse(e.data);

        if (data.msg) {
          logMessage(`<i>${data.msg}</i>`);
          this.chatLog.push('Them: ' + data.msg);
          this.updateChat();
        } else if (data.code) {
          logMessage(`<i>${data.code}</i>`);
          document.getElementById('editor').value = data.code;
          eval(data.code);
        } else if (data.apps) {
          this.onAvailableApps(data.apps);
        }
      } catch (e) {};
    }
  }

  onAvailableApps(apps) {
    const localApps = AppStore.getInstalledApps();
    let newApps = [];
    try {
      newApps = apps.filter((remoteApp) => {
        const isInstalled = localApps.some(
          (localApp => localApp.name === remoteApp.name));

         const isAvailable = this.availableApps.some(
            (availableApp => availableApp.name === remoteApp.name));

         return !isInstalled && !isAvailable;
        });

      this.availableApps.push(...newApps);
      this.updateAppList();
    } catch (e) {
      console.error(e);
    }
  }

  createOffer() {
    const RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
    this.pc = new RTCPeerConnection(configRPC);

    this.pc.onicecandidate = e => {
      if (e.candidate == null) {
        logMessage("Connection string: <br />" + JSON.stringify(this.pc.localDescription));

        const offerUrl = new URL(window.location.href);
        offerUrl.searchParams.set('offerKey', btoa(JSON.stringify(this.pc.localDescription)));

        document.getElementById('offer').innerText = offerUrl;
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

  onConnection() {
    show('connectedView');
    hide('offerCard');
    hide('answerCard');

    logMessage("Updating apps");
    this.updateAppList();
    this.sendApps();
  }

  updateAppList() {
    const installedApps = AppStore.getInstalledApps();

    const installedAppsDiv = document.getElementById("installedApps");

    if(!installedApps.length) {
      installedAppsDiv.innerText = "No apps installed.";
    } else {
      // remove all children and listeners
      while (installedAppsDiv.firstChild) {
        installedAppsDiv.removeChild(installedAppsDiv.firstChild);
      }
    }

    installedApps.map((app) => {
      installedAppsDiv.appendChild(this.createInstalledAppDiv(app));
    })


    const availableAppsDiv = document.getElementById("availableApps");

    if(!this.availableApps.length) {
      availableAppsDiv.innerText = "No apps available.";
    } else {
      // remove all children and listeners
      while (availableAppsDiv.firstChild) {
        availableAppsDiv.removeChild(availableAppsDiv.firstChild);
      }
    }

    this.availableApps.map((app) => {
      availableAppsDiv.appendChild(this.createAvailableAppDiv(app));
    })


  }

  createInstalledAppDiv(app){
    const appDiv = document.createElement('div');
    appDiv.className = "installedApp";

    const appNameDiv = document.createElement('div');
    appNameDiv.className = "appName";
    appNameDiv.innerText = app.name;

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "appRunButton";
    appRunBtn.innerText = "Run";
    appRunBtn.onclick = () => { AppStore.runApp(app)};

    const appEditBtn = document.createElement('button');
    appEditBtn.className = "appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = () => {
      const editor = document.getElementById('editor');
      const appName = document.getElementById('appName');

      editor.value = app.code;
      appName.value = app.name;
    };

    const appRemoveBtn = document.createElement('button');
    appRemoveBtn.className = "appRemoveButton";
    appRemoveBtn.innerText = "Remove";
    appRemoveBtn.onclick = () => {
      AppStore.removeApp(app.name)
      this.availableApps.push(app);
      this.updateAppList();
    };

    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(appRunBtn);
    appDiv.appendChild(appEditBtn);
    appDiv.appendChild(appRemoveBtn);

    return appDiv;
  }

  createAvailableAppDiv(app){
    const appDiv = document.createElement('div');
    appDiv.className = "availableApp";

    const appNameDiv = document.createElement('div');
    appNameDiv.className = "appName";
    appNameDiv.innerText = app.name;

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "appRunButton";
    appRunBtn.innerText = "Run";
    appRunBtn.onclick = () => { AppStore.runApp(app)};

    const appInstallBtn = document.createElement('button');
    appInstallBtn.className = "appInstallButton";
    appInstallBtn.innerText = "Install";
    appInstallBtn.onclick = () => {
      try {
        AppStore.installApp(app)
        this.availableApps = this.availableApps.filter((availableApp) => !availableApp.name === app.name);
        this.updateAppList()
        this.sendApps();
      } catch (e) {
        console.error(e);
      }
    };

    const appEditBtn = document.createElement('button');
    appEditBtn.className = "appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = () => {
      const editor = document.getElementById('editor');
      const appName = document.getElementById('appName');

      editor.value = app.code;
      appName.value = app.name;
    };

    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(appRunBtn);
    appDiv.appendChild(appInstallBtn);
    appDiv.appendChild(appEditBtn);

    return appDiv;
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

  sendApps() {
    const apps = AppStore.getInstalledApps();

    this.dataChannel.send(JSON.stringify({apps}));
  }

  sendMessage() {
    const msg = document.getElementById('chatBoxMessage').value;
    this.dataChannel.send(JSON.stringify({msg}));
    this.chatLog.push('Me: ' + msg);
    this.updateChat();
    document.getElementById('chatBoxMessage').value = '';
  }
  updateChat() {
    document.getElementById('chatLog').innerText = this.chatLog.join('\n');
  }

  runLocal() {
    document.getElementById('editorlog').innerText = 'Running locally... ' + (new Date());
    const code = document.getElementById('editor').value;

    eval(code);
  }

  runRemote() {
    document.getElementById('editorlog').innerText = 'Running remote... ' + (new Date());

    const code = document.getElementById('editor').value;
    this.dataChannel.send(JSON.stringify({code}));
  }

  createApp() {
    const appName = document.getElementById('appName').value;
    const code = document.getElementById('editor').value;

    try {
      AppStore.installApp({name: appName, code});
      this.updateAppList();
      this.sendApps();
    } catch (e) {
      console.log(e);
    }
  }

  offerClicked() {
    if(navigator.clipboard) {
      navigator.clipboard.writeText(document.getElementById('offer').innerText);
      show('copiedOfferNotification');
    }

    show('peerKeyPrompt');
  }

  answerClicked() {
    if(navigator.clipboard) {
      navigator.clipboard.writeText(document.getElementById('answer').innerText);
      show('copiedAnswerNotification');
    }
    show('waitToConnect');
  }


  registerListeners() {
    document.getElementById("chatBoxMessage").addEventListener("keyup", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault();
        this.sendMessage();
      }
    });

    document.getElementById('btn_start').addEventListener('click', () => this.start());
    document.getElementById('submitKey').addEventListener('click', () => this.setRemote());
    document.getElementById('offer').addEventListener('mousedown', () => this.offerClicked());
    document.getElementById('answer').addEventListener('mousedown', () => this.answerClicked());
    document.getElementById('peerKey').addEventListener('paste', () => this.peerKeyEntered());


    document.getElementById('createApp').addEventListener('click', () => this.createApp());
    document.getElementById('runLocal').addEventListener('click', () => this.runLocal());
    document.getElementById('runRemote').addEventListener('click', () => this.runRemote());
  }

}

const Village = new _Village();


export default Village;
