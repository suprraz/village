import {logError} from "../../utils/logger.js";

class _KeyValueStore {
  #keyValueStoreDb

  constructor() {
    this.#keyValueStoreDb = new Dexie("KeyValueStore");

    this.setDataStoreSchema();
  }

  async getDocument(key) {
    const row = await this.#keyValueStoreDb.keyValue.get(key)

    if(row) {
      try {
        const doc = JSON.parse(row.doc);
        return doc;
      } catch (e) {
        logError(`Failure to parse JSON object for key '${key}'`);
      }
    }
    return undefined;
  }

  setDocument(key, docObj) {
    const doc = JSON.stringify(docObj);
    return this.#keyValueStoreDb.keyValue.put({key, doc});
  }

  setDataStoreSchema() {
    try {
      this.#keyValueStoreDb.version(2).stores({
        keyValue: `key, doc`
      });
    } catch (e) {
      logError(`AppStore Error ${e}`);
    }
  }
}

const KeyValueStore = new _KeyValueStore();


export default KeyValueStore;
