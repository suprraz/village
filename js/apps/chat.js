import NodeStore from "../store/nodeStore.js";


class _Chat {
  constructor() {
    this.chatLog = [];

    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = chatHtml;

    this.chatAppEl = document.getElementById('chatApp');

    this.registerListeners();
  }

  messageReceived(data) {
    this.chatLog.push(`Peer-${data.senderId.substr(0,3)}:` + data.msg);
    this.updateChat();
  }

  sendChatMsg() {
    const msg = document.getElementById('chatBoxMessage').value;
    NodeStore.broadcast({msg});

    this.chatLog.push('Me: ' + msg);
    this.updateChat();
    document.getElementById('chatBoxMessage').value = '';
  }

  updateChat() {
    document.getElementById('chatLog').innerText = this.chatLog.join('\n');
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
    <p class="title">Chat</p>
    <div class="content" id="chatLog"></div>

    <input class="input my-2" type="text" id="chatBoxMessage">
    <figure class="image is-4by3">
        <img src="https://bulma.io/images/placeholders/640x480.png">
    </figure>
</div>
`

export default _Chat;
