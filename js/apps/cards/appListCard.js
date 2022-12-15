import AppStore from "../../os/store/appStore.js";
import NodeStore from "../../riverNetwork/nodeStore.js";
import MessageRouter from "../../os/messageRouter.js";
import {logError} from "../../utils/logger.js";
import Settings from "../../os/settings.js";
import Profile from "../../riverNetwork/profile.js";

class _AppListCard {
  #availableApps
  #isEditing
  #installedAppsEditBtn

  constructor() {
    this.#availableApps = [];
    this.#isEditing = false;

    const appListContainer = document.getElementById('appListContainer');
    appListContainer.innerHTML = appListHtml;

    this.#installedAppsEditBtn = document.getElementById('installedAppsEditBtn');
    this.#installedAppsEditBtn.onclick = () => {
      this.#isEditing = !this.#isEditing;
      this.#installedAppsEditBtn.innerText = this.#isEditing ? 'Done' : 'Edit';
      this.updateAppList();
    }
  }

  installApp(app) {
    try {
      AppStore.installApp(app)
      this.#availableApps = this.#availableApps.filter((availableApp) => !availableApp.id === app.id);
      this.updateAppList();
      this.sendApps();
    } catch (e) {
      logError(e);
    }
  }

  async onAvailableApps(apps) {
    const localApps = await AppStore.getPublishedApps();
    let newApps = [];
    try {
      newApps = apps.filter((remoteApp) => {
        const isInstalled = localApps.some(
          (localApp => localApp.id === remoteApp.id));

        const isAvailable = this.#availableApps.some(
          (availableApp => availableApp.id === remoteApp.id));

        return !isInstalled && !isAvailable;
      });

      this.#availableApps.push(...newApps);
      await this.updateAppList();
    } catch (e) {
      logError(e);
    }
  }

  async updateAppList() {
    const userId = Settings.get('userId');

    const publishedApps = await AppStore.getPublishedApps();

    const publishedAppsDiv = document.getElementById("publishedApps");

    if(!publishedApps.length) {
      publishedAppsDiv.innerText = "No apps installed.";
      this.#installedAppsEditBtn.classList.add("is-hidden");
    } else {
      this.#installedAppsEditBtn.classList.remove("is-hidden");
      // remove all children and listeners
      while (publishedAppsDiv.firstChild) {
        publishedAppsDiv.removeChild(publishedAppsDiv.firstChild);
      }
    }

    publishedApps.map((app) => {
      publishedAppsDiv.appendChild(this.createContainedAppEl(app, this.#isEditing, userId === app.authorId, true));
    })

    const availableAppsDiv = document.getElementById("availableApps");

    while (availableAppsDiv.firstChild) {
      availableAppsDiv.removeChild(availableAppsDiv.firstChild);
    }

    this.#availableApps.map((app) => {
      availableAppsDiv.appendChild(this.createLongformAppEl(app, false));
    })

    if(NodeStore.getConnectedNodeIds().length < 1 || this.#availableApps.length < 1) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = "is-flex is-flex-direction-row is-align-items-center";
      loadingDiv.innerHTML = '<div class="loader"></div> <div class="ml-2">Searching network ... </div>';
      availableAppsDiv.appendChild(loadingDiv);
    }

    const unpublishedApps = await AppStore.getUnpublishedApps();
    const unpublishedAppsDiv = document.getElementById("unpublishedApps");

    if(!unpublishedApps.length) {
      unpublishedAppsDiv.innerText = "No unpublished apps.";
    } else {
      // remove all children and listeners
      while (unpublishedAppsDiv.firstChild) {
        unpublishedAppsDiv.removeChild(unpublishedAppsDiv.firstChild);
      }
    }

    unpublishedApps.map((app) => {
      unpublishedAppsDiv.appendChild(this.createLongformAppEl(app, userId === app.authorId));
    })

  }

  async runApp(app) {
    if(!this.#isEditing) {
      const reloadedApp = await AppStore.getApp(app.id);

      AppStore.runApp(reloadedApp)
    }
  }

  async editApp(app) {
    const reloadedApp = await AppStore.getApp(app.id);

    MessageRouter.onRunApp({appFileName: 'appEditorApp.html'}, {app: reloadedApp});
  }

  deleteApp(app) {
    MessageRouter.confirm(`Delete ${app.type === 'eBook' ? 'eBook' : 'app'} ${app.name}?`, () => {
      this.#isEditing = false;
      AppStore.removeApp(app.id);
      this.updateAppList();
      this.sendApps();
    }, () => {});
  }

  publishApp(app) {
    AppStore.publishApp(app.id).then(() => {
      this.updateAppList();
      this.sendApps();
    });
  }

  unpublishApp(app) {
    MessageRouter.confirm(`Unpublish ${app.type === 'eBook' ? 'eBook' : 'app'} ${app.name}?`, () => {
      this.#isEditing = false;
      AppStore.unpublishApp(app.id).then(() => {
        this.updateAppList();
        this.sendApps();
      });
    });
  }

  createAppEl(app, isEditing, isOwner, canRun) {
    const appEl = document.createElement('div');
    appEl.className = `button is-info app ${isEditing ? 'shake-little shake-constant' : canRun ? 'can-run' : ''}`;

    if(isEditing) {
      const deleteBtnEl = document.createElement('div');
      deleteBtnEl.className = "delete";
      deleteBtnEl.onclick = () => {
        this.deleteApp(app);
      };
      appEl.appendChild(deleteBtnEl);

      if(isOwner) {
        const diskEl = document.createElement('div');
        diskEl.className = "disk";
        diskEl.onclick = () => {
          this.unpublishApp(app);
        };

        const pencilEl = document.createElement('div');
        pencilEl.className = "pencil";
        pencilEl.onclick = () => {
          this.unpublishApp(app);
        };

        appEl.appendChild(diskEl);
        appEl.appendChild(pencilEl);
      }
    }
    const appIconEl = document.createElement('img');

    const iconSrc = app.icon ? app.icon : app.type === 'eBook-app-type' ? 'img/default-ebook-icon.svg' : 'img/default-app-icon.svg';
    appIconEl.setAttribute("src", iconSrc );

    appEl.appendChild(appIconEl);

    return appEl;
  }

  createContainedAppEl(app, isEditing, isOwner, canRun) {
    const appContEl = document.createElement('div');
    appContEl.className = "app-container";

    const appEl = this.createAppEl(app, isEditing, isOwner, canRun);

    const appNameEl = document.createElement('div');
    appNameEl.className = "has-text-centered mt-2";
    appNameEl.innerText = app.name;

    if(canRun) {
      appContEl.onclick = () => {
        this.runApp(app)
      };
    }

    appContEl.appendChild(appEl);
    appContEl.appendChild(appNameEl);
    return appContEl;
  }

  async sendApps() {
    const apps = await AppStore.getPublishedApps();
    const appsForBroadcast = apps.map(app => {
      return {
        ...app,
        code: null,  //strip the code
        encryptedCode: undefined,  //strip the code
        brokerNodeId: Profile.getNodeID()
      };
    });

    NodeStore.broadcast({
      type: 'app-list',
      apps: appsForBroadcast
    });
  }

  createButtonsEl(app, isOwner) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = "buttons is-flex";

    if( !isOwner ) {
      const appBuyBtn = document.createElement('button');
      appBuyBtn.className = "button is-success appBuyButton";
      appBuyBtn.innerText = "Buy for " + app.price + " sats";
      appBuyBtn.onclick = () => MessageRouter.onRequestApp(app);

      buttonsDiv.appendChild(appBuyBtn);
      return buttonsDiv;
    }

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "button is-success appRunButton";
    appRunBtn.innerText = app.type === 'eBook-app-type' ? 'Read' : "Run";
    appRunBtn.onclick = () => {
      this.runApp(app)
    };

    const appEditBtn = document.createElement('button');
    appEditBtn.className = "button is-success is-outlined appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = () => {
      this.editApp(app)
    };

    const appRemoveBtn = document.createElement('button');
    appRemoveBtn.className = "button is-success is-outlined appRemoveButton";
    appRemoveBtn.innerText = "Delete";
    appRemoveBtn.onclick = () => {
      this.deleteApp(app);
    };

    const appPublishBtn = document.createElement('button');
    appPublishBtn.className = "button is-success is-outlined";
    appPublishBtn.innerText = "Publish";
    appPublishBtn.onclick = () => {
      this.publishApp(app);
    }

    buttonsDiv.appendChild(appRunBtn);
    buttonsDiv.appendChild(appEditBtn);
    buttonsDiv.appendChild(appRemoveBtn);
    buttonsDiv.appendChild(appPublishBtn);

    return buttonsDiv;
  }

  createLongformAppEl(app, isOwner){
    const appCont = document.createElement('div');
    appCont.className = "installedApp card my-1 p-5 is-flex is-flex-direction-row is-justify-content-space-between is-align-items-flex-start";

    const appDiv = document.createElement('div');
    appDiv.className = "is-flex is-flex-direction-row"

    const appEl = this.createContainedAppEl(app, false, isOwner, false);

    const appTextEl =  document.createElement('div');
    appTextEl.className = "is-flex is-flex-direction-column is-justify-content-space-between ml-5";

    const appDescEl = document.createElement('div');
    appDescEl.className = "mb-3";
    appDescEl.innerText = app.description ? app.description : 'No description available.';

    const buttonsDiv = this.createButtonsEl(app, isOwner);
    appTextEl.appendChild(appDescEl);
    appTextEl.appendChild(buttonsDiv);
    appDiv.appendChild(appEl);
    appDiv.appendChild(appTextEl);
    appCont.appendChild(appDiv);

    return appCont;
  }
}


const appListHtml = `
<div id="appList">
    <div class="is-flex is-flex-direction-row is-align-items-center is-justify-content-space-between mt-1 mb-5"> 
        <p class="is-size-5">Installed Apps</p>
        <button id="installedAppsEditBtn" class="button is-primary is-inverted is-outlined ml-5">Edit</button>
    </div>
    <div id="publishedApps" class="app-container-list is-flex is-flex-direction-row is-flex-wrap-wrap"></div>
    <br />
    <p class="subtitle is-5 mt-1">Available Apps</p>
    <div id="availableApps" class="is-flex is-flex-direction-column"></div>
    <br />
    <p class="subtitle is-5 mt-1">Apps I Created</p>
    <div id="unpublishedApps" class="is-flex is-flex-direction-column"></div>
</div>
`

export default _AppListCard;
