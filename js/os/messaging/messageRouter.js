import {logError, logMessage} from "../../utils/logger.js";
import AppStore from "../store/appStore.js";
import NodeStore from "../../riverNetwork/nodeStore.js";
import registerAppMessageListeners from "./appMessageListeners.js";

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
    this.#riverApi.registerOnDownloadProgressHandler((text, value, total) => this.onDownloadProgress(text, value, total));
  }

  registerHandlers() {
    this.#riverApi.registerHandler('app', (data) => this.onAppMessage(data));
    this.#riverApi.registerHandler('app-list', (data) => this.onAppListMessage(data));
    this.#riverApi.registerHandler('app-broker-request', (data) => this.onAppBrokerRequest(data));
    this.#riverApi.registerHandler('app-broker-response', (data) => this.onAppBrokerResponse(data));
  }

  alert(text) {
    this.#coreApps.Notify.alert(text);
  }

  confirm(text, onConfirm, onCancel) {
    this.#coreApps.Notify.confirm(text, onConfirm, onCancel);
  }

  progress(text, value, total) {
    this.#coreApps.Notify.progress(text, value, total);
  }

  onNodeConnected() {
    this.#coreApps.AppListCard.updateAppList();
    this.#coreApps.AppListCard.sendApps();
  }

  onNetworkChange() {
    this.#coreApps.AppListCard.removeUnavailableApps();
    if(this.#coreApps.Sandbox.getRunningAppId()) {
      this.#coreApps.Sandbox.postMessage({type: 'message', payload: { method: 'networkChange'}});
    }
    this.#coreApps.VillageStateCard.refresh();
  }

  onDownloadProgress(text, value, total) {
    this.progress(text, value, total)
  }

  onAppMessage(data) {
    const { app } = data;

    if(app === this.#coreApps.Sandbox.getRunningAppId()) {
      this.#coreApps.Sandbox.postMessage({type: 'message', payload: data.payload, senderId: data.senderId});
    } else {
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
        this.alert('Failed to download app: Peer is no longer available');
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
        this.progress('Initiating download', -1, 1);
        brokerNode.send({
          type: 'app-broker-request',
          app
        });
      } else {
        this.alert('Failed to download app: Peer is no longer available');
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
    registerAppMessageListeners(this.#coreApps);

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
