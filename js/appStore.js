
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

    const apps = this.getInstalledApps();

    appConfig.installDate = new Date();

    apps.push(appConfig);

    localStorage.setItem('installedApps', JSON.stringify(apps));
  }

  getInstalledApps() {
    const installedApps = localStorage.getItem('installedApps');
    let apps = [];
    try {
      apps = JSON.parse(installedApps) || [];
    } catch (e) {}

    return apps;
  }

  removeApp(appName) {
    const apps = this.getInstalledApps();

    const prunedApps = apps.filter((app) => app.name !== appName);

    localStorage.setItem('installedApps', JSON.stringify(prunedApps));
  }

  runApp(appConfig) {
    eval(appConfig.code);
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
