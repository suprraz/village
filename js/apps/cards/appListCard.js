import AppStore, {appTypes} from "../../os/store/appStore.js";
import NodeStore from "../../riverNetwork/nodeStore.js";
import MessageRouter from "../../os/messaging/messageRouter.js";
import {logError} from "../../utils/logger.js";
import Settings from "../../os/settings.js";
import Profile from "../../riverNetwork/profile.js";
import {appTypeToString, appTypeToVerb, defaultIconForAppType} from "../../utils/appUtils.js";
import getSearchParam from "../../utils/getSearchParam.js";

class _AppListCard {
  #isEditing
  #installedAppsEditBtn
  #search
  #searchQueryEl
  #clearSearchBtn
  #appsByNodeId = {}

  constructor() {
    this.#isEditing = false;

    const appListContainer = document.getElementById('appListContainer');
    appListContainer.innerHTML = appListHtml;

    this.#registerListeners();

    this.loadSearchFromUrl();
  }

  #registerListeners() {
    this.#installedAppsEditBtn = document.getElementById('installedAppsEditBtn');
    this.#installedAppsEditBtn.onclick = () => {
      this.#isEditing = !this.#isEditing;
      this.#installedAppsEditBtn.innerText = this.#isEditing ? 'Done' : 'Edit';
      this.updateAppList();
    }

    this.#searchQueryEl = document.getElementById('searchQuery');
    this.#searchQueryEl.oninput = (e) => {
      this.#search = e.target.value || null;
      this.#searchUpdated();
    }

    this.#clearSearchBtn = document.getElementById('clearSearchBtn');
    this.#clearSearchBtn.onclick = () => {
      this.#search = null;
      this.#searchQueryEl.value = '';
      this.#searchUpdated();
    }
  }

  #searchUpdated() {
    if (!this.#search) {
      this.#clearSearchBtn.classList.add('is-hidden')
    } else {
      this.#clearSearchBtn.classList.remove('is-hidden');
    }

    if (window.history.replaceState) {
      window.history.replaceState(null, document.title,
        this.#search ? "?search=" + this.#search.replace(/ /g, '+') : location.pathname);
    }

    this.updateAppList();
  }

  loadSearchFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('search')) {
      this.#search = urlParams.get('search');
      this.#searchQueryEl.value = this.#search;

      this.#searchUpdated();
    }
  }

  async installApp(app) {
    try {
      await AppStore.installApp(app)
      await this.updateAppList();
      await this.sendApps();
    } catch (e) {
      logError(e);
    }
  }

  async #computeAvailableApps() {
    let localApps = [];
    try {
      localApps = await AppStore.getPublishedApps();
    } catch (e) {
      logError('AppListCard failed to load apps');
    }

    const allNodeIds = Object.keys(this.#appsByNodeId);

    let appsById = {};
    allNodeIds.map(nodeId => {
      const appIds = Object.keys(this.#appsByNodeId[nodeId]);
      appIds.map(appId => {
        if(!appsById[appId] || appsById[appId].version < this.#appsByNodeId[nodeId][appId].version) {
          appsById[appId] = this.#appsByNodeId[nodeId][appId];
        }
      })
    });

    const appsByIdArr = Object.values(appsById);
    const appsByIdRemote = appsByIdArr.filter((remoteApp) => {
      const isInstalled = localApps.some(
        (localApp => localApp.id === remoteApp.id));

      return !isInstalled;
    });

    return appsByIdRemote?.sort((a, b) => (a.updated - b.updated));
  }

  async onAvailableApps(apps) {
    apps.map(app => {
      if(!this.#appsByNodeId[app.brokerNodeId]) {
        this.#appsByNodeId[app.brokerNodeId] = {}
      }
      this.#appsByNodeId[app.brokerNodeId][app.id] = app;
    });

    try {
      await this.updateAppList();
    } catch (e) {
      logError(e);
    }
  }

  removeUnavailableApps() {
    const nodeIds = NodeStore.getConnectedNodeIds();
    const cachedNodeIds = Object.keys(this.#appsByNodeId);
    const obsoleteNodeIds = []
    cachedNodeIds.map(cachedNodeId => {
      if(!nodeIds.find((id => id === cachedNodeId))) {
        obsoleteNodeIds.push(cachedNodeId);
      }
    });
    if(obsoleteNodeIds.length) {
      obsoleteNodeIds.map(obsoleteNodeId => {
        delete this.#appsByNodeId[obsoleteNodeId];
      });

      this.updateAppList();
    }
  }

  getOwnerNodeIds(appId) {
    const allNodeIds = Object.keys(this.#appsByNodeId);
    const ownerNodeIds = [];

    allNodeIds.map(nodeId => {
      if(this.#appsByNodeId[nodeId][appId]) {
        ownerNodeIds.push(nodeId)
      }
    })

    return ownerNodeIds;
  }

  async updateAppList() {
    const availableApps = await this.#computeAvailableApps();

    const userId = Settings.get('userId');

    const publishedApps = await AppStore.getPublishedApps();

    const publishedAppsDiv = document.getElementById("publishedApps");

    if (!publishedApps.length) {
      publishedAppsDiv.innerText = "Nothing here yet.";
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

    if (this.#search) {
      const searchInfo = document.createElement('div');
      searchInfo.className = "mb-2";
      searchInfo.innerText = `Filtering for "${this.#search}"`
      availableAppsDiv.appendChild(searchInfo);
    }

    const visibleApps = availableApps
      .filter(app =>
        !this.#search
        || app.name.toLowerCase().includes(this.#search.toLowerCase())
        || app.description.toLowerCase().includes(this.#search.toLowerCase()))
      .filter(app => app.type !== appTypes.debug);

    visibleApps.map((app) => {
      availableAppsDiv.appendChild(this.createLongformAppEl(app, false));
    })

    if (NodeStore.getConnectedNodeIds().length < 1 || availableApps.length < 1) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = "is-flex is-flex-direction-row is-align-items-center";
      loadingDiv.innerHTML = '<div class="loader"></div> <div class="ml-2">Searching network ... </div>';
      availableAppsDiv.appendChild(loadingDiv);
    }

    const unpublishedApps = await AppStore.getUnpublishedApps();
    const unpublishedAppsDiv = document.getElementById("unpublishedApps");

    if (!unpublishedApps.length) {
      unpublishedAppsDiv.innerText = "Nothing here yet.";
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
    if (!this.#isEditing) {
      const reloadedApp = await AppStore.getApp(app.id);

      AppStore.runApp(reloadedApp)
    }
  }

  async editApp(app) {
    const reloadedApp = await AppStore.getApp(app.id);

    MessageRouter.onRunApp({appFileName: 'appEditorApp.html'}, {app: reloadedApp});
  }

  deleteApp(app) {
    MessageRouter.confirm(`Delete ${appTypeToString(app.type)} ${app.name}?`, () => {
      this.#isEditing = false;
      AppStore.removeApp(app.id);
      this.updateAppList();
      this.sendApps();
    }, () => {
    });
  }

  publishApp(app) {
    AppStore.publishApp(app.id).then(() => {
      this.updateAppList();
      this.sendApps();
    });
  }

  unpublishApp(app) {
    MessageRouter.confirm(`Unpublish ${appTypeToString(app.type)} ${app.name}?`, () => {
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

    if (isEditing) {
      const deleteBtnEl = document.createElement('div');
      deleteBtnEl.className = "delete";
      deleteBtnEl.onclick = () => {
        this.deleteApp(app);
      };
      appEl.appendChild(deleteBtnEl);

      if (isOwner) {
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

    const iconSrc = app.icon ? app.icon : defaultIconForAppType(app.type);
    appIconEl.setAttribute("src", iconSrc);

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

    if (canRun) {
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

    if(getSearchParam('runAppFromUrl')) {
      appsForBroadcast.push({
        id: 'appFromUrl',
        type: appTypes.debug,
        brokerNodeId: Profile.getNodeID()
      });
    }

    NodeStore.broadcast({
      type: 'app-list',
      apps: appsForBroadcast
    });
  }

  createButtonsEl(app, isOwner) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = "buttons is-flex";

    if (!isOwner) {
      const appBuyBtn = document.createElement('button');
      appBuyBtn.className = "button is-success appBuyButton";
      appBuyBtn.innerText = "Buy for " + app.price + " sats";
      appBuyBtn.onclick = () => MessageRouter.onRequestApp(app);

      buttonsDiv.appendChild(appBuyBtn);
      return buttonsDiv;
    }

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "button is-success appRunButton";
    appRunBtn.innerText = appTypeToVerb(app.type);
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

  createLongformAppEl(app, isOwner) {
    const appCont = document.createElement('div');
    appCont.className = "installedApp card my-1 p-5 is-flex is-flex-direction-row is-justify-content-space-between is-align-items-flex-start";

    const appDiv = document.createElement('div');
    appDiv.className = "is-flex is-flex-direction-row"

    const appEl = this.createContainedAppEl(app, false, isOwner, false);

    const appTextEl = document.createElement('div');
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
        <p class="is-size-5">Installed Items</p>
        <button id="installedAppsEditBtn" class="button is-primary is-inverted is-outlined ml-5">Edit</button>
    </div>
    <div id="publishedApps" class="app-container-list is-flex is-flex-direction-row is-flex-wrap-wrap"></div>
    <br />
    <div class="is-flex is-flex-direction-row is-align-items-center is-justify-content-space-between mt-1 mb-5"> 
      <p class="is-size-5 mt-1">Available Items</p>
      <div class="field has-addons">
        <div class="control has-icons-left  has-icons-right">
          <input id="searchQuery" class="input is-inverted is-outlined" type="text" placeholder="Search">
          <span class="icon is-left">
            <i class="fa fa-search"></i>
          </span>
          <span class="icon is-right is-hidden" id="clearSearchBtn" style="pointer-events: all; cursor: pointer">
            <i class="fa fa-times-circle"></i>
          </span>
        </div>
      </div>
    </div>
    <div id="availableApps" class="is-flex is-flex-direction-column mb-6"></div>
    <p class="subtitle is-5 mt-1">Items I'm Selling</p>
    <div id="unpublishedApps" class="is-flex is-flex-direction-column"></div>
</div>
`

export default _AppListCard;
