import {logError} from "../../utils/logger.js";
import config from "../../config.js";

const VERSION_FILE_URL = 'js/version.json'

class _UpgradeStore {
  #currentVersion
  #promptedVersion

  constructor() {
    setInterval(() => this.checkForUpgrades(), config.checkForUpgradeFreq);
  }

  async checkForUpgrades() {
    const res = await fetch( VERSION_FILE_URL);
    if (!res.ok) {
      logError('UpgradeStore Failed to verify version');
      return;
    }

    const text = await res.text();
    try {
      const fetchedVersion = JSON.parse((text));

      if(!this.#currentVersion) {
        this.#currentVersion = fetchedVersion;
        return;
      }

      if(fetchedVersion.version > this.#currentVersion.version) {
        if(fetchedVersion.autoUpgrade >= this.#currentVersion.version) {
          window.location.reload();
        } else if (fetchedVersion.promptForUpgrade >= this.#currentVersion.version && fetchedVersion.version !== this.#promptedVersion?.version) {
          const prompt = "A new Village Protocol version is available. Refresh page to upgrade?"
          const shouldReload = window.confirm(prompt);

          if (shouldReload) {
            window.location.reload();
          } else {
            this.#promptedVersion = fetchedVersion;
          }
        }
      }
    } catch (e) {
      logError(e);
    }
  }

}

const UpgradeStore = new _UpgradeStore();

export default UpgradeStore;
