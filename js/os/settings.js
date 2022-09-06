import DataStore from "./store/dataStore.js";
import uuidv4 from "../utils/uuid.js";

const defaultSettings = {
  showLanding: true,
  enableLogging: false,
  privateKey: `private-key-${uuidv4()}`,
  userId: `user-${uuidv4()}`
}

class _Settings {
  #settings

  constructor() {
    const savedSettings = DataStore.getDocument('settings') || {};
    this.#settings = {...defaultSettings, ...savedSettings};

    this.save();
  }

  get(key) {
    return {...this.#settings}[key];
  }

  update(key, value) {
    if(key in defaultSettings) {
      this.#settings[key] = value;
      this.save();
    }
  }

  save() {
    DataStore.setDocument('settings', this.#settings);
  }
}


const Settings = new _Settings();

export default Settings;
