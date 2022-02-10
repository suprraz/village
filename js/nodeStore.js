
class _NodeStore {
  constructor() {
    this.nodes = [];
  }

  getNodeCount() {
    return this.nodes.length;
  }

  broadcast(msg) {
    this.nodes.map((node) => node.send(msg));
  }

  addNode(node) {
    this.nodes.push(node);
  }
}

const NodeStore = new _NodeStore();

export default NodeStore;