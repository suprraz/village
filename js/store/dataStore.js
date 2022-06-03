import {logError} from "../utils/logger.js";


class _DataStore {
  constructor() {
    this.db = new Dexie("AppStore");

    this.db.version(2).stores({
      apps: `  
        name,
        installDate`,
    });
  }

  async performUpgrades() {
      await this.migrateAppStoreFromLocalStorage();
  }

  async migrateAppStoreFromLocalStorage() {
    const installedApps = this.getDocument('installedApps');
    if(installedApps) {
      await installedApps.map(async app => {
        await this.saveApp(app.name, app.installDate, app.code);
      });
      localStorage.removeItem('installedApps');
    }
  }

  getDocument(key) {
    const docJson = localStorage.getItem(key);
    if(docJson) {
      try {
        const doc = JSON.parse(docJson);
        return doc;
      } catch (e) {
        logError(`Failure to parse JSON object for key '${key}'`);
      }
    }
    return undefined;
  }

  setDocument(key, document) {
    localStorage.setItem(key, JSON.stringify(document));
  }

  async saveApp(name, installDate, code) {
    const appMatchingName = await this.getApp(name);
    if(appMatchingName) {
      await this.db.apps.update(name, {
        name,
        installDate,
        code
      });
    } else {
      await this.db.apps.add({
        name,
        installDate,
        code
      });
    }
  }

  async getApp(name) {
    const query = this.db.apps.where('name').startsWithIgnoreCase(name);
    const matches = await query.toArray();
    if(matches && matches[0]) {
      return matches[0]
    }
    return null;
  }

  async getApps() {
    return this.db.apps.toArray();
  }

  async removeApp(name) {
    return this.db.apps.delete(name)
  }

}

const DataStore = new _DataStore();

await DataStore.performUpgrades();

export default DataStore;
