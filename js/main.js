import NodeStore from "./nodeStore.js";
import { logMessage, logError } from './logger.js';
import _AddPeer from "./apps/addPeer.js";
import {show, hide} from "./domUtils.js";
import _AppList from "./apps/appList.js";
import _Editor from "./apps/editor.js";
import _Chat from "./apps/chat.js";

class _Village {
  constructor() {
    const AddPeer = new _AddPeer(() => this.onConnection(),(e) => this.onMessage(e));
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
    /*
    if( network has > 1 node) {
      openNodeCreateOffer();
    } else {
      createOffer();
    }
     */

    if(NodeStore.getNodeCount() > 0) {

    } else {
      this.coreApps.AddPeer.preparePeer();
    }
  }

  onMessage (e) {
    if(e.data) {
      try {
        const data = JSON.parse(e.data);

        if (data.msg) {
          this.coreApps.Chat.messageReceived(data.msg);
        } else if (data.code) {
          this.coreApps.Editor.updateCode(data.code);
          eval(data.code);
        } else if (data.apps) {
          this.coreApps.AppListApp.onAvailableApps(data.apps);
        }
      } catch (e) {}
    }
  }



  onConnection() {
    show('connectedView');
    hide('offerCard');
    hide('answerCard');

    logMessage("Updating apps");

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
