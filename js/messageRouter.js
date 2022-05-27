import Profile from "./store/profile.js";
import NodeStore from "./store/nodeStore.js";
import {logError, logMessage} from "./utils/logger.js";
import Settings from "./settings.js";
import config from "./config.js";
import AppStore from "./store/appStore.js";

class _MessageRouter {

  init (coreApps, onConnection) {
    this.coreApps = coreApps;
    this.callerOnConnection = (node) => onConnection(node);
    this.registerListeners();
  }

  onMessage (data, node) {

    const {msg, apps, destinationId, senderId, profile, offer, answer, routes, candidate} = data;

    if(destinationId !== null && destinationId !== Profile.getNodeID()) {
      // forward message
      const nextHopNode = NodeStore.getNextHopNode(destinationId);
      if(nextHopNode) {
        nextHopNode.send(data);
      } else {
        logMessage(`MessageRouter Route not found for ${destinationId}.`)
      }
    } else if (senderId && candidate) {
      logMessage(`MessageRouter Received ice candidate for ${senderId}`);
      this.coreApps.NeighborsWorker.onCandidate(senderId, candidate);
    } else if (msg && senderId) {
      this.coreApps.ChatCard.messageReceived(senderId, msg);
    } else if (apps) {
      this.coreApps.AppListCard.onAvailableApps(apps);
    } else if (profile) {
      logMessage(`MessageRouter Received profile for ${profile.nodeId}`);
      node.setProfile(profile);
      this.onNetworkChange();
      this.coreApps.NeighborsWorker.enqueue(node.profile.routes);
    } else if (offer && senderId) {
      logMessage('MessageRouter Accepting automated offer')
      this.coreApps.NeighborsWorker.acceptOffer(offer, senderId, node);
    } else if (answer && senderId) {
      logMessage('MessageRouter Accepting automated answer')
      this.coreApps.NeighborsWorker.acceptAnswer(answer, senderId, node);
    } else if (routes) {
      logMessage(`MessageRouter Received routing update`);
      node.setRoutes(routes);
      this.coreApps.NeighborsWorker.enqueue(routes);
    } else {
      logError(`MessageRouter Unhandled message: ${data}`);
    }
  }

  onConnection(node) {
    const profile =  Profile.getShareable();
    logMessage(`MessageRouter Sending profile for ${profile.nodeId}`);
    node.send({profile});

    this.callerOnConnection(node);
  }

  onNetworkChange() {
    const nodeCountStart = NodeStore.getNodes().length;
    NodeStore.prune();
    const nodeCountEnd = NodeStore.getNodes().length;

    if(nodeCountEnd < config.mqttParallelReqs) {
      this.coreApps.MqttWorker.seekNodes();
    } else if (nodeCountEnd < nodeCountStart) {
      this.coreApps.NeighborsWorker.rebuildRoutes();
    }

    this.coreApps.VillageStateCard.refresh();
  }

  onRunApp(app, params) {
    this.coreApps.Sandbox.run(app, params);
  }

  onBuyApp(app) {
    this.coreApps.InvoiceStore.purchaseApp(app);
  }

  onInstallApp(app) {
    this.coreApps.AppListCard.installApp(app);
  }

  onCloseApp(sourceAppName) {
    if(sourceAppName === 'LandingApp') {
      Settings.update('showLanding', false);
      this.onNetworkChange();
    }
    this.coreApps.Sandbox.stop();
  }

  registerListeners() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if(data) {
        if(!!data.closeApp) {
          this.onCloseApp(data.sourceApp);
        } else if (!!data.saveApp) {
          AppStore.installApp(data.app);
          this.coreApps.AppListCard.updateAppList();
          this.coreApps.AppListCard.sendApps();
        } else if(!!data.encryptionKey) {
          this.coreApps.InvoiceStore.updateInvoice(data.appName, data.encryptionKey)
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
