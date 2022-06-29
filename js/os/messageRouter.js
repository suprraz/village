import {logError, logMessage} from "../utils/logger.js";
import Settings from "./settings.js";
import AppStore from "./store/appStore.js";

class _MessageRouter {
  #riverApi
  #coreApps

  init (riverApi, coreApps) {
    this.#riverApi = riverApi;

    this.#coreApps = coreApps;

    this.registerHandlers();
    this.registerListeners();

    this.#riverApi.registerOnNodeConnected(() => this.onNodeConnected());
    this.#riverApi.registerOnNetworkChangeHandler(() => this.onNetworkChange());
  }

  registerHandlers() {
    this.#riverApi.registerHandler('app', (data) => this.onAppMessage(data));
    this.#riverApi.registerHandler('app-list', (data) => this.onAppListMessage(data));
  }

  onNodeConnected() {
    this.#coreApps.AddPeerCard.stop();
    this.#coreApps.AppListCard.updateAppList();
    this.#coreApps.AppListCard.sendApps();
  }

  onNetworkChange() {
    this.#coreApps.VillageStateCard.refresh();
  }


  onAppMessage(data) {
    const {msg, senderId, app, } = data;

    switch (app) {
      case 'chat':
        if (msg && senderId) {
          this.#coreApps.ChatCard.messageReceived(senderId, msg);
        }
        break;
      default:
        logError(`MessageRouter Unhandled message: ${JSON.stringify(data)}`);
    }
  }

  onAppListMessage(data) {
    const { apps } = data;

    if (apps) {
      this.#coreApps.AppListCard.onAvailableApps(apps);
    }
  }

  onRunApp(app, params) {
    this.#coreApps.Sandbox.run(app, params);
  }

  onBuyApp(app) {
    this.#coreApps.InvoiceStore.purchaseApp(app);
  }

  onInstallApp(app) {
    this.#coreApps.AppListCard.installApp(app);
  }

  onAppListUpdate() {
    this.#coreApps.AppListCard.updateAppList();
  }

  onCloseApp(sourceAppName) {
    if(sourceAppName === 'LandingApp') {
      Settings.update('showLanding', false);
      this.onNetworkChange();
    }
    this.#coreApps.Sandbox.stop();
  }

  registerListeners() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if(data) {
        switch (data.type) {
          case 'closeApp':
            this.onCloseApp(data.payload.sourceApp);
            break;
          case 'saveAndRunApp':
            if(data.payload.runAfterSave) {
              this.onCloseApp(data.payload.sourceApp);
            }

            AppStore.updateApp(data.payload.app, data.payload.runAfterSave);

            this.#coreApps.AppListCard.updateAppList();
            break;
          case 'invoicePaid':
            this.#coreApps.InvoiceStore.updateInvoice(data.payload.appId, data.payload.encryptionKey)
            break;

          default:
            logError(`MessageRouter Unhandled iframe message: ${JSON.stringify(data)}`);
        }
      }
    }, false);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        logMessage('MessageRouter Visibility change: visible');
        this.onNetworkChange();
      }
    }, false);
  }
}

const MessageRouter = new _MessageRouter();

export default MessageRouter;
