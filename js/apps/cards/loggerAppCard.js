import { Logger } from "../../utils/logger.js";
import config from "../../config.js";
import Settings from "../../settings.js";

class _LoggerCardApp {
  constructor(el) {
    this.log = [];

    const loggerCardAppContainer = el;
    loggerCardAppContainer.innerHTML = loggerCardAppHtml;

    this.loggerTextArea = loggerCardAppContainer.querySelector('#logger');
    this.loggerEnabled = loggerCardAppContainer.querySelector('#loggerEnabled');

    const isLoggingEnabled = Settings.get('enableLogging');
    this.setEnabled(isLoggingEnabled);
    this.loggerEnabled.checked = isLoggingEnabled;

    this.registerListeners();
  }

  setEnabled(isEnabled) {
    if(isEnabled) {
      Logger.setOnMsg((msg) => this.printMsg(msg));
      Logger.setOnError((error) => this.printErr(error));
    } else {
      Logger.setOnMsg(() => {});
      Logger.setOnError(() => {});
    }
  }

  updateLog() {
    const shouldScroll = this.loggerTextArea.scrollTop >= this.loggerTextArea.scrollHeight - this.loggerTextArea.offsetHeight;

    this.loggerTextArea.value = this.log.join('\n');

    if(shouldScroll) {
      this.loggerTextArea.scrollTop = this.loggerTextArea.scrollHeight;
    }
  }

  printMsg(msg){
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit', hour12: false});
    this.log.push(`${time} ${msg}`);
    this.log = this.log.slice(0-config.maxLogSize);
    this.updateLog();
  }

  printErr(err){
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit', hour12: false});
    this.log.push(`${time} ! ${err}`);
    this.log = this.log.slice(0-config.maxLogSize);
    this.updateLog();
  }

  registerListeners() {
    this.loggerEnabled.addEventListener("change", (event) => {
      Settings.update('enableLogging', event.target.checked);
      this.setEnabled(event.target.checked);
    })
  }
}

const loggerCardAppHtml = `
<div id="loggerCardApp" class="content">
    <p class="title">Logs</p>
    <div class="loggerCardApplog" id="loggerCardApplog"></div>

  <div>
    <label class="checkbox">
      <input id="loggerEnabled" type="checkbox" value="checked" />
      Logging enabled
    </label>
    
    <textarea id="logger" class="textarea my-2" style="white-space: pre" rows="20" cols="30"> </textarea>
    
  </div>  
</div>
`

export default _LoggerCardApp;
