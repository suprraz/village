import MessageRouter from "../messageRouter.js";
import {logError} from "../utils/logger.js";

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

  installApp(app) {
    //install/replace
    if(this.verifyApp(app)) {
      const apps = this.getInstalledApps();

      app.installDate = new Date();

      const updatedApps = apps.filter((a) => a.name !== app.name );
      updatedApps.push(app);

      localStorage.setItem('installedApps', JSON.stringify(updatedApps));
    } else {
      alert('Error: Invalid app');

      throw new Error('Invalid app');
    }

  }

  getInstalledApps() {
    const installedApps = localStorage.getItem('installedApps');
    let apps = [];
    try {
      apps = JSON.parse(installedApps) || [];
    } catch (e) {
      logError(e)
    }

    return apps;
  }

  removeApp(appName) {
    const apps = this.getInstalledApps();

    const prunedApps = apps.filter((app) => app.name !== appName);

    localStorage.setItem('installedApps', JSON.stringify(prunedApps));
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
