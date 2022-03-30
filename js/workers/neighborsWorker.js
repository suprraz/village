import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";

class _NeighborsWorker {
  //todo: figure out what race condition is causing this process to fail intermittently
  //when all 3 neighbors reload concurrently the fresh state has a higher success rate

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

  onMessage(e, node) {
    if (e.data) {
      try {
        const data = JSON.parse(e.data);

        MessageRouter.onMessage(data, node);
      } catch (e) {
        logError(e);
      }
    }
  }

  async requestConnection(nextHopNode, destinationId) {
    try {
      logMessage(`Requesting connection to ${destinationId}`);
      NodeStore.deleteNode(destinationId); // prune any lingering node with same id

      const offerNode = new _Node({
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });
      offerNode.setNodeId(destinationId);

      const offerKey = await offerNode.createOffer();



      this.sendOfferKey(nextHopNode, destinationId, offerKey);
      NodeStore.addNode(offerNode);
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
      NodeStore.deleteNode(senderId); // prune any lingering node with same id

      const node = new _Node({
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });
      node.setNodeId(senderId);

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

      const offerNode = NodeStore.getNodeById(senderId);
      if(offerNode) {
        offerNode.setRemoteDescription(connectionObj);
      }
    } catch(e) {
      logError(e);
    }
  }
}

export default _NeighborsWorker;
