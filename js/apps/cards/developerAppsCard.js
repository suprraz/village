import AppStore from "../../os/store/appStore.js";
import MessageRouter from "../../os/messageRouter.js";
import AceEditorApp from "../sandboxed/aceEditorApp.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import Settings from "../../os/settings.js";
import WalletStore from "../../os/store/walletStore.js";

const NEW_APP_TEMPLATE_PATH = 'js/apps/cards/resources/developerAppsCard/newAppTemplate.js';

class _DeveloperAppsCard {
  #newAppTemplate = null;
  #newAppBtn
  #devWalletBalanceEl
  #brokerWalletBalanceEl

  constructor(containerEl) {

    containerEl.innerHTML = devAppsContainerHtml;
    this.#newAppBtn = containerEl.querySelector('#newAppBtn');
    this.#devWalletBalanceEl = containerEl.querySelector('#devWalletBalance');
    this.#brokerWalletBalanceEl = containerEl.querySelector('#brokerWalletBalance');

    this.registerListeners();

    this.refreshBalances();
  }

  async refreshBalances() {
    const primaryWalletBalance = await WalletStore.getPrimaryWalletBalance();
    const secondaryWalletBalance = await WalletStore.getSecondaryWalletBalance();

    this.#devWalletBalanceEl.innerText = primaryWalletBalance;
    this.#brokerWalletBalanceEl.innerText = secondaryWalletBalance;
  }

  async loadTemplate() {
    const res = await fetch( NEW_APP_TEMPLATE_PATH );
    if (!res.ok) {
      throw new Error(`Error response: ${res.status}`);
    }
    return await res.text();
  }

  registerListeners() {
    this.#newAppBtn.addEventListener('click', () => this.newApp());
  }

  async newApp() {
    if(!this.#newAppTemplate) {
      try {
        this.#newAppTemplate = await this.loadTemplate();
      } catch (e) {
        alert('There was an error loading the New App Template');
        logError(`DeveloperAppsCard Error loading template ${e}`);
        return;
      }
    }

    const app = {
      id: `app-${uuidv4()}`,
      name: 'Hello World',
      authorId: Settings.get('userId'),
      authorWalletId: await WalletStore.getPrimaryWalletId(),
      code: this.#newAppTemplate,
      version: 1,
      price: '1',
      installDate: (new Date()).getTime(),
      updateDate: (new Date()).getTime(),
      creationDate: (new Date()).getTime(),
      isPublished: 0
    }

    app.signature = AppStore.signApp(app);

    MessageRouter.onRunApp(AceEditorApp, {app});
  }

  async updateMyAppsList() {
    const myApps = await AppStore.getMyApps();

    const myAppsDiv = document.getElementById("myApps");

    if(!myApps.length) {
      myAppsDiv.innerText = "No apps yet.";
    } else {
      // remove all children and listeners
      while (myAppsDiv.firstChild) {
        myAppsDiv.removeChild(myAppsDiv.firstChild);
      }
    }

    myApps.map((app) => {
      myAppsDiv.appendChild(this.createMyAppDiv(app));
    })

  }

  createMyAppDiv(app){
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
    appRemoveBtn.innerText = "Remove";
    appRemoveBtn.onclick = () => {
      AppStore.removeApp(app.id);
      this.updateMyAppsList();
    };

    buttonsDiv.appendChild(appRunBtn);
    buttonsDiv.appendChild(appEditBtn);
    buttonsDiv.appendChild(appRemoveBtn);
    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(buttonsDiv);

    return appDiv;
  }

}


const devAppsContainerHtml = `
<div id="developerAppsCard">
    <p class="title">Earnings</p>
    
    <div class="px-1 mx-3 my-3">
      <p class="subtitle my-3">Reseller</p>
      <div class="wallet">Wallet balance: <span id="brokerWalletBalance">(loading...)</span> sats</div> 
    </div>
    
    <div class="px-1 mx-3 mt-6">
        <p class="subtitle">Developer</p>
        <div class="wallet">Wallet balance: <span id="devWalletBalance">(loading...)</span> sats</div> 
        <button id="newAppBtn" class="button is-info appRunButton mt-5">Create New App</button>
    </div>
</div>
`;

export default _DeveloperAppsCard;
