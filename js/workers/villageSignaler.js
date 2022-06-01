import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import MessageRouter from "../messageRouter.js";
import {logError, logMessage} from "../utils/logger.js";
import _Node from "../node.js";
import config from "../config.js";

class _VillageSignaler {

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

  onComplete(destinationId) {
    MessageRouter.coreApps.RouteBalancer.routeComplete(destinationId);
  }

  sendCandidate(toId, candidate) {
    logMessage(`VillageSignaler Sending ice candidate to ${toId}`);

    const node = NodeStore.getNextHopNode(toId);
    if(node) {
      node.send({
        type: 'routing',
        subtype: 'ice-candidate',
        candidate,
        destinationId: toId
      });
    }
  }

  onCandidate(fromId, candidate) {
    logMessage(`VillageSignaler Ice candidate received from ${fromId}`);
    try {
      const node = NodeStore.getNodeById(fromId);
      if(node) {
        logMessage(`VillageSignaler adding ice candidate`);
        node.addIceCandidate(candidate);
      } else {
        logError(`VillageSignaler Error adding ice candidate: Node not found ${fromId}`);
      }
    } catch (e) {
      logError(`VillageSignaler Error adding ice candidate ${e}`);
    }
  }

  requestConnection(destinationId) {
    const nextHopNode = NodeStore.getNextHopNode(destinationId);
    if(!nextHopNode) {
      logMessage(`VillageSignaler No route available to: ${destinationId}`);
      this.onComplete(destinationId);
      return; // no route to destination
    }

    logMessage(`VillageSignaler Sending connection request to: ${destinationId} via ${nextHopNode?.profile?.nodeId}`);
    nextHopNode.send({
      type: 'routing',
      subtype: 'request-connection',
      destinationId,
      senderId: Profile.getNodeID()
    });
  }

  acceptConnection(fromId) {
    const nextHopNode = NodeStore.getNextHopNode(fromId);
    if(!nextHopNode) {
      logMessage(`VillageSignaler No route available to: ${fromId}`);
      this.onComplete(fromId);
      return; // no route to destination
    }

    nextHopNode.send({
      type: 'routing',
      subtype: 'accept-connection',
      destinationId: fromId,
      senderId: Profile.getNodeID()
    });
  }

  rejectConnection(fromId) {
    const nextHopNode = NodeStore.getNextHopNode(fromId);
    if(!nextHopNode) {
      logMessage(`VillageSignaler No route available to: ${fromId}`);
      this.onComplete(fromId);
      return; // no route to destination
    }

    nextHopNode.send({
      type: 'routing',
      subtype: 'reject-connection-busy',
      destinationId: fromId,
      senderId: Profile.getNodeID()
    });
  }

  async createOffer(destinationId) {
    const nextHopNode = NodeStore.getNextHopNode(destinationId);
    if(!nextHopNode) {
      logMessage(`VillageSignaler No route available to: ${destinationId}`);
      this.onComplete(destinationId);
      return; // no route to destination
    }

    const existingNode = NodeStore.getNodeById(destinationId);
    if( existingNode && (existingNode.isConnected() || existingNode.pending)) {
      logMessage(`VillageSignaler Duplicate node on request conneciton: ${destinationId}`);
      this.onComplete(destinationId);
      return;
    }

    try {
      logMessage(`VillageSignaler Creating offer for ${destinationId}`);

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
        logMessage(`VillageSignaler Duplicate Node after create offer: ${destinationId}`);
        this.onComplete(destinationId);
        offerNode.terminate();
      } else {
        this.sendOfferKey(nextHopNode, destinationId, offerKey);
        NodeStore.addNode(offerNode);
      }
    } catch (e) {
      this.onComplete(destinationId);
      logError(e);
    }
  }

  sendOfferKey(nextHopNode, destinationId, offerKey) {
    logMessage(`VillageSignaler Sending offer to: ${destinationId} via ${nextHopNode?.profile?.nodeId}`);
    nextHopNode.send({
      type: 'routing',
      subtype: 'offer',
      destinationId,
      senderId: Profile.getNodeID(),
      offer: {
        offerKey,
      }});
  }

  async acceptOffer(offer, senderId, senderNode) {
    const existingNode = NodeStore.getNodeById(senderId);
    if( existingNode ) {
      this.onComplete(senderId);
      logMessage("VillageSignaler Connection already initiated by other side")
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
        this.onComplete(senderId);
        logMessage("VillageSignaler Connection already initiated by other side")
        return;
      }

      NodeStore.addNode(node);

      logMessage(`VillageSignaler Sending answer to: ${senderId} via ${senderNode?.profile?.nodeId}`);
      senderNode.send({
        type: 'routing',
        subtype: 'answer',
        answer: {
          answerKey
        },
        destinationId: senderId
      });

      this.onComplete(senderId);
    } catch (e) {
      this.onComplete(senderId);
      throw new Error(e);
    }
  }

  acceptAnswer(answer, senderId, senderNode) {
    try {
      logMessage(`VillageSignaler Accepting answer from: ${senderId} via ${senderNode?.profile?.nodeId}`);
      const connectionObj = JSON.parse(atob(answer.answerKey));

      const offerNode = NodeStore.getNodeById(senderId);
      if(offerNode) {
        offerNode.setRemoteDescription(connectionObj);
      }
      this.onComplete(senderId);
    } catch(e) {
      this.onComplete(senderId);
      logError(e);
    }
  }
}

export default _VillageSignaler;
