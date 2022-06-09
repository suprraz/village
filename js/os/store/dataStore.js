import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import AppStore from "./appStore.js";
import Settings from "../settings.js";

class _DataStore {
  #appStoreDb

  constructor() {
    this.#appStoreDb = new Dexie("AppStore");

    this.setAppStoreSchema();
  }

  setAppStoreSchema() {
    this.#appStoreDb.version(2).stores({
      apps: `name, installDate`
    });
    this.#appStoreDb.version(21).stores({
      installedApps: `
        id,
        name,
        authorId,
        signature,
        installDate`,
    }).upgrade(async (trans) => {
      const apps = await trans.apps.toCollection().toArray();
      const upgradedApps = apps.map( app => {
        app.id = `app-${uuidv4()}`;
        app.authorId = Settings.get('userId');
        app.signature = AppStore.signApp(app);
        app.installDate = (new Date(app.installDate)).getTime();
        return app;
      });
      await this.#appStoreDb.installedApps.bulkAdd(upgradedApps);
    });
    this.#appStoreDb.version(22).stores({
      apps: null,
      installedApps: `
        id,
        name,
        authorId,
        signature,
        installDate`,
    });
    this.#appStoreDb.version(26).stores({
      installedApps: `
        id,
        name,
        authorId,
        signature,
        installDate,
        updateDate,
        creationDate`,
    }).upgrade((trans) => {
      return trans.installedApps.toCollection().modify (app => {
        app.updateDate = (new Date()).getTime();
        app.creationDate = (new Date()).getTime();
      });
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

  async saveApp(app) {
    const appMatchingId= await this.getApp(app.id);
    if(appMatchingId) {
      await this.#appStoreDb.installedApps.update(app.id, app);
    } else {
      await this.#appStoreDb.installedApps.add(app);
    }
  }

  async getApp(appId) {
    const query = this.#appStoreDb.installedApps.where('id').startsWithIgnoreCase(appId);
    const matches = await query.toArray();
    if(matches && matches[0]) {
      return matches[0]
    }
    return null;
  }

  async getApps() {
    try {
      return this.#appStoreDb.installedApps.toArray();
    } catch (e) {
      logError(`DataStore Error getting apps ${e}`)
      throw e;
    }
  }

  async getAppsByAuthor(authorId) {
    const query = this.#appStoreDb.installedApps.where({authorId});
    return query.toArray();
  }

  async removeApp(appId) {
    return this.#appStoreDb.installedApps.delete(appId);
  }

}

const DataStore = new _DataStore();

await DataStore.performUpgrades();

export default DataStore;
