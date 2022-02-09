import NodeStore from "../nodeStore.js";
import AppStore from "../appStore.js";

class _Editor {
  constructor({AppListApp}) {

    this.AppListApp = AppListApp;

    const editorContainer = document.getElementById('editorContainer');
    editorContainer.innerHTML = editorHtml;

    this.editorAppEl = document.getElementById('editorApp');

    this.registerListeners();
  }

  updateCode(code) {
    document.getElementById('editor').value = code;
  }

  runLocal() {
    document.getElementById('editorlog').innerText = 'Running locally... ' + (new Date());
    const code = document.getElementById('editor').value;

    eval(code);
  }

  runRemote() {
    document.getElementById('editorlog').innerText = 'Running remote... ' + (new Date());

    const code = document.getElementById('editor').value;

    NodeStore.broadcast(JSON.stringify({code}));
  }


  createApp() {
    const appName = document.getElementById('appName').value;
    const code = document.getElementById('editor').value;

    try {
      AppStore.installApp({name: appName, code});
      this.AppListApp.updateAppList();
      this.AppListApp.sendApps();
    } catch (e) {
      console.log(e);
    }
  }

  registerListeners() {
    document.getElementById('createApp').addEventListener('click', () => this.createApp());
    document.getElementById('runLocal').addEventListener('click', () => this.runLocal());
    document.getElementById('runRemote').addEventListener('click', () => this.runRemote());
  }
}

const editorHtml = `
<div id="editorApp" class="content">
    <p class="title">Console</p>
    <div class="editorlog" id="editorlog"></div>

  <div>
      <textarea id="editor" class="textarea my-2" rows="20" cols="30"> </textarea>
  
      <input type="text" class="input" name="appName" id="appName" className="my-1" placeholder="New app name"/>
  
      <div class="is-flex is-flex-direction-row buttons my-2">
          <button class="button" id="createApp">Create App</button>
          <button class="button" id="runLocal">Local</button>
          <button class="button" id="runRemote">Remote</button>
      </div>
    </div>
</div>
`

export default _Editor;
