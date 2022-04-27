import uuidv4 from "../utils/uuid.js";
import NodeStore from "./nodeStore.js";

class _Profile {
  constructor() {
    this.nodeId = null;

    // each browser instance gets a unique ID
    this.nodeId = uuidv4();
  }

  getNodeID() {
    return this.nodeId;
  }

  getShareable() {
    let neighborList =  NodeStore.getNodes()
      .filter((node) => !!node.profile.nodeId && node.pc.connectionState === 'connected')
      .map(node => node.profile.nodeId);

    neighborList = [...new Set(neighborList)];
    return {
      nodeId: this.nodeId,
      neighborList,
    }
  }

}

const Profile = new _Profile();
export default Profile;
