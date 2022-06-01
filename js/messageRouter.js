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
    const { apps, destinationId, type } = data;

    if(destinationId !== null && destinationId !== Profile.getNodeID()) {
      // forward message
      const nextHopNode = NodeStore.getNextHopNode(destinationId);
      if(nextHopNode) {
        nextHopNode.send(data);
      } else {
        logMessage(`MessageRouter Route not found for ${destinationId}.`)
      }
      return;
    }

    switch (type) {
      case 'app':
        this.onAppMessage(data, node);
        break;
      case 'app-list':
        if (apps) {
          this.coreApps.AppListCard.onAvailableApps(apps);
        }
        break;
      case 'routing':
        this.onRoutingMessage(data, node)
        break;
      default:
        logError(`MessageRouter Unhandled message: ${data}`);
    }
  }

  onAppMessage(data, node) {
    const {msg, senderId, app, } = data;

    switch (app) {
      case 'chat':
        if (msg && senderId) {
          this.coreApps.ChatCard.messageReceived(senderId, msg);
        }
        break;
      default:
        logError(`MessageRouter Unhandled message: ${data}`);
    }
  }

  onRoutingMessage(data, node) {
    const {senderId, offer, answer, routes, candidate, subtype, profile} = data;
    switch (subtype) {
      case 'request-connection':
        if (senderId) {
          logMessage('MessageRouter Evaluating connection request')
          this.coreApps.RouteBalancer.onRouteRequest(senderId);
        }
        break;
      case 'accept-connection':
        if (senderId) {
          logMessage('MessageRouter Connection accepted, creating offer')
          this.coreApps.VillageSignaler.createOffer(senderId);
        }
        break;
      case 'reject-connection-busy':
        if (senderId) {
          logMessage('MessageRouter Connection refused, too busy')
          this.coreApps.RouteBalancer.onRouteBusy(senderId);
        }
        break;
      case 'offer':
        if (offer && senderId) {
          logMessage('MessageRouter Accepting automated offer')
          this.coreApps.VillageSignaler.acceptOffer(offer, senderId, node);
        }
        break;
      case 'answer':
        if (answer && senderId) {
          logMessage('MessageRouter Accepting automated answer')
          this.coreApps.VillageSignaler.acceptAnswer(answer, senderId, node);
        }
        break;
      case 'ice-candidate':
        if(senderId && candidate ) {
          logMessage(`MessageRouter Received ice candidate for ${senderId}`);
          this.coreApps.VillageSignaler.onCandidate(senderId, candidate);
        }
        break;
      case 'route-list':
        if (routes) {
          logMessage(`MessageRouter Received routing update`);
          node.setRoutes(routes);
          this.coreApps.RouteBalancer.enqueue(routes);
        }
        break;
      case 'profile-update':
        if (profile) {
          logMessage(`MessageRouter Received profile for ${profile.nodeId}`);
          node.setProfile(profile);
          this.onNetworkChange();
          this.coreApps.RouteBalancer.enqueue(node.profile.routes);
        }
        break;
      default:
        logError(`MessageRouter Unhandled message: ${data}`);
    }
  }

  onConnection(node) {
    const profile =  Profile.getShareable();
    logMessage(`MessageRouter Sending profile for ${profile.nodeId}`);
    node.send({
      type: 'routing',
      subtype: 'profile-update',
      profile
    });

    this.callerOnConnection(node);
  }

  onNetworkChange() {
    const nodeCountStart = NodeStore.getNodes().length;
    NodeStore.prune();
    const nodeCountEnd = NodeStore.getNodes().length;

    if(nodeCountEnd < config.mqttParallelReqs) {
      this.coreApps.MqttWorker.seekNodes();
    } else if (nodeCountEnd < nodeCountStart) {
      this.coreApps.RouteBalancer.rebuildRoutes();
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
