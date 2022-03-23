
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
    //TODO: make sure the line below is a NOOP since we should never re-add the same node prior to destruction
    this.nodes = this.nodes.filter( (n) => n.profile.nodeId !== node.id );
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
    if(node) {
      node.terminate();
    }
    this.nodes = this.nodes.filter((node) => node.profile.nodeId !== nodeId);
  }

  prune() {
    this.nodes = this.nodes.filter(
      (node) =>
        node.pc.iceConnectionState !== 'failed' &&
        node.pc.connectionState !== 'failed'
    )
  }
}

const NodeStore = new _NodeStore();

export default NodeStore;
