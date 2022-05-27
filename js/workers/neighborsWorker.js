import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";
import config from "../config.js";
import {getSwapCandidate, sortNeighbors} from "../utils/routing.js";

class _NeighborsWorker {
  constructor() {
    this.waiting = [];

    this.sendPeriodicUpdates();
  }

  sendPeriodicUpdates() {
    const neighborList = NodeStore.getConnectedNodeIds();
    logMessage(`NeighborsWorker Sending routing update`);

    neighborList.map((neighborId) => {
      const neighbor = NodeStore.getNodeById(neighborId);
      neighbor.send({routes : NodeStore.getRoutes()});
    })

    setTimeout(() => {
      this.sendPeriodicUpdates();
    }, config.routingTableUpdateFrequency)
  }

  enqueue(routes) {
    const neighbors = routes.reduce((total, curr) => {
      return [... new Set([...total, ...curr])];
    }, []);
    logMessage(`NeighborsWorker Neighbor list received: ${neighbors}`);

    const newNeighbors = neighbors.filter((nodeId) =>
      !!nodeId &&
      !this.waiting.find((n) => n === nodeId) &&
      !NodeStore.getNodeById(nodeId) &&
      nodeId !== Profile.getNodeID()
    );

    logMessage(`NeighborsWorker Queueing neighbors: ${newNeighbors}`);

    if(newNeighbors.length) {
      const newWaiting = [... new Set([...this.waiting, ...newNeighbors])]
      this.waiting = sortNeighbors(Profile.getNodeID(),newWaiting);
      this.process();
    }
  }

  process() {
    if(!this.waiting.length || NodeStore.getNodesPending() > 0) {
      return;
    }

    if(NodeStore.getConnectedNodeIds().length < config.maxConnectedNeighbors) {
      const candidateId = this.waiting.pop();
      if(candidateId) {
        this.waiting = this.waiting.filter(id => id !== candidateId);
        logMessage(`NeighborsWorker Processing candidate: ${candidateId}`);

        this.requestConnection(candidateId);
      }
    } else {
      this.swapNeighbors();
    }
  }

  swapNeighbors() {
    const fromId = Profile.getNodeID();
    const swapCandidate = getSwapCandidate(fromId, NodeStore.getConnectedNodeIds(), this.waiting);

    if(swapCandidate) {
      logMessage(`NeighborsWorker Swapping ${swapCandidate.oldId} to ${swapCandidate.toId}`);

      this.waiting = this.waiting.filter(id => id !== swapCandidate.toId);
      this.requestConnection(swapCandidate.toId);
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
    logMessage(`NeighborsWorker Neighboring attempt complete ${neighborId}`);
    this.waiting = this.waiting.filter( p => p !== neighborId);

    this.process();
  }

  sendCandidate(toId, candidate) {
    logMessage(`NeighborsWorker Sending ice candidate to ${toId}`);

    const node = NodeStore.getNextHopNode(toId);
    if(node) {
      node.send({
        candidate,
        destinationId: toId
      });
    }
  }

  onCandidate(fromId, candidate) {
    logMessage(`NeighborsWorker Ice candidate received from ${fromId}`);
    try {
      const node = NodeStore.getNodeById(fromId);
      if(node) {
        logMessage(`NeighborsWorker adding ice candidate`);
        node.addIceCandidate(candidate);
      } else {
        logError(`NeighborsWorker Error adding ice candidate: Node not found ${fromId}`);
      }
    } catch (e) {
      logError(`NeighborsWorker Error adding ice candidate ${e}`);
    }
  }

  async requestConnection(destinationId) {
    const nextHopNode = NodeStore.getNextHopNode(destinationId);
    if(!nextHopNode) {
      logMessage(`NeighborsWorker No route available to: ${destinationId}`);
      this.complete(destinationId);
      return; // no route to destination
    }

    const existingNode = NodeStore.getNodeById(destinationId);
    if( existingNode && (existingNode.isConnected() || existingNode.pending)) {
      logMessage(`NeighborsWorker Duplicate node on request conneciton: ${destinationId}`);
      this.complete(destinationId);
      return;
    }

    try {
      logMessage(`NeighborsWorker Requesting connection to ${destinationId}`);

      const offerNode = new _Node({
        nodeId: destinationId,
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
        sendCandidate: (candidate) => {
          if(NodeStore.getNodeById(destinationId) === offerNode) {
            this.sendCandidate(destinationId, candidate)
          }
        }
      });

      const offerKey = await offerNode.createOffer();

      if(NodeStore.getNodeById(destinationId)) {
        logMessage(`NeighborsWorker Duplicate Node after create offer: ${destinationId}`);
        this.complete(destinationId);
        offerNode.terminate();
      } else {
        this.sendOfferKey(nextHopNode, destinationId, offerKey);
        NodeStore.addNode(offerNode);
      }
    } catch (e) {
      this.complete(destinationId);
      logError(e);
    }
  }

  sendOfferKey(nextHopNode, destinationId, offerKey) {
    logMessage(`NeighborsWorker Sending offer to: ${destinationId} via ${nextHopNode?.profile?.nodeId}`);
    nextHopNode.send({
      destinationId,
      senderId: Profile.getNodeID(),
      offer: {
        offerKey,
      }});
  }

  async acceptOffer(offer, senderId, senderNode) {
    const existingNode = NodeStore.getNodeById(senderId);
    if( existingNode ) {
      this.complete(senderId);
      logMessage("NeighborsWorker Connection already initiated by other side")
      return;
    }

    if(NodeStore.getNodes().length >= config.maxConnectedNeighbors) {
      return;
    }

    const {offerKey} = offer;
    try {
      const node = new _Node({
        nodeId: senderId,
        onConnection: (node) => MessageRouter.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
        sendCandidate: (candidate) => {
            if(NodeStore.getNodeById(senderId) === node) {
              this.sendCandidate(senderId, candidate);
            }
          }
      });

      const answerKey = await node.acceptOffer(offerKey);

      if(NodeStore.getNodeById(senderId)) {
        node.terminate();
        this.complete(senderId);
        logMessage("NeighborsWorker Connection already initiated by other side")
        return;
      }

      NodeStore.addNode(node);

      logMessage(`NeighborsWorker Sending answer to: ${senderId} via ${senderNode?.profile?.nodeId}`);
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
      logMessage(`NeighborsWorker Accepting answer from: ${senderId} via ${senderNode?.profile?.nodeId}`);
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
