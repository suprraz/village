import _AddPeer from "./apps/addPeer.js";
import {show, hide} from "./utils/dom.js";
import _AppList from "./apps/appList.js";
import _Editor from "./apps/editor.js";
import _Chat from "./apps/chat.js";
import DiscoverPeer from "./apps/discoverPeer.js";

class _Village {
  constructor() {
    const AddPeer = new _AddPeer(
      (node) => this.onConnection(node),
      (data, node) => this.onMessage(data, node)
    );
    const AppListApp = new _AppList();
    const Editor = new _Editor({AppListApp});
    const Chat = new _Chat();

    this.coreApps = {
      AddPeer,
      AppListApp,
      Editor,
      Chat
    };

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('offerKey')) {
      this.startOS();
    }

    this.coreApps.AddPeer.run();

    this.registerListeners();
    DiscoverPeer.init();
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

  onMessage (data, node) {
    if (data.msg) {
      this.coreApps.Chat.messageReceived(data);
    } else if (data.code) {
      this.coreApps.Editor.updateCode(data.code);
      eval(data.code);
    } else if (data.apps) {
      this.coreApps.AppListApp.onAvailableApps(data.apps);
    }
  }

  onConnection(node) {
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
