const code = `
const AceEditorHtml = \`
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <title>Editor</title>
  <link rel="stylesheet" type="text/css"  href="https://unpkg.com/bulma@0.9.3/css/bulma.min.css"/>
  <link rel="stylesheet" href="https://unpkg.com/bulmaswatch/slate/bulmaswatch.min.css">
  <style type="text/css" media="screen">
      #editor {
          position: absolute;
          top: 56px;
          right: 20px;
          bottom: 0;
          left: 20px;
      }
  </style>

</head>
<body>
<div class="px-4 py-4">
  <div class="hero">
    <div class="is-flex hero-head">
      <input type="text" class="input" name="appName" id="appName" placeholder="App name"/>
      <button id="saveBtn" class="button is-primary mx-5">Save</button>
    </div>
    
    <pre id="editor" class="hero-body my-4">
    function foo(items) {
        alert('Change the code, change the world');
    }
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
      selectionStyle: "text",
      // maxLines: 80
    });
    
    this.editor.setTheme("ace/theme/twilight");
    this.editor.session.setMode("ace/mode/javascript");
    
    if(this.params.code) {
      this.editor.session.setValue(this.params.code);
    }    
    if(this.params.name) {
      document.getElementById('appName').value = this.params.name;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', () => this.save());
  }
  
  save() {
    const code = this.editor.session.getValue();
    const name = document.getElementById('appName').value;
    
    if(!name.length) {
      alert("Please enter a valid app name");
      return;
    }

    window.parent.postMessage({saveApp: true, app: {code, name}},'*');
  }
}

const AceEditor = new _AceEditor();
`;


const AceEditorApp = {
  name: 'AceEditor Page',
  code,
}

export default AceEditorApp;
