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
  </style>
  
  <link rel="stylesheet" href="https://unpkg.com/bulma@0.9.4/css/bulma.min.css">
  <link rel="stylesheet" href="https://unpkg.com/bulmaswatch/solar/bulmaswatch.min.css">
</head>
<body>
<div class="px-4 py-4">
  <div class="hero">
    <div class="is-flex hero-head">
      <input type="text" class="input" name="appName" id="appName" placeholder="App name"/>
      <button id="saveBtn" class="button is-primary mx-5">Save</button>
    </div>
    
    <pre id="editor" class="hero-body my-4 is-hidden">
    </pre>
  </div>
<div>
</body>
\`;

class _AceEditor {
  constructor() {
    this.params = {...params};
    
    params = null; //remove sensitive data from window object;
    
    document.getElementsByTagName("html")[0].innerHTML = AceEditorHtml;
    this.editorEl = document.getElementById('editor');
    
    this.loadScript('https://unpkg.com/ace-builds@1.4.14/src-min-noconflict/ace.js', () => {
        this.init();
    });
    this.editor = null;
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
    this.editor = ace.edit("editor", {
      mode: "ace/mode/javascript",
      selectionStyle: "text"
    });
    
    this.editor.setTheme("ace/theme/twilight");
    this.editor.session.setMode("ace/mode/javascript");
    
    this.editorEl.classList.remove("is-hidden");
    
    if(this.params?.app?.code) {
      this.editor.session.setValue(this.params.app.code);
    }    
    if(this.params?.app?.name) {
      document.getElementById('appName').value = this.params.app.name;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', () => this.save());
  }
  
  save() {
    const code = this.editor.session.getValue();
    const name = document.getElementById('appName').value;
    
    const app = {
      ...this.params.app,
      name,
      code
    }
    
    if(!name.length) {
      alert("Please enter a valid app name");
      return;
    }

    window.parent.postMessage({type: 'saveApp', payload: {app}},'*');
  }
}

const AceEditor = new _AceEditor();
`;


const AceEditorApp = {
  name: 'AceEditor Page',
  code,
}

export default AceEditorApp;
