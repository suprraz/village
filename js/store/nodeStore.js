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
    logMessage(`NodeStore Added node: ${node.profile.nodeId}`);
  }

  getNodes() {
    return this.nodes;
  }

  getConnectedNodeIds() {
    const connectedNeighborIds = NodeStore.getNodes()
      .filter((node) => !!node.profile?.nodeId && node.isConnected())
      .map(node => node.profile.nodeId);

    return [...new Set(connectedNeighborIds)];
  }

  getNextHopNode(destinationId) {
    const nextHopDirect = this.nodes.find((node) => node.profile.nodeId === destinationId && node.isConnected());
    if( nextHopDirect ) {
      return nextHopDirect;
    }

    let neighbor = null;
    let hops = 999999;

    this.nodes.map(node => {
      if(node.profile?.routes) {
        node.profile.routes.map((hop,i) => {
          if(hop.includes(destinationId) && i < hops) {
            neighbor = node;
            hops = i;
          }
        })
      }
    })

    //logMessage(`NodeStore Best route: ${neighbor?.profile?.nodeId}  Hops: ${hops}`);
    return neighbor;
  }

  deleteNodesById(nodeId) {
    if (nodeId === null) {
      return;
    }

    const trashNodes = this.nodes.filter((node) => node.profile.nodeId === nodeId);

    if(trashNodes.length) {
      logMessage(`NodeStore Deleting ${trashNodes.length} nodes.`);
    }

    trashNodes.map(node => {
      node.terminate();
    });

    this.nodes = this.nodes.filter((n) => n.profile.id !== nodeId);
  }

  getNodesPending() {
    return this.nodes.filter((n) => n.pending);
  }

  getRoutes() {
    const neighborsList = this.getConnectedNodeIds();

    const routes = [];

    routes[0] = neighborsList;

    let i = 1;
    while(i < config.maxHops && routes[i-1] && routes[i-1].length) {
      const r = getRoutesByHop(i);
      if(r.length) {
        routes[i] = r;
      }
      i++;
    }

    function getRoutesByHop(i) {
      return neighborsList.reduce((hop, nodeId) => {
        const node = NodeStore.getNodeById(nodeId);
        if(node?.profile?.routes) {
          const coveredRoutes = routes.reduce((total, curr) => {
            return [...total, ...curr];
          }, [Profile.getNodeID()]);
          let newRoutes = node.profile.routes[i - 1] || [];
          newRoutes = newRoutes.filter(id => !coveredRoutes.find(covered => covered === id));
          newRoutes = [...new Set([...hop, ...newRoutes])];

          hop = newRoutes;
        }
        return hop;
      }, [])
    }

    routes.map((hop, i) => logMessage(`NodeStore ${i} hop routes: ${hop}`));
    return routes;
  }

  getAllAccessibleNodeIds() {
    return this.getRoutes().reduce((total, curr) => {
      return [... new Set([...total, ...curr])];
    }, []);
  }

  prune() {
    // failed nodes timed out while connecting or broke link after connection
    const failedNodes = this.nodes.filter( node => !node.pending && !node.isConnected() );

    failedNodes.map((node) => node.terminate());

    this.nodes = this.nodes.filter((node) => !failedNodes.includes(node));

    this.pruneExtraNeighbors();
  }

  pruneExtraNeighbors() {
    while(NodeStore.getConnectedNodeIds().length > config.maxConnectedNeighbors) {
      const sortedNeighbors = sortNeighbors(Profile.getNodeID(), NodeStore.getConnectedNodeIds());
      const trashNeighbor = sortedNeighbors[sortedNeighbors.length-1];
      const rank = idDistance(Profile.getNodeID(), trashNeighbor);

      logMessage(`NodeStore Too many neighbors: dropping ${trashNeighbor} rank: ${rank}`);
      sortedNeighbors.map(n => {
        logMessage(`NodeStore -- Neighbor ${n} rank: ${ idDistance(Profile.getNodeID(), n)}`);
      })

      this.deleteNodesById(trashNeighbor);
    }
  }
}

const NodeStore = new _NodeStore();

export default NodeStore;
