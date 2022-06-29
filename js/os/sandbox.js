import MessageRouter from "./messageRouter.js";

class _Sandbox {
  #sandboxContainer
  #contentWindow
  #overlayContainer
  #iframe

  constructor() {
    this.#sandboxContainer = document.getElementById('sandbox');
    this.#contentWindow = null;
    this.#overlayContainer = null;
    this.#iframe = null;
  }

  sanitize() {
    this.stop();
    this.#sandboxContainer.innerHTML = sandboxHtml;

    this.#iframe = this.#sandboxContainer.querySelector("#sandboxIframe");
    this.#overlayContainer = this.#sandboxContainer.querySelector("#overlayContainer");

    this.registerListeners();
  }

  stop() {
    while (this.#sandboxContainer.firstChild) {
      // remove all children and listeners
      this.#sandboxContainer.removeChild(this.#sandboxContainer.firstChild);
    }
  }

  runUnrestricted(url) {
    this.sanitize();

    this.#iframe.src = url;
    this.#iframe.removeAttribute('sandbox');
    this.#iframe.removeAttribute('srcdoc');
  }

  run(app, params) {
    if(params && params.url) {
      this.runUnrestricted(params.url);
      return;
    }

    this.sanitize();

    const run = `      
      let params = ${JSON.stringify(params || {})};
            
      ${app.code};     
    `;
    this.#iframe.onload = () => {
      this.#iframe.contentWindow.postMessage({run}, '*');
    }
  }

  registerListeners() {
    this.#overlayContainer.addEventListener('click', () => MessageRouter.onCloseApp('LandingApp'));
  }
}

const sandboxHtml = `
<div id="overlayContainer" class="is-overlay hero">   
    <div class="hero-body">
      <button class="modal-close is-large" aria-label="close"></button>
      <iframe sandbox="allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-top-navigation allow-top-navigation-by-user-activation"
        height="100%" width="100%" src="about:blank" name="sandboxIframe"
        id="sandboxIframe" srcdoc="
          <!DOCTYPE html>
          <html>
          <head>
              <script>
                  window.addEventListener('message', (event) => {
                      const data = event.data;
                      if(data && data.run) {
                        try {
                          eval(data.run);
                        } catch (e) {
                          alert('There was an error while starting the app.  Check console logs for details.')
                          console.error('There was an error while starting the app: ' + e);
                        }
                      }
                  }, false);
              </script>
          </head>
          <body>
            <div style='background-color: #0a0a0a; height: 100%'></div>
          </body>
          </html>">
      </iframe>
    </div>
</div>`;

export default _Sandbox;
