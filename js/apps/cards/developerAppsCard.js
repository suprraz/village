import AppStore from "../../os/store/appStore.js";
import MessageRouter from "../../os/messageRouter.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import Settings from "../../os/settings.js";
import WalletStore from "../../os/store/walletStore.js";

const NEW_APP_TEMPLATE_PATH = 'js/apps/sandboxed/newAppTemplate.html';

const MIN_SATS_WITHDRAWAL = 10;
const MIN_SATS_BUFFER = 5;

class _DeveloperAppsCard {
  #newAppTemplate = null;
  #newAppBtn
  #devWalletBalanceAmt
  #brokerWalletBalanceAmt
  #devWalletBalanceEl
  #brokerWalletBalanceEl
  #withdrawDevEl
  #withdrawBrokerEl

  constructor(containerEl) {

    containerEl.innerHTML = devAppsContainerHtml;
    this.#newAppBtn = containerEl.querySelector('#newAppBtn');
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

  async loadTemplate() {
    const res = await fetch( NEW_APP_TEMPLATE_PATH );
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
    this.#withdrawDevEl.addEventListener('click', (e) => this.withdrawDev(e));
    this.#withdrawBrokerEl.addEventListener('click', (e) => this.withdrawBroker(e));
  }

  async newApp() {
    if(!this.#newAppTemplate) {
      try {
        this.#newAppTemplate = await this.loadTemplate();
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
      isPublished: 0
    }

    app.signature = AppStore.signApp(app);

    MessageRouter.onRunApp({appFileName: 'aceEditorApp.html'}, {app});
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

      MessageRouter.onRunApp({appFileName: 'aceEditorApp.html'}, {app: reloadedApp});
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
    
   <div class="px-1 mx-3 mt-3">
        <div class="is-size-5">Developer Wallet Balance: 
          <div class="is-family-monospace"><span id="devWalletBalance">-</span> satoshis</div>
        </div>
        <a href="#blank" id="withdrawDev" style="display: none">Withdraw</a>  
    </div>
    
    <div class="px-1 mx-3 mt-3">
      <div class="is-size-5 my-3">Distributor Wallet Balance: 
        <div class="is-family-monospace"><span id="brokerWalletBalance">-</span> satoshis</div>
      </div>
      <a href="#blank" id="withdrawBroker" style="display: none">Withdraw</a> 
    </div>
    
    <div class="mt-5">
        <button id="newAppBtn" class="button is-info appRunButton mt-5">Create New App</button>
    </div>
</div>
`;

export default _DeveloperAppsCard;
