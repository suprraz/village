import {logError, logMessage} from "../utils/logger.js";
import Settings from "./settings.js";
import AppStore from "./store/appStore.js";
import NodeStore from "../riverNetwork/nodeStore.js";

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
    this.#riverApi.registerHandler('app-broker-request', (data) => this.onAppBrokerRequest(data));
    this.#riverApi.registerHandler('app-broker-response', (data) => this.onAppBrokerResponse(data));
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

  async onAppBrokerRequest(data) {
    const { app, senderId } = data;
    const fullApp = await AppStore.getApp(app.id);
    if(fullApp) {
      const paywalledApp = await this.#coreApps.InvoiceStore.paywallApp(fullApp);

      const requestingNode = NodeStore.getNodeById(senderId);

      if(requestingNode) {
        requestingNode.send({
          type: 'app-broker-response',
          paywalledApp
        });
      } else {
        alert('Failed to download app: Peer is no longer available');
      }
    } else {
      logError('MessageRouter App is no longer available');
    }

  }

  onRunApp(app, params) {
    this.#coreApps.Sandbox.run(app, params);
  }

  onRequestApp(app) {
    if(app.brokerNodeId) {
      const brokerNode = NodeStore.getNodeById(app.brokerNodeId);
      if(brokerNode) {
        brokerNode.send({
          type: 'app-broker-request',
          app
        });
      } else {
        alert('Failed to download app: Peer is no longer available');
        logError('MessageRouter App broker is no longer available')
      }

    }
  }

  onAppBrokerResponse(data) {
    const { paywalledApp } = data;

    this.#coreApps.InvoiceStore.purchaseApp(paywalledApp);
  }

  onInstallApp(app) {
    this.#coreApps.AppListCard.installApp(app);
  }

  onAppListUpdate() {
    this.#coreApps.AppListCard.updateAppList();
  }

  onCloseApp() {
    this.#coreApps.Sandbox.stop();
  }

  registerListeners() {
    window.addEventListener('message', async (event) => {
      const data = event.data;
      if (data) {
        switch (data.type) {
          case 'hideLanding':
            if(data.payload.sourceApp === 'landingAppId') {
              Settings.update('showLanding', false);
            }
            break;
          case 'closeApp':
            this.onCloseApp(data.payload.sourceApp);
            if(data.payload.sourceApp === 'landingAppId') {
              this.onNetworkChange();
            }
            break;
          case 'saveAndRunApp':
            if (data.payload.runAfterSave) {
              this.onCloseApp(data.payload.sourceApp);
            }

            AppStore.updateApp(data.payload.app, data.payload.runAfterSave);

            this.#coreApps.AppListCard.updateAppList();
            break;
          case 'invoicePaid':
            this.#coreApps.InvoiceStore.updateInvoice(data.payload.appId, data.payload.encryptionKey);
            break;
          case 'saveData':
            try {
              await this.#coreApps.SandboxStore.save(this.#coreApps.Sandbox.getRunningAppId(), data.payload?.key, data.payload?.value);
              this.#coreApps.Sandbox.postMessage({type: 'saveDataSuccess', payload: data.payload})
            } catch (e) {
              this.#coreApps.Sandbox.postMessage({type: 'saveDataFailure', payload: data.payload})
            }
            break;
          case 'readData':
            const { key } = data?.payload;
            try {
              const storedObject = await this.#coreApps.SandboxStore.read(this.#coreApps.Sandbox.getRunningAppId(), data.payload.key);
              this.#coreApps.Sandbox.postMessage({type: 'readDataSuccess', payload: {key, value: storedObject.value}});
            } catch (e) {
              this.#coreApps.Sandbox.postMessage({type: 'readDataFailure', payload: data.payload})
            }
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
