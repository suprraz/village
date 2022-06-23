import Settings from "../settings.js";
import {show, hide} from "../utils/dom.js";

class _ScreenStore {
  #isAdminViewVisible

  constructor() {
    this.#isAdminViewVisible = Settings.get('adminViewVisible');
    this.updateScreen();
  }

  toggleAdminScreen() {
    this.#isAdminViewVisible = !this.#isAdminViewVisible;
    Settings.update('adminViewVisible', this.#isAdminViewVisible);
    this.updateScreen();
    return this.#isAdminViewVisible;
  }

  updateScreen() {
    if(this.#isAdminViewVisible) {
      hide('homeScreen');
      show('adminScreen');
    } else {
      hide('adminScreen');
      show('homeScreen');
    }
  }
}

const ScreenStore = new _ScreenStore();

export default ScreenStore;
