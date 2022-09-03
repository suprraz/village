import MessageRouter from "../messageRouter.js";
import Settings from "../settings.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import config from "../../config.js";

class _AppStore {
  #appStoreDb

  constructor() {
    this.#appStoreDb = new Dexie("AppStore");

    this.setAppStoreSchema();
  }

  setAppStoreSchema() {
    try {
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
        const upgradedApps = apps.map(app => {
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
        return trans.installedApps.toCollection().modify(app => {
          app.updateDate = (new Date()).getTime();
          app.creationDate = (new Date()).getTime();
        });
      });
      this.#appStoreDb.version(28).stores({
        installedApps: `
        id,
        name,
        authorId,
        signature,
        installDate,
        updateDate,
        creationDate,
        price,
        isPublished  `,
      }).upgrade((trans) => {
        return trans.installedApps.toCollection().modify(app => {
          app.isPublished = true;
          app.price = '0.000000001';
        });
      });
      this.#appStoreDb.version(29).stores({
        installedApps: `
        id,
        name,
        version,
        authorId,
        signature,
        price,
        installDate,
        updateDate,
        creationDate,       
        isPublished  `,
      }).upgrade((trans) => {
        return trans.installedApps.toCollection().modify(app => {
          app.version = 1;
        });
      });
      this.#appStoreDb.version(48).stores({
        installedApps: `
        id,
        name,
        version,
        authorId,
        signature,
        price,
        installDate,
        updateDate,
        creationDate,       
        isPublished  `,
      }).upgrade((trans) => {
        return trans.installedApps.toCollection().modify(app => {
          app.id = app.id || `app-${uuidv4()}`;
          app.name = app.name || 'App name error';
          app.version = app.version || 1;
          app.authorId = app.authorId || Settings.get('userId');
          app.price = app.price || '1';
          app.installDate = app.installDate || (new Date()).getTime();
          app.updateDate = app.updateDate || (new Date()).getTime();
          app.creationDate = app.creationDate || (new Date()).getTime();
          app.isPublished = [0, 1].includes(app.isPublished) ? app.isPublished : 1;
          app.code = app.code || '';
          app.signature = typeof app.signature === 'string' || AppStore.signApp(app);

          return app;
        });
      });

      this.#appStoreDb.version(49).stores({
        installedApps: `
        id,
        name,
        version,
        authorId,
        authorWalletId,
        signature,
        price,
        installDate,
        updateDate,
        creationDate,       
        isPublished  `,
      }).upgrade((trans) => {
        return trans.installedApps.toCollection().modify(app => {
          app.id = app.id || `app-${uuidv4()}`;
          app.name = app.name || 'App name error';
          app.version = app.version || 1;
          app.authorId = app.authorId || Settings.get('userId');
          app.authorWalletId = app.authorWalletId || config.lnbits.villageWalletId;
          app.price = app.price || '1';
          app.installDate = app.installDate || (new Date()).getTime();
          app.updateDate = app.updateDate || (new Date()).getTime();
          app.creationDate = app.creationDate || (new Date()).getTime();
          app.isPublished = [0, 1].includes(app.isPublished) ? app.isPublished : 1;
          app.code = app.code || '';
          app.signature = typeof app.signature === 'string' || AppStore.signApp(app);

          return app;
        });
      });
    } catch (e) {
      logError(`AppStore Error ${e}`);
    }
  }

  async saveApp(app) {
    return this.#appStoreDb.installedApps.put(app);
  }

  getApp(appId) {
    return this.#appStoreDb.installedApps.get(appId);
  }

  async getAppsByAuthor(authorId) {
    const query = this.#appStoreDb.installedApps.where({authorId});
    return query.toArray();
  }

  async removeApp(appId) {
    return await this.#appStoreDb.installedApps.delete(appId);
  }

  async publishApp(appId) {
    const app = await this.getApp(appId);
    app.isPublished = 1;
    this.#appStoreDb.installedApps.update(app.id, app);
  }

  async unpublishApp(appId) {
    const app = await this.getApp(appId);
    app.isPublished = 0;
    this.#appStoreDb.installedApps.update(app.id, app);
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

  async updateApp(app, runAfterSave) {
    const savedApp = await this.installApp({
      ...app,
      updateDate: (new Date()).getTime()
    });

    if(runAfterSave && savedApp) {
      this.runApp(savedApp);
    }
  }

  async installApp(app) {
    if(this.verifyApp(app)) {
      app.installDate = (new Date()).getTime();
      app.signature = AppStore.signApp(app);

      try {
        await this.saveApp(app);
      } catch (e) {
        logError(`AppStore Error saving app: ${e}`);
      }
    } else {
      throw new Error('AppStore Invalid app');
    }

    MessageRouter.onAppListUpdate();
    return this.getApp(app.id);
  }

  async getPublishedApps() {
    try {
      return await this.#appStoreDb.installedApps.where('isPublished').equals(1).toArray();
    } catch (e) {
      logError(`AppStore Error getting apps ${e}`)
      return [];
    }
  }

  async getUnpublishedApps() {
    try {
      return await this.#appStoreDb.installedApps.where('isPublished').equals(0).toArray();
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

    return CryptoJS.HmacSHA256(app.id + app.code + app.authorId + app.version + app.price, pk).toString();
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
