import AppStore from './appStore.js';
import NodeStore from "./nodeStore.js";
import { logMessage, logError } from './logger.js';
import _AddPeer from "./apps/addPeer.js";
import {show, hide} from "./domUtils.js";

class _Village {
  constructor() {
    this.chatLog = [];
    this.availableApps = [];
    this.updateChat();

    this.apps = {
      AddPeer: new _AddPeer(
        () => this.onConnection(),
        (e) => this.onMessage(e))
    };

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('offerKey')) {
      this.startOS();
    }

    this.apps.AddPeer.run();

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

    if(NodeStore.getNodeCount() > 0) {

    } else {
      this.apps.AddPeer.preparePeer();
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

  sendApps() {
    const apps = AppStore.getInstalledApps();

    NodeStore.broadcast(JSON.stringify({apps}));
  }

  sendMessage() {
    const msg = document.getElementById('chatBoxMessage').value;
    NodeStore.broadcast(JSON.stringify({msg}));

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

    NodeStore.broadcast(JSON.stringify({code}));
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

  registerListeners() {
    document.getElementById("chatBoxMessage").addEventListener("keyup", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault();
        this.sendMessage();
      }
    });

    document.getElementById('btn_start').addEventListener('click', () => this.start());
    document.getElementById('createApp').addEventListener('click', () => this.createApp());
    document.getElementById('runLocal').addEventListener('click', () => this.runLocal());
    document.getElementById('runRemote').addEventListener('click', () => this.runRemote());
  }

}

const Village = new _Village();


export default Village;
