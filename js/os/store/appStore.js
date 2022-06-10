import MessageRouter from "../../messageRouter.js";
import Settings from "../settings.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";

class _AppStore {
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
    return await this.#appStoreDb.installedApps.delete(appId);
  }


  validateCode(code) {
    const unsupportedStrings = [
      // /document/, /window/, /localStorage/, /indexedDB/, /eval/, /globalThis/,
    ];

    return !unsupportedStrings.some((us) => us.test(code));
  }

  verifyApp(app) {
    return this.validateCode(app.code);
  }

  updateApp(app) {
    this.installApp({
      ...app,
      updateDate: (new Date()).getTime()
    });
  }

  async installApp(app) {
    if(this.verifyApp(app)) {
      app.installDate = (new Date()).getTime();
      app.signature = AppStore.signApp(app);

      await this.saveApp(app);
    } else {
      throw new Error('Invalid app');
    }

    MessageRouter.onAppListUpdate();
  }

  async getInstalledApps() {
    try {
      return await this.getApps();
    } catch (e) {
      logError(`AppStore Error getting apps ${e}`)
      return [];
    }
  }

  async getMyApps() {
    const authorId = Settings.get('userId');

    return await this.getAppsByAuthor(authorId);
  }

  signApp(app) {
    const pk = Settings.get('privateKey');

    return CryptoJS.HmacSHA256(app.id + app.code + app.authorId, pk);
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
