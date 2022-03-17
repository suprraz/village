import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";

class _NeighborsWorker {

  onNode(node) {
    const desiredNeighborIds = node.profile.neighborList.filter(
      (neighborId) => {
        return neighborId !== null &&
          neighborId !== Profile.getNodeID() &&
          !NodeStore.getNodeById(neighborId)
      }
    );

    logMessage(desiredNeighborIds);

    desiredNeighborIds.map(neighborId => this.requestConnection(node, neighborId))
  }

  async requestConnection(nextHopNode, destinationId) {
    try {
      this.connectingNode = new _Node({
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => MessageRouter.onMessage(data, node),
      });

      const offerKey = await this.connectingNode.createOffer();

      this.sendOfferKey(nextHopNode, destinationId, offerKey);

      NodeStore.addNode(this.connectingNode);
    } catch (e) {
      logMessage(e);
    }
  }

  sendOfferKey(nextHopNode, destinationId, offerKey) {
    nextHopNode.send({
      destinationId,
      senderId: Profile.getNodeID(),
      offer: {
        offerKey,
      }});
  }

  async acceptOffer(offer, senderId, senderNode) {
    const {offerKey} = offer;
    try {
      const node = new _Node({
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => MessageRouter.onMessage(data, node),
      });
      NodeStore.addNode(node);

      const answerKey = await node.acceptOffer(offerKey);

      senderNode.send({answer: {
          answerKey
        },
        destinationId: senderId
      });

    } catch (e) {
      throw new Error(e);
    }
  }

  acceptAnswer(answer, senderId, senderNode) {
    try {
      const connectionObj = JSON.parse(atob(answer.answerKey));

      senderNode.setRemoteDescription(connectionObj);
    } catch(e) {
      logError(e);
    }
  }
}

export default _NeighborsWorker;
