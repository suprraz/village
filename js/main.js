import {show, hide} from "./os/utils/dom.js";
import MessageRouter from "./messageRouter.js";
import Settings from "./os/settings.js";
import AppStore from "./os/store/appStore.js";
import LandingApp from "./apps/sandboxed/landingApp.js";
import _Sandbox from "./os/sandbox.js";
import _InvoiceStore from "./os/store/invoiceStore.js";
import _AddPeerCard from "./apps/cards/addPeerCard.js";
import _VillageStateCard from "./apps/cards/villageStateCard.js";
import _ChatCard from "./apps/cards/chatCard.js";
import _AppListCard from "./apps/cards/appListCard.js";
import _LoggerAppCard from "./apps/cards/loggerAppCard.js";
import _AdminToggleBtn from "./apps/buttons/adminToggleBtn.js";
import RiverApi from "./riverNetwork/riverApi.js";
import _DeveloperAppsCard from "./apps/cards/developerAppsCard.js";

class _Village {
  #coreApps

  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('encryptionKey')) {
      document.getElementById('main').style = 'display: none;'
      window.parent.postMessage({type: 'closeApp', payload: {sourceApp: 'PaymentApp'}},'*');
      window.parent.postMessage({type: 'invoicePaid', payload: {decryptApp: true, encryptionKey: urlParams.get('encryptionKey'), appId: urlParams.get('appId')}},'*');
      return;
    }

    const AddPeerCard = new _AddPeerCard();

    const AppListCard = new _AppListCard();
    const DeveloperAppsCard = new _DeveloperAppsCard(document.getElementById('bottomPaneContainer'));
    const LoggerAppCard = new _LoggerAppCard(document.getElementById('rightPaneContainer'));
    const ChatCard = new _ChatCard();
    const InvoiceStore = new _InvoiceStore();
    const VillageStateCard = new _VillageStateCard();
    const AdminToggleButton = new _AdminToggleBtn(document.getElementById('floatingButtonContainer'));
    const Sandbox = new _Sandbox();

    this.#coreApps = {
      AddPeerCard,
      AppListCard,
      DeveloperAppsCard,
      LoggerAppCard,
      ChatCard,
      VillageStateCard,
      Sandbox,
      InvoiceStore,
      AdminToggleButton
    };


    const riverApi = new RiverApi()

    MessageRouter.init(riverApi, this.#coreApps);

    if(urlParams.has('offerKey')) {
      this.#coreApps.AddPeerCard.run();
    }

    const showLanding = Settings.get('showLanding');

    if(showLanding) {
      AppStore.runApp(LandingApp);
    } else {
      riverApi.connect();
    }

    this.#coreApps.AppListCard.updateAppList();

    this.registerListeners();
  }

  fullScreenApp(){
    hide('adminScreen');
    show('appContainer');
  }

  addMorePeers(){
    this.#coreApps.AddPeerCard.run();
    this.#coreApps.AddPeerCard.preparePeer();
    this.fullScreenApp();
  }


  registerListeners() {
    document.getElementById('peerAppBtn').addEventListener('click', () => this.addMorePeers());
  }

}

const Village = new _Village();


export default Village;
