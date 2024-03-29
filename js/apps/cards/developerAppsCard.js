import AppStore, {appTypes} from "../../os/store/appStore.js";
import MessageRouter from "../../os/messaging/messageRouter.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import Settings from "../../os/settings.js";
import WalletStore from "../../os/store/walletStore.js";

const NEW_APP_TEMPLATE_PATH = 'js/apps/sandboxed/newAppTemplate.html';
const NEW_EBOOK_TEMPLATE_PATH = 'js/apps/sandboxed/newEbookTemplate.html';
const NEW_AUDIO_TEMPLATE_PATH = 'js/apps/sandboxed/newAudioTemplate.html';

const MIN_SATS_WITHDRAWAL = 10;
const MIN_SATS_BUFFER = 5;

class _DeveloperAppsCard {
  #newAppTemplate = null;
  #newEbookTemplate = null;
  #newAudioTemplate = null;
  #newAppBtn
  #newEbookBtn
  #newAudioBtn
  #devWalletBalanceAmt
  #brokerWalletBalanceAmt
  #devWalletBalanceEl
  #brokerWalletBalanceEl
  #withdrawDevEl
  #withdrawBrokerEl

  constructor(containerEl) {

    containerEl.innerHTML = devAppsContainerHtml;
    this.#newAppBtn = containerEl.querySelector('#newAppBtn');
    this.#newEbookBtn = containerEl.querySelector('#newEbookBtn');
    this.#newAudioBtn = containerEl.querySelector('#newAudioBtn');
    this.#devWalletBalanceEl = containerEl.querySelector('#devWalletBalance');
    this.#brokerWalletBalanceEl = containerEl.querySelector('#brokerWalletBalance');
    this.#withdrawDevEl = containerEl.querySelector('#withdrawDev');
    this.#withdrawBrokerEl = containerEl.querySelector('#withdrawBroker');

    this.registerListeners();

    this.refreshBalances();
  }

  async refreshBalances() {
    this.#devWalletBalanceAmt =  await WalletStore.getPrimaryWalletBalance() / 1000;
    this.#brokerWalletBalanceAmt = await WalletStore.getSecondaryWalletBalance() / 1000;

    this.#devWalletBalanceEl.innerText = this.#devWalletBalanceAmt;
    this.#brokerWalletBalanceEl.innerText = this.#brokerWalletBalanceAmt;
    
    if(this.addBuffer(this.#devWalletBalanceAmt) > MIN_SATS_WITHDRAWAL) {
      this.#withdrawDevEl.innerText = 'Withdraw ' + this.addBuffer(this.#devWalletBalanceAmt) + ' satoshis';
      this.#withdrawDevEl.setAttribute('style', '');
    } else {
      this.#withdrawDevEl.setAttribute('style', 'display: none');
    }

    if(this.addBuffer(this.#brokerWalletBalanceAmt) > MIN_SATS_WITHDRAWAL) {
      this.#withdrawBrokerEl.innerText = 'Withdraw ' + this.addBuffer(this.#brokerWalletBalanceAmt) + ' satoshis';
      this.#withdrawBrokerEl.setAttribute('style', '');
    } else {
      this.#withdrawBrokerEl.setAttribute('style', 'display: none');
    }
  }

  async loadTemplate(path) {
    const res = await fetch( path );
    if (!res.ok) {
      throw new Error(`Error response: ${res.status}`);
    }
    return res.text();
  }

  addBuffer(amt) {
    return Math.floor(amt - MIN_SATS_BUFFER);
  }

  async withdrawBroker(e) {
    e.stopPropagation();

    const withdrawalUrl = await WalletStore.getSecondaryWalletWithdrawalUrl(this.addBuffer(this.#brokerWalletBalanceAmt));
    await navigator.clipboard.writeText(withdrawalUrl);

    MessageRouter.alert('Withdrawal url has been copied to clipboard.  Paste in a LNURL compatible lightning wallet.');
  }

  async withdrawDev(e) {
    e.stopPropagation();

    const withdrawalUrl = await WalletStore.getPrimaryWalletWithdrawalUrl(this.addBuffer(this.#devWalletBalanceAmt));
    await navigator.clipboard.writeText(withdrawalUrl);

    MessageRouter.alert('Withdrawal url has been copied to clipboard.  Paste in a LNURL compatible lightning wallet.');
  }

  registerListeners() {
    this.#newAppBtn.addEventListener('click', () => this.newApp());
    this.#newEbookBtn.addEventListener('click', () => this.newEbook());
    this.#newAudioBtn.addEventListener('click', () => this.newAudio());
    this.#withdrawDevEl.addEventListener('click', (e) => this.withdrawDev(e));
    this.#withdrawBrokerEl.addEventListener('click', (e) => this.withdrawBroker(e));
  }

  async newApp() {
    MessageRouter.progress('Loading editor', -1, 1);

    if(!this.#newAppTemplate) {
      try {
        this.#newAppTemplate = await this.loadTemplate(NEW_APP_TEMPLATE_PATH);
      } catch (e) {
        MessageRouter.alert('There was an error loading the New App Template');
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
      isPublished: 0,
      type: 'regular-app-type'
    }

    app.signature = AppStore.signApp(app);

    MessageRouter.onRunApp({appFileName: 'appEditorApp.html'}, {app});
  }

  async newEbook() {
    MessageRouter.progress('Loading editor', -1, 1);

    if(!this.#newEbookTemplate) {
      try {
        this.#newEbookTemplate = await this.loadTemplate(NEW_EBOOK_TEMPLATE_PATH);
      } catch (e) {
        MessageRouter.alert('There was an error loading the New Ebook Template');
        logError(`DeveloperAppsCard Error loading template ${e}`);
        return;
      }
    }

    const app = {
      id: `app-${uuidv4()}`,
      name: 'Hello World',
      authorId: Settings.get('userId'),
      authorWalletId: await WalletStore.getPrimaryWalletId(),
      code: this.#newEbookTemplate,
      version: 1,
      price: '1',
      installDate: (new Date()).getTime(),
      updateDate: (new Date()).getTime(),
      creationDate: (new Date()).getTime(),
      isPublished: 0,
      type: appTypes.ebook
    }

    app.signature = AppStore.signApp(app);

    MessageRouter.onRunApp({appFileName: 'appEditorApp.html'}, {app});
  }

  async newAudio() {
    MessageRouter.progress('Loading editor', -1, 1);

    if(!this.#newAudioTemplate) {
      try {
        this.#newAudioTemplate = await this.loadTemplate(NEW_AUDIO_TEMPLATE_PATH);
      } catch (e) {
        MessageRouter.alert('There was an error loading the New Audio Template');
        logError(`DeveloperAppsCard Error loading template ${e}`);
        return;
      }
    }

    const app = {
      id: `app-${uuidv4()}`,
      name: 'Hello World',
      authorId: Settings.get('userId'),
      authorWalletId: await WalletStore.getPrimaryWalletId(),
      code: this.#newAudioTemplate,
      version: 1,
      price: '1',
      installDate: (new Date()).getTime(),
      updateDate: (new Date()).getTime(),
      creationDate: (new Date()).getTime(),
      isPublished: 0,
      type: appTypes.audio
    }

    app.signature = AppStore.signApp(app);

    MessageRouter.onRunApp({appFileName: 'appEditorApp.html'}, {app});
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

      MessageRouter.onRunApp({appFileName: 'appEditorApp.html'}, {app: reloadedApp});
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
    <p class="title is-4">Earnings</p>
    
   <div class="px-1 mx-3 mt-3">
        <div class="is-size-6">Developer Wallet Balance: 
          <div class="is-family-monospace"><span id="devWalletBalance">-</span> satoshis</div>
        </div>
        <a href="#blank" id="withdrawDev" style="display: none">Withdraw</a>  
    </div>
    
    <div class="px-1 mx-3 mt-3">
      <div class="is-size-6 my-3">Distributor Wallet Balance: 
        <div class="is-family-monospace"><span id="brokerWalletBalance">-</span> satoshis</div>
      </div>
      <a href="#blank" id="withdrawBroker" style="display: none">Withdraw</a> 
    </div>
    
    <div class="mt-5">
        <button id="newAppBtn" class="button is-success appRunButton mt-5 mr-2">New App</button>
        <button id="newEbookBtn" class="button is-success appRunButton mt-5 mr-2">New eBook</button>
        <button id="newAudioBtn" class="button is-success appRunButton mt-5">New Audio</button>
    </div>
</div>
`;

export default _DeveloperAppsCard;
