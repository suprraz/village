import NodeStore from "../../riverNetwork/nodeStore.js";
import {logMessage} from "../../utils/logger.js";

class _ChatCard {
  #chatLog
  #chatLogEl

  constructor() {
    this.#chatLog = [`${this.timeStamp()} Entered chat`];

    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = chatHtml;

    this.#chatLogEl = document.getElementById('chatLog');

    this.registerListeners();
    this.updateChat();
  }

  timeStamp() {
    return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'});
  }

  messageReceived(senderId, msg) {
    logMessage(`Chat Message received: ${msg}`);
    this.#chatLog.push(`${this.timeStamp()}  Peer-${senderId.substr(0,3)}: ` + msg);
    this.updateChat();
  }

  broadcast(msg) {
    const allNodeIds = NodeStore.getAllAccessibleNodeIds();
    logMessage(`Chat Sending message to: ${allNodeIds}`);


    allNodeIds.map((nodeId) => {
      const nextHopNode = NodeStore.getNextHopNode(nodeId);
      if(!nextHopNode) {
        logMessage(`Chat No route available to: ${nodeId}`);
        return; // no route to destination
      }

      nextHopNode.send({
        destinationId: nodeId,
        type: 'app',
        app: 'chat',
        msg
      });
    })
  }

  sendChatMsg() {
    const msg = document.getElementById('chatBoxMessage').value;
    this.broadcast(msg);

    this.#chatLog.push(`${this.timeStamp()}  Me: ${msg}`);
    this.updateChat();
    document.getElementById('chatBoxMessage').value = '';
  }

  updateChat() {
    const shouldScroll = this.#chatLogEl.scrollTop >= this.#chatLogEl.scrollHeight - this.#chatLogEl.offsetHeight;
    this.#chatLogEl.innerText = this.#chatLog.join('\n');

    if(shouldScroll) {
      this.#chatLogEl.scrollTop = this.#chatLogEl.scrollHeight;
    }
  }

  registerListeners() {
    document.getElementById("chatBoxMessage").addEventListener("keyup", (event) => {
      if (event.keyCode === 13) {
        event.preventDefault();
        this.sendChatMsg();
      }
    });
  }
}

const chatHtml = `
<div id="chatApp">
    <p class="title">Village chat</p>
    <div class="box chatBox" id="chatLog"></div>

    <input class="input my-2" type="text" id="chatBoxMessage">
    <figure class="image is-16by9 mt-5">
        <img src="https://www.omnihotels.com/-/media/images/hotels/sandtn/destinations/sandtn-seaport-village.jpg?h=663&la=en&w=1170">
    </figure>
</div>
`

export default _ChatCard;
