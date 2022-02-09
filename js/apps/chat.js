import NodeStore from "../nodeStore.js";


class _Chat {
  constructor() {
    this.chatLog = [];

    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = chatHtml;

    this.chatAppEl = document.getElementById('chatApp');

    this.registerListeners();
  }

  messageReceived(msg) {
    this.chatLog.push('Them: ' + msg);
    this.updateChat();
  }

  sendMessage() {
    const msg = document.getElementById('chatBoxMessage').value;
    NodeStore.broadcast(JSON.stringify({msg}));

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
        this.sendMessage();
      }
    });
  }

}

const chatHtml = `
<div id="chatApp">
    <p class="title">Chat</p>
    <div class="content" id="chatLog">
    </div>


    <input type="text" id="chatBoxMessage">
    <figure class="image is-4by3">
        <img src="https://bulma.io/images/placeholders/640x480.png">
    </figure>
</div>
`

export default _Chat;
