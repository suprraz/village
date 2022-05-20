import uuidv4 from "../utils/uuid.js";
import NodeStore from "./nodeStore.js";

class _Profile {
  constructor() {
    this.nodeId = null;

    // each browser instance gets a unique ID
    this.nodeId = uuidv4();
    this.sessionStart = new Date();
  }

  getNodeID() {
    return this.nodeId;
  }

  getShareable() {
    const neighborList = NodeStore.getNeighborList();

    return {
      nodeId: this.nodeId,
      neighborList,
      sessionStart: this.sessionStart,
    }
  }

}

const Profile = new _Profile();
export default Profile;
