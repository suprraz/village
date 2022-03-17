const NodeStore = require("../store/nodeStore.js");
const {logMessage} = require("../utils/logger.js");
const Profile = require("../store/profile.js");
const _Node = require("../node.js");
const MessageRouter = require("../messageRouter");


class _AddNeighbors {

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
}
