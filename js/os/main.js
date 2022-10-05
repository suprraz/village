import MessageRouter from "./messageRouter.js";
import Settings from "./settings.js";
import AppStore from "./store/appStore.js";
import SandboxStore from "./store/sandboxStore.js";
import _Sandbox from "./sandbox.js";
import _InvoiceStore from "./store/invoiceStore.js";
import _AddPeerCard from "../apps/cards/addPeerCard.js";
import _VillageStateCard from "../apps/cards/villageStateCard.js";
import _AppListCard from "../apps/cards/appListCard.js";
import _LoggerAppCard from "../apps/cards/loggerAppCard.js";
import RiverApi from "../riverNetwork/riverApi.js";
import _DeveloperAppsCard from "../apps/cards/developerAppsCard.js";

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

    _Village.#initFullpageScrolling();

    this.#initCoreApps();

    const riverApi = new RiverApi()

    MessageRouter.init(riverApi, this.#coreApps);

    if(urlParams.has('offerKey')) {
      this.#coreApps.AddPeerCard.run();
    }

    const showLanding = Settings.get('showLanding');

    if(urlParams.has('runAppFromUrl')) {
      AppStore.runApp({runUrl: urlParams.get('runAppFromUrl')});
    } else if(showLanding) {
      AppStore.runApp({appFileName: 'landingApp.html'});
    }

    riverApi.connect();

    this.#coreApps.AppListCard.updateAppList();
  }

  static #initFullpageScrolling() {
    new fullpage('#fullpage', {
      menu: '#menu',
      autoScrolling:true,
      credits: { enabled: false },
      anchors: [
        'appStoreScreenAnchor',
        'networkScreenAnchor'
      ],
      paddingTop: '5em',
      normalScrollElements: '.scrollable',
      navigation: true,
      licenseKey: 'K7S16-5QZ9I-L8GKK-ENJW8-JHUOM'
    });
  }

  #initCoreApps() {
    const AddPeerCard = new _AddPeerCard();
    const AppListCard = new _AppListCard();
    const DeveloperAppsCard = new _DeveloperAppsCard(document.getElementById('developerAppsCardContainer'));
    const LoggerAppCard = new _LoggerAppCard(document.getElementById('rightPaneContainer'));
    const InvoiceStore = new _InvoiceStore();
    const VillageStateCard = new _VillageStateCard();
    const Sandbox = new _Sandbox();

    this.#coreApps = {
      AddPeerCard,
      AppListCard,
      DeveloperAppsCard,
      LoggerAppCard,
      VillageStateCard,
      Sandbox,
      SandboxStore,
      InvoiceStore
    };

  }

}

const Village = new _Village();


export default Village;
