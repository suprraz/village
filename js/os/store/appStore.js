import MessageRouter from "../../messageRouter.js";
import DataStore from "./dataStore.js";
import Settings from "../settings.js";
import {logError} from "../../utils/logger.js";

class _AppStore {

  validateCode(code) {
    const unsupportedStrings = [
      // /document/,
      // /window/,
      // /localStorage/,
      // /indexedDB/,
      // /eval/,
      // /globalThis/,
    ];

    return !unsupportedStrings.some((us) => us.test(code));
  }

  verifyApp(app) {
    return this.validateCode(app.code);
  }

  saveApp(app) {
    this.installApp({
      ...app,
      updateDate: (new Date()).getTime()
    });
  }

  async installApp(app) {
    if(this.verifyApp(app)) {
      app.installDate = (new Date()).getTime();
      app.signature = AppStore.signApp(app);

      await DataStore.saveApp(app);
    } else {
      throw new Error('Invalid app');
    }

    MessageRouter.onAppListUpdate();
  }

  async getInstalledApps() {
    try {
      return await DataStore.getApps();
    } catch (e) {
      logError(`AppStore Error getting apps ${e}`)
      return [];
    }
  }

  async getMyApps() {
    const authorId = Settings.get('userId');

    return await DataStore.getAppsByAuthor(authorId);
  }

  signApp(app) {
    const pk = Settings.get('privateKey');

    return CryptoJS.HmacSHA256(app.id + app.code + app.authorId, pk);
  }

  async removeApp(appId) {
    await DataStore.removeApp(appId);
  }

  runApp(app) {
    if(this.verifyApp(app)) {
      MessageRouter.onRunApp(app);
    } else {
      alert('Error: Invalid app')
    }
  }
}

const AppStore = new _AppStore();

export default AppStore;
