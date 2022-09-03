const code = `
const AceEditorHtml = \`
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <title>Editor</title>
  <style type="text/css" media="screen">
    #editor {
        position: absolute;
        top: 56px;
        right: 20px;
        bottom: 0;
        left: 20px;
    }
    @media only screen and (max-width: 830px) {
      #editor {
        top: 76px;
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://unpkg.com/bulma@0.9.4/css/bulma.min.css">
  <link rel="stylesheet" href="https://unpkg.com/bulmaswatch/solar/bulmaswatch.min.css">
</head>
<body>
<div class="px-4 py-4">
  <div class="">
    <div class="is-flex">
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Name</label>
        </div>
        <div class="field-body">
          <div class="field">
            <p class="control">
              <input type="text" class="input is-static" name="appName" id="appName" placeholder="App name"/>
            </p>
          </div>
        </div>
      </div>
      
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Price (Sats)</label>
        </div>
        <div class="field-body">
          <div class="field">
            <p class="control">
              <input type="text" class="input is-static" name="appPrice" id="appPrice" placeholder="Price in sats.  0 = free."/>
            </p>
          </div>
        </div>
      </div>
    
     
      <button id="saveBtn" class="button is-primary mx-1">Save</button>
      <button id="runBtn" class="button is-primary mx-1">Run</button>
    </div>
    
    <pre id="editor" class="my-4 is-hidden">
    </pre>
  </div>
<div>
</body>
\`;

class _AceEditor {
  #params
  #editorEl
  #editor

  constructor() {
    this.#params = {...params};
    
    params = null; //remove sensitive data from window object;
    
    document.getElementsByTagName("html")[0].innerHTML = AceEditorHtml;
    this.#editorEl = document.getElementById('editor');
    
    this.loadScript('https://unpkg.com/ace-builds@1.6/src-min-noconflict/ace.js', () => {
        this.init();
    });
    this.#editor = null;
  }
  
  loadScript(srcUrl, callback) {
    const script = document.createElement('script');
   
    script.onload = callback;
    
    script.setAttribute("src", srcUrl);
    script.setAttribute("type", "text/javascript");
    script.setAttribute("charset", "utf-8");
    
    document.getElementsByTagName("head")[0].appendChild(script);
  }
  
  init() {
    this.#editor = ace.edit("editor", {
      mode: "ace/mode/javascript",
      selectionStyle: "text"
    });
    
    this.#editor.setTheme("ace/theme/twilight");
    this.#editor.session.setMode("ace/mode/javascript");
    
    this.#editorEl.classList.remove("is-hidden");
    
    if(this.#params?.app?.code) {
      this.#editor.session.setValue(this.#params.app.code);
    }    
    if(this.#params?.app?.name) {
      document.getElementById('appName').value = this.#params.app.name;
    }
    
    if(typeof this.#params?.app?.price === "string") {
      document.getElementById('appPrice').value = this.#params.app.price;
    }
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', () => this.saveAndRun(false));
    
    const runBtn = document.getElementById('runBtn');
    runBtn.addEventListener('click', () => this.saveAndRun(true));
  }
  
  saveAndRun(runAfterSave) {
    const code = this.#editor.session.getValue();
    const name = document.getElementById('appName').value;
    const price = document.getElementById('appPrice').value;

    if(typeof parseFloat(price) !== 'number') {
      alert('Please enter a price for the app.  Set price to 0 to make the app free.');
      return;
    }
    
    if(!name.length) {
      alert("Please enter a valid app name");
      return;
    }
    
    const app = {
      ...this.#params.app,
      name,
      code,
      price
    }

    window.parent.postMessage({type: 'saveAndRunApp', payload: {app, runAfterSave}},'*');
  }
}

const AceEditor = new _AceEditor();
`;


const AceEditorApp = {
  name: 'AceEditor Page',
  code,
}

export default AceEditorApp;
