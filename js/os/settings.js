import DataStore from "./store/dataStore.js";

const defaultSettings = {
  showLanding: true,
  enableLogging: false,
  adminViewVisible: true,
}

class _Settings {
  constructor() {
    this.settings = DataStore.getDocument('settings');

    if(!this.settings) {
      this.settings = {...defaultSettings};
      this.save();
    }
  }

  get(key) {
    return {...this.settings}[key];
  }

  update(key, value) {
    if(key in defaultSettings) {
      this.settings[key] = value;
      this.save();
    }
  }

  save() {
    DataStore.setDocument('settings', this.settings);
  }
}


const Settings = new _Settings();

export default Settings;
