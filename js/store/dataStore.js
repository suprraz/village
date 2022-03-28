import {logError} from "../utils/logger.js";


class DataStore {
  constructor() {
  }

  static getDocument(key) {
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

  static setDocument(key, document) {
    localStorage.setItem(key, JSON.stringify(document));
  }
}

export default DataStore;
