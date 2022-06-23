import uuidv4 from "../utils/uuid.js";
import NodeStore from "./nodeStore.js";

class _Profile {
  #nodeId
  #sessionStart

  constructor() {
    this.#nodeId = null;

    // each browser instance gets a unique ID
    this.#nodeId = uuidv4();
    this.#sessionStart = new Date();
  }

  getNodeID() {
    return this.#nodeId;
  }

  getShareable() {
    const routes = NodeStore.getRoutes();

    return {
      nodeId: this.#nodeId,
      routes,
      sessionStart: this.#sessionStart,
      updated: Date.now()
    }
  }

}

const Profile = new _Profile();
export default Profile;
