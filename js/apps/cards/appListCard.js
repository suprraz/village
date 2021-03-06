import AppStore from "../../os/store/appStore.js";
import NodeStore from "../../riverNetwork/nodeStore.js";
import MessageRouter from "../../os/messageRouter.js";
import AceEditorApp from "../sandboxed/aceEditorApp.js";
import {logError} from "../../utils/logger.js";
import Settings from "../../os/settings.js";

class _AppListCard {
  #availableApps

  constructor() {
    this.#availableApps = [];

    const appListContainer = document.getElementById('appListContainer');
    appListContainer.innerHTML = appListHtml;
  }

  installApp(app) {
    try {
      AppStore.installApp(app)
      this.#availableApps = this.#availableApps.filter((availableApp) => !availableApp.id === app.id);
      this.updateAppList()
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
    } else {
      // remove all children and listeners
      while (publishedAppsDiv.firstChild) {
        publishedAppsDiv.removeChild(publishedAppsDiv.firstChild);
      }
    }

    publishedApps.map((app) => {
      publishedAppsDiv.appendChild(this.createPublishedAppDiv(app, userId === app.authorId, false));
    })


    const availableAppsDiv = document.getElementById("availableApps");

    if(!this.#availableApps.length) {
      availableAppsDiv.innerText = "No apps available.";
    } else {
      // remove all children and listeners
      while (availableAppsDiv.firstChild) {
        availableAppsDiv.removeChild(availableAppsDiv.firstChild);
      }
    }

    this.#availableApps.map((app) => {
      availableAppsDiv.appendChild(this.createAvailableAppDiv(app));
    })

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
      unpublishedAppsDiv.appendChild(this.createPublishedAppDiv(app, userId === app.authorId, true));
    })

  }

  createPublishedAppDiv(app, isOwner, showPublished){
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
    appRunBtn.onclick = async () => {
      const reloadedApp = await AppStore.getApp(app.id);

      AppStore.runApp(reloadedApp)
    };

    const appEditBtn = document.createElement('button');
    appEditBtn.className = "button appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = async () => {
      const reloadedApp = await AppStore.getApp(app.id);

      MessageRouter.onRunApp(AceEditorApp, {app: reloadedApp});
    };

    const appRemoveBtn = document.createElement('button');
    appRemoveBtn.className = "button appRemoveButton";
    appRemoveBtn.innerText = "Delete";
    appRemoveBtn.onclick = () => {
      AppStore.removeApp(app.id)
      this.#availableApps.push(app);
      this.updateAppList();
      this.sendApps();
    };

    const appPublishBtn = document.createElement('button');
    appPublishBtn.className = "button";
    appPublishBtn.innerText = "Publish";
    appPublishBtn.onclick = () => {
      AppStore.publishApp(app.id).then(() => {
        this.updateAppList();
        this.sendApps();
      });
    };

    const appUnpublishBtn = document.createElement('button');
    appUnpublishBtn.className = "button";
    appUnpublishBtn.innerText = "Modify";
    appUnpublishBtn.onclick = () => {
      AppStore.unpublishApp(app.id).then(() => {
        this.updateAppList();
        this.sendApps();
      });
    };

    buttonsDiv.appendChild(appRunBtn);
    if(isOwner) {
      buttonsDiv.appendChild(appEditBtn);
    }
    buttonsDiv.appendChild(appRemoveBtn);
    if(isOwner) {
      showPublished ? buttonsDiv.appendChild(appPublishBtn) : buttonsDiv.appendChild(appUnpublishBtn);
    }
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

    const appBuyBtn = document.createElement('button');
    appBuyBtn.className = "button is-primary appBuyButton";
    appBuyBtn.innerText = "Buy";
    appBuyBtn.onclick = () => MessageRouter.onBuyApp(app);

    const appInstallBtn = document.createElement('button');
    appInstallBtn.className = "button appInstallButton";
    appInstallBtn.innerText = "Install";
    appInstallBtn.onclick = () => this.installApp(app);

    buttonsDiv.appendChild(appBuyBtn);

    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(buttonsDiv);

    return appDiv;
  }

  async sendApps() {
    const apps = await AppStore.getPublishedApps();

    NodeStore.broadcast({
      type: 'app-list',
      apps
    });
  }
}


const appListHtml = `
<div id="appList">
    <p class="title">Apps</p>
    <p class="subtitle mt-1">Installed Apps</p>
    <div id="publishedApps" class="is-flex is-flex-direction-column"></div>
    <br />
    <p class="subtitle mt-1">Available Apps</p>
    <div id="availableApps" class="is-flex is-flex-direction-column"></div>
    
    <p class="subtitle mt-3">Unpublished Apps</p>
    <div id="unpublishedApps" class="is-flex is-flex-direction-column"></div>
</div>
`

export default _AppListCard;
