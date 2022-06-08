import _Node from "../../riverNetwork/node.js";
import NodeStore from "../../riverNetwork/nodeStore.js";
import {logError, logMessage} from "../../utils/logger.js";
import {show, hide} from "../../os/utils/dom.js";
import Profile from "../../riverNetwork/profile.js";
import MessageRouter from "../../messageRouter.js";

class _AddPeerCard {
  constructor() {
    this.parentOnConnection = (node) => MessageRouter.onConnection(node);
    this.parentOnMessage = (data, node) => MessageRouter.onMessage(data, node);
    this.connectingNode = null;
  }

  run() {
    const appContainer = document.getElementById('appContainer');
    appContainer.innerHTML = addPeerHtml;

    this.addPeerEl = document.getElementById('addPeer');

    const offerKey = this.getOfferKey(window.location.href);

    if(offerKey) {
      this.offerRoute(offerKey);
    }

    this.registerListeners();
  }

  stop() {
    window.history.pushState({}, null, window.location.origin + window.location.pathname);
    if(!!this.addPeerEl) {
      while (this.addPeerEl.firstChild) {
        this.addPeerEl.removeChild(this.addPeerEl.firstChild);
      }
    }
  }

  getOfferKey(url) {
    const urlParams = new URLSearchParams((new URL(url)).search);
    if(urlParams.has('offerKey')) {
      const offerKey = urlParams.get('offerKey');
      return offerKey;
    }
    return null;
  }

  sendProfile(node) {
    const shareableProfile = {
      type: 'routing',
      subtype: 'profile-update',
      profile: Profile.getShareable()
    };
    node.send(shareableProfile);
  }

  onProfileReceived(profile, node) {
    node.setProfile(profile);

    logMessage(node.profile);

    const desiredNeighborIds = node.profile.routes[0].filter(
      (neighborId) => {
        return neighborId !== null &&
          neighborId !== Profile.getNodeID() &&
          !NodeStore.getNodeById(neighborId)
      }
    );

    logMessage(desiredNeighborIds);

    desiredNeighborIds.map(neighborId => this.requestConnection(node, neighborId))

  }

  sendOfferKey(nextHopNode, destinationId, offerKey) {
    nextHopNode.send({
      destinationId,
      senderId: Profile.getNodeID(),
      offer: {
        offerKey,
      }});
  }

  getOfferUrl(offerKey) {
    const offerUrl = new URL(window.location.href);
    offerUrl.searchParams.set('offerKey', offerKey);

    return offerUrl;
  }

  async requestConnection(nextHopNode, destinationId) {
    try {
      this.connectingNode = new _Node({
        onConnection: (node) => this.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });

      const offerKey = await this.connectingNode.createOffer();

      this.sendOfferKey(nextHopNode, destinationId, offerKey);

      NodeStore.addNode(this.connectingNode);
    } catch (e) {
      logMessage(e);
    }

  }

  async acceptOffer(offer, senderId, senderNode) {
    const {offerKey} = offer;
    try {
      const node = new _Node({
        onConnection: (node) => this.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
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

      this.connectingNode.setRemoteDescription(connectionObj);
    } catch(e) {
      logError(e);
    }
  }

  onMessage(e, senderNode) {
    if(e.data) {
      try {
        const data = JSON.parse(e.data);

        const {destinationId, senderId, profile, offer, answer} = data;

        if(destinationId !== null && destinationId !== Profile.getNodeID()) {
          // forward message
          const nextHopNode = NodeStore.getNextHopNode(destinationId)
          if(nextHopNode) {
            nextHopNode.send(data);
          } else {
            logMessage(`Route not found for ${destinationId}.`)
          }
        } else if (profile) {
          this.onProfileReceived(profile, senderNode);
        } else if (offer && senderId) {
          logMessage('accepting automated offer')
          this.acceptOffer(offer, senderId, senderNode);
        } else if (answer && senderId) {
          logMessage('accepting automated answer')
          this.acceptAnswer(answer, senderId, senderNode);
        } else {
          this.parentOnMessage(data, senderNode);
        }
      } catch (e) {}
    }
  }

  onConnection(node) {
    hide('offerCard');
    hide('answerCard');

    this.sendProfile(node);

    this.parentOnConnection(node);
  }

  async preparePeer() {
    try {
      this.connectingNode = new _Node({
        onConnection: (node) => this.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });
      NodeStore.addNode(this.connectingNode);
      const offerKey = await this.connectingNode.createOffer();
      const offerUrl = this.getOfferUrl(offerKey);

      this.onOfferUrl(offerUrl);
    } catch (e) {
      logMessage(e);
    }
  }


  async offerRoute(offerKey) {
    hide('offerCard');
    show('answerCard');

    try {
      const node = new _Node({
        onConnection: (node) => this.onConnection(node),
        onMessage: (data, node) => this.onMessage(data, node),
      });
      NodeStore.addNode(node);
      const answerKey = await node.acceptOffer(offerKey);

      document.getElementById('answer').innerText = answerKey;

    } catch (e) {
      throw new Error(e);
    }
  }

  onOfferUrl(offerUrl) {
    document.getElementById('offer').innerText = offerUrl;
    document.getElementById('peerKey').innerText = '';
  }

  peerKeyEntered(event) {
    const pasteContent = (event.clipboardData || window.clipboardData).getData('text');
    document.getElementById('submitKey').disabled=false;
    this.setRemote(pasteContent);
  }

  setRemote(pasteContent) {
    logMessage("Setting remote");

    let connectionString = document.getElementById('peerKey').value;

    if(pasteContent) {
      connectionString = pasteContent;
    }

    let connectionObj = {};

    try{
      connectionObj = JSON.parse(atob(connectionString));
    } catch (e) {
      logMessage("<span class=\"error\"> Bad connection string </span> ");
      return;
    }

    this.connectingNode.setRemoteDescription(connectionObj);
  }


  offerClicked() {
    if(navigator.clipboard) {
      navigator.clipboard.writeText(document.getElementById('offer').innerText);
      show('copiedOfferNotification');
    }

    show('peerKeyPrompt');
  }

  answerClicked() {
    if(navigator.clipboard) {
      navigator.clipboard.writeText(document.getElementById('answer').innerText);
      show('copiedAnswerNotification');
    }
    show('waitToConnect');
  }


  registerListeners() {
    document.getElementById('offer').addEventListener('mousedown', () => this.offerClicked());
    document.getElementById('answer').addEventListener('mousedown', () => this.answerClicked());
    document.getElementById('peerKey').addEventListener('paste', (e) => this.peerKeyEntered(e));
    document.getElementById('submitKey').addEventListener('click', () => this.setRemote());
  }
}


const addPeerHtml = `
<div id="addPeer">
    <div class="card" id="offerCard">
        <div class="card-content">
            <p class="title">
                Invite Peers!
            </p>

            <p class="subtitle is-size-4">
                Share this link to invite a peer:
            </p>
            <section class="section">
                <div class="container">
                    <div class="" id="offer">
                        Generating link ...
                    </div>
                </div>

                <br />
                <div id="copiedOfferNotification" class="notification is-primary is-hidden">
                    Copied to clipboard!
                </div>
            </section>

            <div class="container is-hidden" id="peerKeyPrompt">
                <p class="title is-size-4">
                    Next, paste the peer's response key below:
                </p>

                <textarea class="textarea" id="peerKey" >

                </textarea>
            </div>
        </div>
        <footer class="card-footer">
            <p class="card-footer-item">
                <button class="button is-primary" id="submitKey" disabled>Submit Key</button>
            </p>
        </footer>
    </div>

    <div class="card is-hidden" id="answerCard">
        <div class="card-content">
            <p class="title">
                Almost there!
            </p>

            <p class="subtitle is-size-4">
                To accept, send this back to the person that invited you:
            </p>
            <section class="section">
                <div class="container">
                    <div class="is-clipped" id="answer">
                        Generating a response ...
                    </div>
                </div>

                <br />
                <div id="copiedAnswerNotification" class="notification is-primary is-hidden">
                    Copied to clipboard!
                </div>

                <div class="container is-hidden" id="waitToConnect">
                    <p class="title is-size-4">
                        Once the host accepts you will be connected.
                    </p>
                </div>
            </section>

        </div>
    </div>
</div>
`;

export default _AddPeerCard;
