import Profile from "./store/profile.js";
import NodeStore from "./store/nodeStore.js";
import {logError, logMessage} from "./utils/logger.js";

class _MessageRouter {

  init (coreApps, onConnection) {
    this.coreApps = coreApps;
    this.callerOnConnection = (node) => onConnection(node);
  }

  onMessage (data, node) {

    const {msg, code, apps, destinationId, senderId, profile, offer, answer} = data;

    if(destinationId !== null && destinationId !== Profile.getNodeID()) {
      // forward message
      const nextHopNode = NodeStore.getNextHopNode(destinationId);
      if(nextHopNode) {
        nextHopNode.send(data);
      } else {
        logMessage(`Route not found for ${destinationId}.`)
      }
    } else if (msg && senderId) {
      this.coreApps.Chat.messageReceived(senderId, msg);
    } else if (code) {
      this.coreApps.Editor.updateCode(code);
      eval(code);
    } else if (apps) {
      this.coreApps.AppListApp.onAvailableApps(apps);
    } else if (profile) {
      NodeStore.deleteNode(profile.nodeId);
      node.updateProfile(profile);
      this.onNetworkChange();
      this.coreApps.NeighborsWorker.onNode(node);
    } else if (offer && senderId) {
      logMessage('accepting automated offer')
      this.coreApps.NeighborsWorker.acceptOffer(offer, senderId, node);
    } else if (answer && senderId) {
      logMessage('accepting automated answer')
      this.coreApps.NeighborsWorker.acceptAnswer(answer, senderId, node);
    } else {
      logError(`Unhandled message: ${data}`);
    }
  }

  onConnection(node) {
    node.send({profile: Profile.getShareable()});

    this.callerOnConnection(node);
  }

  onNetworkChange() {
    NodeStore.prune();
    this.coreApps.VillageState.refresh();
  }

}

const MessageRouter = new _MessageRouter();

export default MessageRouter;
