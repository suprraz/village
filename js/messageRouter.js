import Profile from "./store/profile.js";
import NodeStore from "./store/nodeStore.js";
import {logError, logMessage} from "./utils/logger.js";
import Settings from "./settings.js";

class _MessageRouter {

  init (coreApps, onConnection) {
    this.coreApps = coreApps;
    this.callerOnConnection = (node) => onConnection(node);
    this.registerListeners();
  }

  onMessage (data, node) {

    const {msg, apps, destinationId, senderId, profile, offer, answer, routes} = data;

    if(destinationId !== null && destinationId !== Profile.getNodeID()) {
      // forward message
      const nextHopNode = NodeStore.getNextHopNode(destinationId);
      if(nextHopNode) {
        nextHopNode.send(data);
      } else {
        logMessage(`MessageRouter Route not found for ${destinationId}.`)
      }
    } else if (msg && senderId) {
      this.coreApps.Chat.messageReceived(senderId, msg);
    } else if (apps) {
      this.coreApps.AppListApp.onAvailableApps(apps);
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
    NodeStore.prune();
    if(NodeStore.getNodes().length === 0) {
      this.coreApps.MqttWorker.seekNodes();
    }
    this.coreApps.VillageState.refresh();
  }

  onRunApp(app, params) {
    this.coreApps.Sandbox.run(app, params);
  }

  onBuyApp(app) {
    this.coreApps.InvoiceStore.purchaseApp(app);
  }

  onInstallApp(app) {
    this.coreApps.AppListApp.installApp(app);
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
          this.coreApps.Editor.installApp(data.app);
        } else if(!!data.encryptionKey) {
          this.coreApps.InvoiceStore.updateInvoice(data.appName, data.encryptionKey)
        }
      }
    }, false);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onNetworkChange();
      }
    }, false);
  }
}

const MessageRouter = new _MessageRouter();

export default MessageRouter;
