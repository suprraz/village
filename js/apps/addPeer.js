import _Node from "../node.js";
import NodeStore from "../nodeStore.js";
import {logMessage} from "../logger.js";
import {show, hide} from "../domUtils.js";


class _AddPeer {
  constructor(onConnection, onMessage) {
    this.onConnection = onConnection;
    this.onMessage = onMessage;
    this.connectingNode = null;
  }

  run() {
    const appContainer = document.getElementById('appContainer');
    appContainer.innerHTML = addPeerHtml;

    this.addPeerEl = document.getElementById('addPeer');

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('offerKey')) {
      const offerKey = urlParams.get('offerKey');
      this.offerRoute(offerKey);
    }

    this.registerListeners();
  }

  stop() {
    while (this.addPeerEl.firstChild) {
      this.addPeerEl.removeChild(this.addPeerEl.firstChild);
    }
  }

  morePeers() {
    alert('more peers!');
  }

  preparePeer() {
    const node = new _Node({
      onConnection: () => this.onConnection(),
      onMessage: (e) => this.onMessage(e),
      onOfferUrl: (url) => this.onOfferUrl(url),
    });
    try {
      node.createOffer();
      NodeStore.addNode(node);
      this.connectingNode = node;
    } catch (e) {
      logMessage(e);
    }
  }


  offerRoute(offerKey) {
    hide('offerCard');
    show('answerCard');

    const node = new _Node({
      onConnection: () => this.onConnection(),
      onMessage: (e) => this.onMessage(e),
      onOfferUrl: () => (url) => this.onOfferUrl(url),
    });
    try {
      node.acceptOffer(offerKey);
      NodeStore.addNode(node);
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
    logMessage("<b>Setting remote</b>");

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
                No Peers!
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

export default _AddPeer;
