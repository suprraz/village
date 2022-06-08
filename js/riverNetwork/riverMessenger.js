import Profile from "./profile.js";
import NodeStore from "./nodeStore.js";
import {logError, logMessage} from "../utils/logger.js";
import config from "../config.js";

class _riverMessenger {
  #handlers
  #onNodeConnected
  #onNetworkChangeHandler
  riverApps

  init(riverApps) {
    this.riverApps = riverApps;
  }

  constructor() {
    this.#handlers = {};
  }

  connect() {
    this.riverApps.MqttWorker.seekNodes();
  }

  registerHandler(type, handler) {
    if(this.#handlers[type]) {
      logError(`RiverMessenger Handler registration overwrite on ${type}`)
    }

    this.#handlers[type] = handler;
  }

  registerOnNodeConnected(onNodeConnected) {
    this.#onNodeConnected = onNodeConnected;
  }

  registerOnNetworkChangeHandler(onNetworkChangeHandler) {
    this.#onNetworkChangeHandler = onNetworkChangeHandler;
  }

  onMessage (data, node) {
    const { apps, destinationId, type } = data;

    if(!!destinationId && destinationId !== Profile.getNodeID()) {
      // forward message
      const nextHopNode = NodeStore.getNextHopNode(destinationId);
      if(nextHopNode) {
        nextHopNode.send(data);
      } else {
        logMessage(`RiverMessenger Route not found for ${destinationId}.`)
      }
      return;
    }

    switch (type) {
      case 'routing':
        this.onRoutingMessage(data, node)
        break;
      default:
        if(typeof this.#handlers[type] === 'function') {
          this.#handlers[type](data);
          return
        }

        logError(`RiverMessenger Unhandled message: ${JSON.stringify(data)}`);
    }
  }


  onRoutingMessage(data, node) {
    const {senderId, offer, answer, candidate, subtype, profile} = data;
    switch (subtype) {
      case 'request-connection':
        if (senderId) {
          logMessage('RiverMessenger Evaluating connection request')
          this.riverApps.RouteBalancer.onRouteRequest(senderId);
        }
        break;
      case 'accept-connection':
        if (senderId) {
          logMessage('RiverMessenger Connection accepted, creating offer')
          this.riverApps.RouteBalancer.getVillageSignaler().createOffer(senderId);
        }
        break;
      case 'reject-connection-busy':
        if (senderId) {
          logMessage('RiverMessenger Connection refused, too busy')
          this.riverApps.RouteBalancer.onRouteBusy(senderId);
        }
        break;
      case 'offer':
        if (offer && senderId) {
          logMessage('RiverMessenger Accepting automated offer')
          this.riverApps.RouteBalancer.getVillageSignaler().acceptOffer(offer, senderId, node);
        }
        break;
      case 'answer':
        if (answer && senderId) {
          logMessage('RiverMessenger Accepting automated answer')
          this.riverApps.RouteBalancer.getVillageSignaler().acceptAnswer(answer, senderId, node);
        }
        break;
      case 'ice-candidate':
        if(senderId && candidate ) {
          logMessage(`RiverMessenger Received ice candidate for ${senderId}`);
          this.riverApps.RouteBalancer.getVillageSignaler().onCandidate(senderId, candidate);
        }
        break;
      case 'profile-update':
        if (profile) {
          logMessage(`RiverMessenger Received profile for ${profile.nodeId}`);
          node.setProfile(profile);
          this.onNetworkChange();
          this.riverApps.RouteBalancer.enqueue(node.profile.routes);
        }
        break;
      default:
        logError(`RiverMessenger Unhandled message: ${JSON.stringify(data)}`);
    }
  }

  onConnection(node) {
    const profile =  Profile.getShareable();
    logMessage(`RiverMessenger Sending profile for ${profile.nodeId}`);
    node.send({
      type: 'routing',
      subtype: 'profile-update',
      profile
    });

    if(typeof this.#onNodeConnected === 'function') {
      this.#onNodeConnected(node);
    }
  }

  onNetworkChange() {
    const nodeCountStart = NodeStore.getNodes().length;
    NodeStore.prune();
    const nodeCountEnd = NodeStore.getNodes().length;

    if(nodeCountEnd < config.mqttParallelReqs) {
      this.riverApps.MqttWorker.seekNodes();
    } else if (nodeCountEnd < nodeCountStart) {
      this.riverApps.RouteBalancer.rebuildRoutes();
    }

    if(typeof this.#onNetworkChangeHandler === 'function') {
      this.#onNetworkChangeHandler();
    }
  }

  onRouteComplete(destinationId) {
    this.riverApps.RouteBalancer.routeComplete(destinationId);
  }
}

const RiverMessenger = new _riverMessenger();

export default RiverMessenger;
