import {logMessage} from "../utils/logger.js";
import config from "../config.js";
import {idDistance, sortNeighbors} from "../utils/routing.js";
import Profile from "./profile.js";

class _NodeStore {
  constructor() {
    this.nodes = [];
  }

  getNodeById(nodeId) {
    return this.nodes.find((node) => node.profile.nodeId === nodeId);
  }

  broadcast(msgObj) {
    this.nodes.map((node) => node.send(msgObj));
  }

  addNode(node) {
    this.nodes.push(node);
    logMessage(`Added node: ${node.profile.nodeId}`);
  }

  getNodes() {
    return this.nodes;
  }

  getNeighborList() {
    const allNeighbors = NodeStore.getNodes()
      .filter((node) => !!node.profile.nodeId && node.pc.connectionState === 'connected')
      .map(node => node.profile.nodeId);

    return [...new Set(allNeighbors)];
  }

  getNextHopNode(destinationId) {
    const nextHopDirect = this.nodes.find((node) => node.profile.nodeId === destinationId);
    if( nextHopDirect ) {
      return nextHopDirect;
    }

    let neighbor = null;
    let hops = 999999;

    this.nodes.map(node => {
      if(node?.profile?.routes) {
        node.profile.routes.map((hop,i) => {
          if(hop.includes(destinationId) && i < hops) {
            neighbor = node;
            hops = i;
          }
        })
      }

    })

    // logMessage(`Best route: ${neighbor.profile.nodeId}  Hops: ${hops}`);
    return neighbor;
  }

  deleteNodesById(nodeId) {
    if (nodeId === null) {
      return;
    }

    const trashNodes = this.nodes.filter((node) => node.profile.nodeId === nodeId);

    if(trashNodes.length) {
      logMessage(`Deleting ${trashNodes.length} nodes.`);
    }

    trashNodes.map(node => {
      node.terminate();
    });

    this.nodes = this.nodes.filter((n) => n.profile.id !== nodeId);
  }

  isDisconnected(node) {
    return ['failed', 'disconnected', 'closed'].includes(node.pc.connectionState) ||
      (!node.pending && (node.pc.connectionState !== 'connected'));
  }

  getNodesPending() {
    return this.nodes.filter((n) => n.pending);
  }

  getRoutes() {
    const neighborsList = this.getNeighborList();

    const routes = [];

    routes[0] = neighborsList;

    let i = 1;
    while(i < config.maxHops && routes[i-1] && routes[i-1].length) {
      routes[i] = getRoutesByHop(i);
      i++;
    }

    function getRoutesByHop(i) {
      return neighborsList.reduce((hop, nodeId) => {
        const node = NodeStore.getNodeById(nodeId);
        if(node?.profile?.routes) {
          const coveredRoutes = routes.reduce((total, curr) => {
            return [...total, ...curr];
          }, []);
          let newRoutes = node.profile.routes[i - 1] || [];
          newRoutes = newRoutes.filter(id => !coveredRoutes.find(covered => covered === id));
          newRoutes = [...new Set([...hop, ...newRoutes])];

          hop = newRoutes;
        }
        return hop;
      }, [])
    }

    routes.map((hop, i) => logMessage(`${i} hop routes: ${hop}`));
    return routes;
  }

  prune() {
    // failed nodes timed out while connecting or broke link after connection
    const failedNodes = this.nodes.filter( node => this.isDisconnected(node) );

    failedNodes.map((node) => node.terminate());

    this.nodes = this.nodes.filter((node) => !failedNodes.includes(node));

    this.pruneExtraNeighbors();
  }

  pruneExtraNeighbors() {
    while(NodeStore.getNeighborList().length > config.maxConnectedNeighbors) {
      const sortedNeighbors = sortNeighbors(Profile.getNodeID(), NodeStore.getNeighborList());
      const trashNeighbor = sortedNeighbors[sortedNeighbors.length-1];
      const rank = idDistance(Profile.getNodeID(), trashNeighbor);

      logMessage(`Too many neighbors: dropping ${trashNeighbor} rank: ${rank}`);
      sortedNeighbors.map(n => {
        logMessage(`-- Neighbor ${n} rank: ${ idDistance(Profile.getNodeID(), n)}`);
      })

      this.deleteNodesById(trashNeighbor);
    }
  }
}

const NodeStore = new _NodeStore();

export default NodeStore;
