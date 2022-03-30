
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
  }

  getNodes() {
    return this.nodes;
  }

  getNextHopNode(destinationId) {
    //todo: search node.profile.neighbors[] list also
    return this.nodes.find((node) => node.profile.nodeId === destinationId);
  }

  deleteNode(nodeId) {
    const node = this.getNodeById(nodeId);
    if(node && !node.pending) {
      node.terminate();
      this.nodes = this.nodes.filter((n) => n !== node);
    }
  }

  prune() {
    // failed nodes timed out while connecting or broke link after connection
    const failedNodes = this.nodes.filter(
      (node) =>
        ['failed', 'disconnected', 'closed'].includes(node.pc.connectionState) ||
        (!node.pending && (node.pc.connectionState !== 'connected'))
    );

    failedNodes.map((node) => node.terminate());

    this.nodes = this.nodes.filter((node) => !failedNodes.includes(node));
  }
}

const NodeStore = new _NodeStore();

export default NodeStore;
