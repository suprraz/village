

class _AppStore {
  findApp() {
    //finds an app in the network
  }

  downloadApp() {
    //finds app and downloads it with retry fallback
  }

  verifyApp() {
    //authenticate and verify app authenticity and security
  }

  installApp(appConfig) {
    //install and register app
    //TODO: use UUID for app registration
    localStorage.setItem(appConfig.name, appConfig.code);
  }

  deleteApp() {
    //remove app from library
  }

  createApp(appConfig) {
    //TODO validation
    try {
      this.verifyApp(appConfig)
    } catch (e) {
      throw e;
    }

    this.installApp(appConfig);
  }
}

const AppStore = new _AppStore();

export default AppStore;
