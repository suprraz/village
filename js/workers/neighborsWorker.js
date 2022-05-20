import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";
import config from "../config.js";
import {sortNeighbors, idDistance} from "../utils/routing.js";

class _NeighborsWorker {
  constructor() {
    this.waiting = [];
    this.swapping = [];

    this.sendPeriodicUpdates();
  }

  sendPeriodicUpdates() {

    const neighborList = NodeStore.getNeighborList();

    logMessage(`Sending routing update: ${neighborList}`);

    neighborList.map((neighborId) => {
      const neighbor = NodeStore.getNodeById(neighborId);
      neighbor.send({routes : {
        direct: neighborList
      }});
    })

    setTimeout(() => {
      this.sendPeriodicUpdates();
    }, config.routingTableUpdateFrequency)
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
    if(!this.waiting.length || NodeStore.getNodesPending() > 0) {
      return;
    }

    if(NodeStore.getNeighborList().length < config.maxConnectedNeighbors) {
      const candidateId = this.waiting.pop();
      if(candidateId) {
        this.waiting = this.waiting.filter(id => id !== replacement);
        logMessage(`processing : ${candidateId}`);

        this.requestConnection(candidateId);
      }
    } else {
      //conditionally swap one out
      const fromId = Profile.getNodeID();
      const currentSorted = sortNeighbors(fromId, NodeStore.getNeighborList());
      const availableSorted = sortNeighbors(fromId, this.waiting);

      const worstCurrent = currentSorted[currentSorted.length-1];
      const candidateId = availableSorted[0];

      if(idDistance(fromId, candidateId) < idDistance(fromId, worstCurrent)) {
        logMessage(`Swapping ${worstCurrent} to ${candidateId}`);

        this.waiting = this.waiting.filter(id => id !== candidateId);
        this.swapping.push({oldId: worstCurrent, toId: candidateId});
        this.requestConnection(candidateId);
      }
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

    const activeSwap = this.swapping.find((swap) => swap.toId === neighborId);
    if(activeSwap) {
      logMessage(`Swap of ${activeSwap.oldId} to ${activeSwap.toId} completed`)
      NodeStore.deleteNodesById(activeSwap.oldId);
      this.swapping = this.swapping.filter((swap) => swap.oldId !== activeSwap.oldId);
    }

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

    if(NodeStore.getNodes().length >= config.maxConnectedNeighbors) {
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
