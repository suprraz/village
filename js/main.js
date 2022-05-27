import _AddPeer from "./apps/addPeer.js";
import {show, hide} from "./utils/dom.js";
import _AppList from "./apps/appList.js";
import _Chat from "./apps/chat.js";
import _MqttWorker from "./workers/mqttWorker.js";
import MessageRouter from "./messageRouter.js";
import _NeighborsWorker from "./workers/neighborsWorker.js";
import _VillageState from "./apps/villageState.js";
import Settings from "./settings.js";
import AppStore from "./store/appStore.js";
import LandingApp from "./apps/sandboxed/landingApp.js";
import _LoggerAppCard from "./apps/LoggerAppCard.js";
import _Sandbox from "./sandbox.js";
import _InvoiceStore from "./store/invoiceStore.js";


class _Village {
  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('encryptionKey')) {
      document.getElementById('main').style = 'display: none;'
      window.parent.postMessage({closeApp: true, sourceApp: 'PaymentApp'},'*');
      window.parent.postMessage({decryptApp: true, encryptionKey: urlParams.get('encryptionKey'), appName: urlParams.get('appName')},'*');
      return;
    }

    const AddPeer = new _AddPeer();
    const MqttWorker = new _MqttWorker();
    const AppListApp = new _AppList();
    const LoggerAppCard = new _LoggerAppCard(document.getElementById('rightPaneContainer'));
    const Chat = new _Chat();
    const NeighborsWorker = new _NeighborsWorker();
    const InvoiceStore = new _InvoiceStore();
    const VillageState = new _VillageState();
    const Sandbox = new _Sandbox();

    this.coreApps = {
      AddPeer,
      AppListApp,
      LoggerAppCard,
      Chat,
      MqttWorker,
      NeighborsWorker,
      VillageState,
      Sandbox,
      InvoiceStore
    };

    MessageRouter.init(this.coreApps, (node) => this.onConnection(node));

    if(urlParams.has('offerKey')) {
      this.coreApps.AddPeer.run();
    }

    const showLanding = Settings.get('showLanding');

    if(showLanding) {
      AppStore.runApp(LandingApp);
    } else {
      this.coreApps.MqttWorker.seekNodes();
    }

    this.coreApps.AppListApp.updateAppList();

    this.registerListeners();
  }

  fullScreenApp(){
    hide('widgetsView');
    show('appContainer');
  }

  onConnection(node) {
    show('widgetsView');

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
    document.getElementById('peerAppBtn').addEventListener('click', () => this.addMorePeers());
  }

}

const Village = new _Village();


export default Village;
