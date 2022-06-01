import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logMessage} from "../utils/logger.js";
import config from "../config.js";
import {getSwapCandidate, sortNeighbors} from "../utils/routing.js";

class _RouteBalancer {
  constructor() {
    this.waiting = [];
    this.busyRoutes = [];

    this.prevRoutes = [];
    this.sendPeriodicUpdates();
  }

  sendPeriodicUpdates() {
    const routes = NodeStore.getRoutes();

    if(JSON.stringify(routes) !== JSON.stringify(this.prevRoutes)) {
      logMessage(`RouteBalancer Routes changed, sending routing update`);
      this.prevRoutes = routes;
      const neighborList = NodeStore.getConnectedNodeIds();

      neighborList.map((neighborId) => {
        const neighbor = NodeStore.getNodeById(neighborId);
        neighbor.send({
          type: 'routing',
          subtype: 'profile-update',
          profile: Profile.getShareable()
        });
      })

      this.enqueue(routes); // check for lost connections
    } else {
      logMessage(`RouteBalancer Routes unchanged, skipping update`);
    }

    setTimeout(() => {
      this.sendPeriodicUpdates();
    }, config.routingTableUpdateFrequency)
  }

  rebuildRoutes() {
    const allRoutes = NodeStore.getRoutes();
    this.enqueue(allRoutes);
  }

  requestRoute(destinationId) {
    MessageRouter.coreApps.VillageSignaler.requestConnection(destinationId);
  }

  hasCapacity() {
    return NodeStore.getConnectedNodeIds().length + NodeStore.getNodesPending().length < config.maxConnectedNeighbors;
  }

  onRouteRequest(fromId) {
    const swapCandidate = getSwapCandidate(Profile.getNodeID(), NodeStore.getConnectedNodeIds(), [fromId]);

    if(this.hasCapacity()) {
      MessageRouter.coreApps.VillageSignaler.acceptConnection(fromId);
    } else if (!!swapCandidate ) {
      logMessage(`RouteBalancer Dropping connection to: ${swapCandidate.oldId} to swap with ${swapCandidate.toId}`);

      MessageRouter.coreApps.VillageSignaler.acceptConnection(fromId);
    } else {
      MessageRouter.coreApps.VillageSignaler.rejectConnection(fromId);
      logMessage('RouteBalancer Connection refused: too many connections');
    }
  }

  onRouteBusy(fromId) {
    this.busyRoutes.push(fromId);
    logMessage(`RouteBalancer Busy routes updated: ${this.busyRoutes}`);

    this.process();

    setTimeout(() => {
      this.busyRoutes = this.busyRoutes.filter((nodeId) => nodeId !== fromId)
    }, config.busyRouteRetry)
  }

  enqueue(routes) {
    const neighbors = routes.reduce((total, curr) => {
      return [... new Set([...total, ...curr])];
    }, []);
    logMessage(`RouteBalancer Neighbor list received: ${neighbors}`);

    const newNeighbors = neighbors.filter((nodeId) =>
      !!nodeId &&
      !this.waiting.find((n) => n === nodeId) &&
      !NodeStore.getNodeById(nodeId) &&
      nodeId !== Profile.getNodeID()
    );

    logMessage(`RouteBalancer Queueing neighbors: ${newNeighbors}`);

    if(newNeighbors.length) {
      const newWaiting = [... new Set([...this.waiting, ...newNeighbors])]
      this.waiting = sortNeighbors(Profile.getNodeID(),newWaiting);
      this.process();
    }
  }

  nextCandidate() {
    const eligible = this.waiting.filter((nodeId) => !this.busyRoutes.includes(nodeId));

    if(!eligible.length) {
      return null;
    }
    return eligible[0];
  }

  process() {
    if(!this.waiting.length || NodeStore.getNodesPending() > config.villageParallelReqs) {
      return;
    }

    if(NodeStore.getConnectedNodeIds().length < config.maxConnectedNeighbors) {
      const candidateId = this.nextCandidate();
      if(candidateId) {
        this.waiting = this.waiting.filter(id => id !== candidateId);
        logMessage(`RouteBalancer Processing candidate: ${candidateId}`);

        this.requestRoute(candidateId);
      }
    } else {
      this.swapNeighbors();
    }
  }

  swapNeighbors() {
    const fromId = Profile.getNodeID();
    const swapCandidate = getSwapCandidate(fromId, NodeStore.getConnectedNodeIds(), this.waiting);

    if(swapCandidate) {
      logMessage(`RouteBalancer Swapping ${swapCandidate.oldId} to ${swapCandidate.toId}`);

      this.waiting = this.waiting.filter(id => id !== swapCandidate.toId);
      this.requestRoute(swapCandidate.toId);
    }
  }

  routeComplete(neighborId) {
    logMessage(`RouteBalancer Neighboring attempt complete ${neighborId}`);
    this.waiting = this.waiting.filter( p => p !== neighborId);

    this.process();
  }
}

export default _RouteBalancer;
