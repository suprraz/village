import {logMessage} from "../utils/logger.js";

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

    return this.nodes.find( node =>  node.profile.neighborList.find(neighborId => neighborId === destinationId));
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

  prune() {
    // failed nodes timed out while connecting or broke link after connection
    const failedNodes = this.nodes.filter( node => this.isDisconnected(node) );

    failedNodes.map((node) => node.terminate());

    this.nodes = this.nodes.filter((node) => !failedNodes.includes(node));
  }
}

const NodeStore = new _NodeStore();

export default NodeStore;
