import NodeStore from "../../riverNetwork/nodeStore.js";
import Profile from "../../riverNetwork/profile.js";
import {idDistance} from "../../riverNetwork/utils/routing.js";

class _VillageStateCard {
  #nodeStateListEl
  #livePeersCountEl
  #nodeIdEl

  constructor() {
    const villageStateContainer = document.getElementById('villageStateContainer');
    villageStateContainer.innerHTML = villageStateHtml;

    this.#nodeStateListEl = document.getElementById('nodeStateList');
    this.#livePeersCountEl = document.getElementById('livePeersCount');
    this.#nodeIdEl = document.getElementById('nodeId');

    this.refresh();
  }

  refresh() {
    const nodes = NodeStore.getNodes();

    while (this.#nodeStateListEl.firstChild) {
      this.#nodeStateListEl.removeChild(this.#nodeStateListEl.firstChild);
    }

    if(!nodes.length) {
      this.#nodeStateListEl.innerText = "No nodes connected.";
    }

    nodes.map(async (node) => {
      const rank = idDistance(Profile.getNodeID(), node.getProfile().nodeId);

      this.#nodeStateListEl.appendChild(this.createNodeStateDiv(node, rank));
    })

    this.#livePeersCountEl.innerText = `${nodes.filter((node) => node.getConnectionState() === 'connected').length} / ${nodes.length}`;

    this.#nodeIdEl.innerText = `${Profile.getNodeID()}`;
  }

  createNodeStateDiv(node, rank){
    const nodeDiv = document.createElement('div');
    nodeDiv.className = "card mb-1";

    const nodeNameDiv = document.createElement('div');
    nodeNameDiv.className = "card-header-title";
    nodeNameDiv.innerText = node.getProfile().nodeId;

    const rankDiv = document.createElement('div');
    rankDiv.className = "card-content py-0";
    rankDiv.innerText = `Rank: ${rank}`;

    const iceDiv = document.createElement('div');
    iceDiv.className = "card-content py-0";
    iceDiv.innerText = `ICE state: ${node.getIceConnectionState()}`;

    const connDiv = document.createElement('div');
    connDiv.className = "card-content py-0";
    connDiv.innerText =  `Connection state: ${node.getConnectionState()}`;

    const candidateTypeDiv = document.createElement('div');
    candidateTypeDiv.className = "card-content py-0";
    candidateTypeDiv.innerText =  `Connection type: ${node.getCandidateType() === null ? 'Unknown' : node.getCandidateType()}`;

    const signalProtocolDiv = document.createElement('div');
    signalProtocolDiv.className = "card-content pt-0";
    signalProtocolDiv.innerText =  `Signaling Protocol: ${node.getSignalProtocol()}`;

    nodeDiv.appendChild(nodeNameDiv);
    nodeDiv.appendChild(rankDiv);
    nodeDiv.appendChild(iceDiv);
    nodeDiv.appendChild(connDiv);
    nodeDiv.appendChild(candidateTypeDiv);
    nodeDiv.appendChild(signalProtocolDiv);

    return nodeDiv;
  }

}

const villageStateHtml = `
<div id="villageState">
    <p class="title">Neighbors</p>
    <div class="subtitle" id="nodeId"></div>
    <div class="subtitle"> 
        Connections: <span id="livePeersCount"></span>
    </div>
   
    <div id="nodeStateList" class="is-flex is-flex-direction-column"></div>
    <br />
</divi>
`

export default _VillageStateCard;
