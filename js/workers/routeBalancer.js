import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logMessage} from "../utils/logger.js";
import config from "../config.js";
import {getSwapCandidate, sortNeighbors} from "../utils/routing.js";

class _RouteBalancer {
  constructor() {
    this.waiting = [];

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
          subtype: 'route-list',
          routes : NodeStore.getRoutes()}
        );
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

  process() {
    if(!this.waiting.length || NodeStore.getNodesPending() > 0) {
      return;
    }

    if(NodeStore.getConnectedNodeIds().length < config.maxConnectedNeighbors) {
      const candidateId = this.waiting.pop();
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
