import {logError} from "../../utils/logger.js";

class _SandboxStore {
  #sandboxStoreDb

  constructor() {
    this.#sandboxStoreDb = new Dexie("SandboxStore");

    this.setSandboxStoreSchema();
  }

  setSandboxStoreSchema() {
    try {
      this.#sandboxStoreDb.version(2).stores({
        sandboxes: `
        appId_key,
        value
        `,
      });
    } catch (e) {
      logError(`SandboxStore Error ${e}`);
    }
  }

  async save(appId, key, value) {
    const pK = `${appId}.${key}`;

    return this.#sandboxStoreDb.sandboxes.put({
      appId_key: pK,
      value
    });
  }

  read(appId, key) {
    const pK = `${appId}.${key}`;

    return this.#sandboxStoreDb.sandboxes.get(pK);
  }
}

const SandboxStore = new _SandboxStore();

export default SandboxStore;
