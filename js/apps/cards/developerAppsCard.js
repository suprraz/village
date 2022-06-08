import AppStore from "../../os/store/appStore.js";
import MessageRouter from "../../messageRouter.js";
import AceEditorApp from "../sandboxed/aceEditorApp.js";
import DataStore from "../../os/store/dataStore.js";

class _DeveloperAppsCard {
  constructor(containerEl) {

    const devAppsContainerEl = containerEl;

    devAppsContainerEl.innerHTML = devAppsContainerHtml;
    this.newAppBtn = devAppsContainerEl.querySelector('#newAppBtn');

    this.registerListeners();

    // this.updateMyAppsList();
  }

  registerListeners() {
    this.newAppBtn.addEventListener('click', (e) => this.newApp());
  }

  newApp() {
    alert('New App!')
  }

  async updateMyAppsList() {
    const myApps = await AppStore.getMyApps();

    const myAppsDiv = document.getElementById("myApps");

    if(!myApps.length) {
      myAppsDiv.innerText = "No apps yet.";
    } else {
      // remove all children and listeners
      while (myAppsDiv.firstChild) {
        myAppsDiv.removeChild(myAppsDiv.firstChild);
      }
    }

    myApps.map((app) => {
      myAppsDiv.appendChild(this.createMyAppDiv(app));
    })

  }

  createMyAppDiv(app){
    const appDiv = document.createElement('div');
    appDiv.className = "installedApp card my-1";

    const appNameDiv = document.createElement('div');
    appNameDiv.className = "card-header-title title appName";
    appNameDiv.innerText = app.name;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = "buttons card-content";

    const appRunBtn = document.createElement('button');
    appRunBtn.className = "button is-primary appRunButton";
    appRunBtn.innerText = "Run";
    appRunBtn.onclick = async () => {
      const reloadedApp = await DataStore.getApp(app.name);

      AppStore.runApp(reloadedApp)
    };

    const appEditBtn = document.createElement('button');
    appEditBtn.className = "button appEditButton";
    appEditBtn.innerText = "Edit";
    appEditBtn.onclick = async () => {
      const reloadedApp = await DataStore.getApp(app.name);

      MessageRouter.onRunApp(AceEditorApp, reloadedApp);
    };

    const appRemoveBtn = document.createElement('button');
    appRemoveBtn.className = "button appRemoveButton";
    appRemoveBtn.innerText = "Remove";
    appRemoveBtn.onclick = () => {
      AppStore.removeApp(app.name);
      this.updateMyAppsList();
    };

    buttonsDiv.appendChild(appRunBtn);
    buttonsDiv.appendChild(appEditBtn);
    buttonsDiv.appendChild(appRemoveBtn);
    appDiv.appendChild(appNameDiv);
    appDiv.appendChild(buttonsDiv);

    return appDiv;
  }

}


const devAppsContainerHtml = `
<div id="developerAppsCard">
    <p class="title">Developer Studio</p>
    
    <div class="is-flex is-flex-direction-row">
      <div class="px-1 mx-3">
          <button id="newAppBtn" class="button is-info appRunButton">New App</button>
      </div>
      
      <div class="section px-7">
        <p class="subtitle">My Apps</p>
        <div id="myApps" class="is-flex is-flex-direction-column"></div>
      </div>
    </div>
</div>
`

export default _DeveloperAppsCard;
