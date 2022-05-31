import {show, hide} from "./utils/dom.js";
import _MqttWorker from "./workers/mqttWorker.js";
import MessageRouter from "./messageRouter.js";
import _VillageSignaler from "./workers/villageSignaler.js";
import _RouteBalancer from "./workers/routeBalancer.js";
import Settings from "./settings.js";
import AppStore from "./store/appStore.js";
import LandingApp from "./apps/sandboxed/landingApp.js";
import _Sandbox from "./sandbox.js";
import _InvoiceStore from "./store/invoiceStore.js";
import _AddPeerCard from "./apps/cards/addPeerCard.js";
import _VillageStateCard from "./apps/cards/villageStateCard.js";
import _ChatCard from "./apps/cards/chatCard.js";
import _AppListCard from "./apps/cards/appListCard.js";
import _LoggerAppCard from "./apps/cards/loggerAppCard.js";


class _Village {
  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('encryptionKey')) {
      document.getElementById('main').style = 'display: none;'
      window.parent.postMessage({closeApp: true, sourceApp: 'PaymentApp'},'*');
      window.parent.postMessage({decryptApp: true, encryptionKey: urlParams.get('encryptionKey'), appName: urlParams.get('appName')},'*');
      return;
    }

    const AddPeerCard = new _AddPeerCard();
    const MqttWorker = new _MqttWorker();
    const AppListCard = new _AppListCard();
    const LoggerAppCard = new _LoggerAppCard(document.getElementById('rightPaneContainer'));
    const ChatCard = new _ChatCard();
    const VillageSignaler = new _VillageSignaler();
    const RouteBalancer = new _RouteBalancer();
    const InvoiceStore = new _InvoiceStore();
    const VillageStateCard = new _VillageStateCard();
    const Sandbox = new _Sandbox();

    this.coreApps = {
      AddPeerCard,
      AppListCard,
      LoggerAppCard,
      ChatCard,
      MqttWorker,
      VillageSignaler,
      RouteBalancer,
      VillageStateCard,
      Sandbox,
      InvoiceStore
    };

    MessageRouter.init(this.coreApps, (node) => this.onConnection(node));

    if(urlParams.has('offerKey')) {
      this.coreApps.AddPeerCard.run();
    }

    const showLanding = Settings.get('showLanding');

    if(showLanding) {
      AppStore.runApp(LandingApp);
    } else {
      this.coreApps.MqttWorker.seekNodes();
    }

    this.coreApps.AppListCard.updateAppList();

    this.registerListeners();
  }

  fullScreenApp(){
    hide('widgetsView');
    show('appContainer');
  }

  onConnection(node) {
    show('widgetsView');

    this.coreApps.AddPeerCard.stop();
    this.coreApps.AppListCard.updateAppList();
    this.coreApps.AppListCard.sendApps();
  }

  addMorePeers(){
    this.coreApps.AddPeer.run();
    this.coreApps.AddPeerCard.preparePeer();
    this.fullScreenApp();
  }


  registerListeners() {
    document.getElementById('peerAppBtn').addEventListener('click', () => this.addMorePeers());
  }

}

const Village = new _Village();


export default Village;
