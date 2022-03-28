class _Sandbox {
  constructor() {
    this.sandboxContainer = document.getElementById('sandbox');
    this.contentWindow = null;
    this.overlayContainer = null;
    this.iframe = null;
  }

  sanitize() {
    this.stop();
    this.sandboxContainer.innerHTML = sandboxHtml;

    this.iframe = this.sandboxContainer.querySelector("#sandboxIframe");
    this.overlayContainer = this.sandboxContainer.querySelector("#overlayContainer");

    this.registerListeners();
  }

  stop() {
    while (this.sandboxContainer.firstChild) {
      // remove all children and listeners
      this.sandboxContainer.removeChild(this.sandboxContainer.firstChild);
    }
  }

  run(app) {
    this.sanitize();
    this.iframe.onload = () => {
      this.iframe.contentWindow.postMessage({run: app.code}, '*');
    }
  }

  registerListeners() {
    this.overlayContainer.addEventListener('click', () => this.stop());
  }
}

const sandboxHtml = `
<div id="overlayContainer" class="is-overlay hero">   
    <div class="hero-body">
      <button class="modal-close is-large" aria-label="close"></button>
      <iframe sandbox="allow-popups allow-scripts allow-popups-to-escape-sandbox allow-modals"
              height="100" width="100%" src="about:blank" name="sandboxIframe"
              id="sandboxIframe" srcdoc="
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <script>
                          window.addEventListener('message', (event) => {
                              const data = event.data;
                              if(data && data.run) {
                                  eval(data.run);
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
