import AppStore from "../store/appStore.js";
import NodeStore from "../store/nodeStore.js";


class _AppList {
  constructor() {
    this.availableApps = [];

    const appListContainer = document.getElementById('appListContainer');
    appListContainer.innerHTML = appListHtml;

    this.appListEl = document.getElementById('appList');

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
    appDiv.className = "installedApp card my-1";

    const appNameDiv = document.createElement('div');
    appNameDiv.className = "card-header-title title appName";
    appNameDiv.innerText = app.name;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = "buttons card-content";

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "button is-primary appRunButton";
    appRunBtn.innerText = "Run";
    appRunBtn.onclick = () => { AppStore.runApp(app)};

    const appEditBtn = document.createElement('button');
    appEditBtn.className = "button appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = () => {
      const editor = document.getElementById('editor');
      const appName = document.getElementById('appName');

      editor.value = app.code;
      appName.value = app.name;
    };

    const appRemoveBtn = document.createElement('button');
    appRemoveBtn.className = "button appRemoveButton";
    appRemoveBtn.innerText = "Remove";
    appRemoveBtn.onclick = () => {
      AppStore.removeApp(app.name)
      this.availableApps.push(app);
      this.updateAppList();
    };

    buttonsDiv.appendChild(appRunBtn);
    buttonsDiv.appendChild(appEditBtn);
    buttonsDiv.appendChild(appRemoveBtn);
    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(buttonsDiv);

    return appDiv;
  }

  createAvailableAppDiv(app){
    const appDiv = document.createElement('div');
    appDiv.className = "availableApp card my-1";

    const appNameDiv = document.createElement('div');
    appNameDiv.className = "card-header-title title appName";
    appNameDiv.innerText = app.name;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = "buttons card-content";

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "button is-primary appRunButton";
    appRunBtn.innerText = "Run";
    appRunBtn.onclick = () => { AppStore.runApp(app)};

    const appInstallBtn = document.createElement('button');
    appInstallBtn.className = "button appInstallButton";
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
    appEditBtn.className = "button appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = () => {
      const editor = document.getElementById('editor');
      const appName = document.getElementById('appName');

      editor.value = app.code;
      appName.value = app.name;
    };

    buttonsDiv.appendChild(appRunBtn);
    buttonsDiv.appendChild(appInstallBtn);
    buttonsDiv.appendChild(appEditBtn);

    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(buttonsDiv);

    return appDiv;
  }

  sendApps() {
    const apps = AppStore.getInstalledApps();

    NodeStore.broadcast(JSON.stringify({apps}));
  }
}


const appListHtml = `
<div id="appList">
    <p class="title">Home</p>
    <p class="subtitle">Installed Apps</p>
    <div id="installedApps" class="is-flex is-flex-direction-column"></div>
    <br />
    <p class="subtitle">Available Apps</p>
    <div id="availableApps" class="is-flex is-flex-direction-column"></div>
</div>
`

export default _AppList;
