import NodeStore from "../store/nodeStore.js";

class _VillageState {
  constructor() {
    const villageStateContainer = document.getElementById('villageStateContainer');
    villageStateContainer.innerHTML = villageStateHtml;

    this.villageStateEl = document.getElementById('villageState');
    this.nodeStateList = document.getElementById('nodeStateList');
    this.livePeersCount = document.getElementById('livePeersCount');

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
      this.nodeStateList.appendChild(this.createNodeStateDiv(node));
    })

    this.livePeersCount.innerText = `${nodes.filter((node) => node.pc.connectionState === 'connected').length} / ${nodes.length}`;
  }

  createNodeStateDiv(node){
    const nodeDiv = document.createElement('div');
    nodeDiv.className = "card mb-1";

    const nodeNameDiv = document.createElement('div');
    nodeNameDiv.className = "card-header-title";
    nodeNameDiv.innerText = node.profile.nodeId;

    const iceDiv = document.createElement('div');
    iceDiv.className = "card-content py-0";
    iceDiv.innerText = `ICE state: ${node.pc.iceConnectionState}`;

    const connDiv = document.createElement('div');
    connDiv.className = "card-content pt-0";
    connDiv.innerText =  `Connection state: ${node.pc.connectionState}`;

    nodeDiv.appendChild(nodeNameDiv);
    nodeDiv.appendChild(iceDiv);
    nodeDiv.appendChild(connDiv);

    return nodeDiv;
  }

}


const villageStateHtml = `
<div id="villageState">
    <p class="title">Village State</p>
    <p class="subtitle">Connections: 
        <span id="livePeersCount"></span>
    </p>
    <div id="nodeStateList" class="is-flex is-flex-direction-column"></div>
    <br />
</divi>
`

export default _VillageState;
