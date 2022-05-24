import NodeStore from "../store/nodeStore.js";
import Profile from "../store/profile.js";
import {idDistance} from "../utils/routing.js";

class _VillageState {
  constructor() {
    const villageStateContainer = document.getElementById('villageStateContainer');
    villageStateContainer.innerHTML = villageStateHtml;

    this.villageStateEl = document.getElementById('villageState');
    this.nodeStateList = document.getElementById('nodeStateList');
    this.livePeersCount = document.getElementById('livePeersCount');
    this.nodeId = document.getElementById('nodeId');

    this.refresh();
  }

  refresh() {
    const nodes = NodeStore.getNodes();

    if(!nodes.length) {
      this.nodeStateList.innerText = "No nodes connected.";
    } else {
      // remove all children and listeners
      while (this.nodeStateList.firstChild) {
        this.nodeStateList.removeChild(this.nodeStateList.firstChild);
      }
    }

    nodes.map((node) => {
      const rank = idDistance(Profile.getNodeID(), node.profile.nodeId);
      this.nodeStateList.appendChild(this.createNodeStateDiv(node, rank));
    })

    this.livePeersCount.innerText = `${nodes.filter((node) => node.pc.connectionState === 'connected').length} / ${nodes.length}`;

    this.nodeId.innerText = `${Profile.getNodeID()}`;
  }

  createNodeStateDiv(node, rank){
    const nodeDiv = document.createElement('div');
    nodeDiv.className = "card mb-1";

    const nodeNameDiv = document.createElement('div');
    nodeNameDiv.className = "card-header-title";
    nodeNameDiv.innerText = node.profile.nodeId;

    const rankDiv = document.createElement('div');
    rankDiv.className = "card-content py-0";
    rankDiv.innerText = `Rank: ${rank}`;

    const iceDiv = document.createElement('div');
    iceDiv.className = "card-content py-0";
    iceDiv.innerText = `ICE state: ${node.pc.iceConnectionState}`;

    const connDiv = document.createElement('div');
    connDiv.className = "card-content pt-0";
    connDiv.innerText =  `Connection state: ${node.pc.connectionState}`;

    const isTurnDiv = document.createElement('div');
    isTurnDiv.className = "card-content pt-0";
    isTurnDiv.innerText =  `Connection type: ${
      node.isTurn === true ? 'Turn' : (node.isTurn === false ? 'Direct' : 'Unknown')}`;

    nodeDiv.appendChild(nodeNameDiv);
    nodeDiv.appendChild(rankDiv);
    nodeDiv.appendChild(iceDiv);
    nodeDiv.appendChild(connDiv);
    nodeDiv.appendChild(isTurnDiv);

    return nodeDiv;
  }

}

const villageStateHtml = `
<div id="villageState">
    <p class="title">Village State</p>
    <div class="subtitle" id="nodeId"></div>
    <div class="subtitle"> 
        Connections: <span id="livePeersCount"></span>
    </div>
   
    <div id="nodeStateList" class="is-flex is-flex-direction-column"></div>
    <br />
</divi>
`

export default _VillageState;
