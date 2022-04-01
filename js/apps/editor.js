import AppStore from "../store/appStore.js";
import MessageRouter from "../messageRouter.js";
import AceEditor from "./sandboxed/aceEditorApp.js";
import {logError} from "../utils/logger.js";

class _Editor {
  constructor({AppListApp}) {

    this.AppListApp = AppListApp;

    const editorContainer = document.getElementById('editorContainer');
    editorContainer.innerHTML = editorHtml;

    this.editorAppEl = document.getElementById('editorApp');

    this.registerListeners();
  }

  testApp() {
    const name = document.getElementById('appName').value;
    const code = document.getElementById('editor').value;

    document.getElementById('editorlog').innerText = 'Running locally... ' + (new Date());

    MessageRouter.onRunApp( AceEditor, {code, name});
  }

  installApp(app) {
    try {
      AppStore.installApp(app);
      this.AppListApp.updateAppList();
      this.AppListApp.sendApps();
    } catch (e) {
      logError(e);
    }
  }

  saveApp() {
    const name = document.getElementById('appName').value;
    const code = document.getElementById('editor').value;

    this.installApp({name, code});
  }

  registerListeners() {
    document.getElementById('saveApp').addEventListener('click', () => this.saveApp());
    document.getElementById('testApp').addEventListener('click', () => this.testApp());
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
          <button class="button" id="saveApp">Save App</button>
          <button class="button" id="testApp">Test App</button>
      </div>
    </div>
</div>
`

export default _Editor;
