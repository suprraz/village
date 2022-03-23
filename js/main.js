import _AddPeer from "./apps/addPeer.js";
import {show, hide} from "./utils/dom.js";
import _AppList from "./apps/appList.js";
import _Editor from "./apps/editor.js";
import _Chat from "./apps/chat.js";
import _MqttWorker from "./workers/mqttWorker.js";
import MessageRouter from "./messageRouter.js";
import _NeighborsWorker from "./workers/neighborsWorker.js";
import _VillageState from "./apps/villageState.js";

class _Village {
  constructor() {
    const AddPeer = new _AddPeer();
    const MqttWorker = new _MqttWorker();
    const AppListApp = new _AppList();
    const Editor = new _Editor({AppListApp});
    const Chat = new _Chat();
    const NeighborsWorker = new _NeighborsWorker();
    const VillageState = new _VillageState();

    this.coreApps = {
      AddPeer,
      AppListApp,
      Editor,
      Chat,
      MqttWorker,
      NeighborsWorker,
      VillageState
    };

    MessageRouter.init(this.coreApps, (node) => this.onConnection(node));

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('offerKey')) {
      this.startOS();
    }

    this.coreApps.AddPeer.run();

    this.registerListeners();
  }

  fullScreenApp(){
    hide('connectedView');
    show('appContainer');
  }

  startOS() {
    hide('landing');
    show('osView');
  }

  start() {
    this.startOS();

    this.coreApps.AddPeer.preparePeer();
  }

  onConnection(node) {
    this.startOS();
    show('connectedView');

    this.coreApps.AddPeer.stop();
    this.coreApps.AppListApp.updateAppList();
    this.coreApps.AppListApp.sendApps();
  }

  addMorePeers(){
    this.coreApps.AddPeer.run();
    this.coreApps.AddPeer.preparePeer();
    this.fullScreenApp();
  }


  registerListeners() {
    document.getElementById('btn_start').addEventListener('click', () => this.start());
    document.getElementById('peerAppBtn').addEventListener('click', () => this.addMorePeers());
  }

}

const Village = new _Village();


export default Village;
