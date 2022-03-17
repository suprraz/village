import uuidv4 from "../utils/uuid.js";
import NodeStore from "./nodeStore.js";

class _Profile {
  constructor() {
    this.nodeId = null;
    const storedNodeId = localStorage.getItem('nodeId');

    if(!storedNodeId) {
      this.nodeId = uuidv4();
      localStorage.setItem('nodeId', this.nodeId);
    } else {
      this.nodeId = storedNodeId;
    }
  }

  getNodeID() {
    return this.nodeId;
  }

  getShareable() {
    return {
      nodeId: this.nodeId,
      neighborList: NodeStore.getNodes().map(node => node.profile.nodeId)
    }
  }

}

const Profile = new _Profile();
export default Profile;
