import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";

class _NeighborsWorker {
  constructor() {
    this.waiting = [];
  }

  enqueue(neighbors) {
    logMessage(`Neighbor list received: ${neighbors}`);

    const newNeighbors = neighbors.filter((nodeId) =>
      !!nodeId &&
      !this.waiting.find((n) => n === nodeId) &&
      !NodeStore.getNodeById(nodeId) &&
      nodeId !== Profile.getNodeID()
    );

    logMessage(`Queueing neighbors: ${newNeighbors}`);

    if(newNeighbors.length) {
      this.waiting.push(...newNeighbors);
      this.process();
    }
  }

  process() {
    if(NodeStore.getNodesPending() > 0) {
      return;
    }

    const candidateId = this.waiting.pop();
    if(candidateId) {
      logMessage(`processing : ${candidateId}`);

      this.requestConnection(candidateId);
    }
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

  complete(neighborId) {
    logMessage(`complete ${neighborId}`);
    this.waiting = this.waiting.filter( p => p !== neighborId);
    this.process();
  }

  async requestConnection(destinationId) {
    const nextHopNode = NodeStore.getNextHopNode(destinationId);
    if(!nextHopNode) {
      this.complete(destinationId);
      return; // no route to destination
    }

    const existingNode = NodeStore.getNodeById(destinationId);
    if( existingNode && !NodeStore.isDisconnected(existingNode) ) {
      this.complete(destinationId);
      return;
    }

    try {
      logMessage(`Requesting connection to ${destinationId}`);
      NodeStore.deleteNodesById(destinationId); // prune any lingering node with same id

      const offerNode = new _Node({
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });
      offerNode.setNodeId(destinationId);

      const offerKey = await offerNode.createOffer();
      if(NodeStore.getNodeById(destinationId)) {
        this.complete(destinationId);
        logMessage(`Duplicate Node after create offer: ${destinationId}`);
        offerNode.terminate();
      } else {
        this.sendOfferKey(nextHopNode, destinationId, offerKey);
        NodeStore.addNode(offerNode);
      }
    } catch (e) {
      this.complete(destinationId);
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
    const existingNode = NodeStore.getNodeById(senderId);
    if( existingNode && existingNode.pending ) {
      this.complete(senderId);
      logMessage("Connection already initiated by other side")
      return;
    }

    const {offerKey} = offer;
    try {
      NodeStore.deleteNodesById(senderId); // prune any lingering node with same id

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

      this.complete(senderId);
    } catch (e) {
      this.complete(senderId);
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
      this.complete(senderId);
    } catch(e) {
      this.complete(senderId);
      logError(e);
    }
  }
}

export default _NeighborsWorker;
