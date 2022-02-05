
class _AppStore {

  validateCode(code) {
    const unsupportedStrings = [
      // /document/,
      // /window/,
      // /localStorage/,
      // /indexedDB/,
      // /eval/,
      // /globalThis/,
    ];

    return !unsupportedStrings.some((us) => us.test(code));
  }

  verifyApp(app) {
    return this.validateCode(app.code);
  }

  installApp(app) {
    //install and register app
    if(this.verifyApp(app)) {
      const apps = this.getInstalledApps();

      app.installDate = new Date();

      apps.push(app);

      localStorage.setItem('installedApps', JSON.stringify(apps));
    } else {
      alert('Error: Invalid app');

      throw new Error('Invalid app');
    }

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

  runApp(app) {
    if(this.verifyApp(app)) {
      const code = app.code;

      try {
        const iframe = document.getElementById("appIframe");
        iframe.contentWindow.postMessage({run: code},'*');
      } catch (e) {
        console.error(e);
      }
    } else {
      alert('Error: Invalid app')
    }
  }
}

const AppStore = new _AppStore();

export default AppStore;
