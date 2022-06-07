import MessageRouter from "../messageRouter.js";
import DataStore from "./dataStore.js";

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

  async installApp(app) {
    //install/replace
    if(this.verifyApp(app)) {
      app.installDate = new Date();

      await DataStore.saveApp(app.name, app.installDate, app.code);
    } else {
      alert('Error: Invalid app');

      throw new Error('Invalid app');
    }

    MessageRouter.onAppListUpdate();
  }

  async getInstalledApps() {
    return await DataStore.getApps();
  }

  async removeApp(appName) {
    await DataStore.removeApp(appName);
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
