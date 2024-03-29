import MessageRouter from "./messaging/messageRouter.js";

class _Sandbox {
  #sandboxContainer
  #contentWindow
  #overlayContainer
  #iframe
  #runningAppId
  #runningAppName

  constructor() {
    this.#sandboxContainer = document.getElementById('sandbox');
    this.#contentWindow = null;
    this.#overlayContainer = null;
    this.#iframe = null;
    this.#runningAppId = null;
    this.#runningAppName = null;
  }

  sanitize() {
    this.stop();
    this.#sandboxContainer.innerHTML = sandboxHtml;

    this.#iframe = this.#sandboxContainer.querySelector("#sandboxIframe");
    this.#overlayContainer = this.#sandboxContainer.querySelector("#overlayContainer");

    this.registerListeners();
  }

  stop() {
    this.#runningAppId = null;
    this.#runningAppName = null;

    while (this.#sandboxContainer.firstChild) {
      // remove all children and listeners
      this.#sandboxContainer.removeChild(this.#sandboxContainer.firstChild);
    }
  }

  async loadAppByFilename(filename) {
    const res = await fetch( `js/apps/sandboxed/${filename}`);
    if (!res.ok) {
      throw new Error(`Sandbox Failed to load app by name: ${res.status}`);
    }
    return await res.text();
  }

  async run(app, params) {
    this.sanitize();

    if(app.runUrl) {
      this.#iframe.setAttribute("src", app.runUrl);
      this.#iframe.removeAttribute("srcDoc");

      this.#runningAppId = 'appFromUrl';
      this.#runningAppName = 'Run app by url';
      return;
    }

    let html;

    if(app.appFileName) {
      html = await this.loadAppByFilename(app.appFileName);
    } else {
      html = app.code;
    }

    const appParams = !params ? '' : `
    <script> 
      const params = '${btoa(JSON.stringify(params))}';
    </script>`;

    //insert global params before first script
    html = html.replace(/<script/, `${appParams}<script`);

    this.#iframe.setAttribute('srcdoc', html)

    this.#runningAppId = app.id;
    this.#runningAppName = app.name;

    // hide progress bar
    MessageRouter.progress('', 0,0);
  }

  getRunningAppId() {
    return this.#runningAppId;
  }

  postMessage(message) {
    this.#iframe?.contentWindow?.postMessage(message, '*');
  }

  registerListeners() {
    this.#overlayContainer.addEventListener('click', () => MessageRouter.onCloseApp(this.#runningAppId));
  }
}

const sandboxHtml = `
<div id="overlayContainer" class="is-overlay hero">   
    <div class="hero-body">
      <button class="modal-close is-large" aria-label="close"></button>
      <iframe sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation allow-top-navigation-by-user-activation"
        height="100%" width="100%" src="about:blank" name="sandboxIframe"
        id="sandboxIframe" srcdoc="
          <!DOCTYPE html>
          <html>
          <head>
          </head>
          <body>
            <div style='background-color: #0a0a0a; height: 100%'></div>
          </body>
          </html>">
      </iframe>
    </div>
</div>`;

export default _Sandbox;
