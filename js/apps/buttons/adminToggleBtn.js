import Settings from "../../os/settings.js";
import ScreenStore from "../../os/store/screenStore.js";

class _AdminToggleBtn {
  #toggleBtn

  constructor(container) {
    container.innerHTML = adminToggleBtnHtml;

    const adminToggleBtnEl = container.querySelector('#adminToggleBtn');

    this.#toggleBtn = document.createElement('button');
    this.#toggleBtn.className = "button is-primary";
    this.#toggleBtn.innerText = "Toggle";
    this.#toggleBtn.onclick = () => {};

    adminToggleBtnEl.appendChild(this.#toggleBtn);

    this.setLabel(Settings.get('adminViewVisible'));

    this.registerListeners();
  }

  setLabel(isVisible) {
    if(isVisible) {
     this.#toggleBtn.innerText = "Home"
    } else {
      this.#toggleBtn.innerText = "Admin"
    }
    Settings.update('adminViewVisible', isVisible);
  }

  onToggle() {
    const isVisible = ScreenStore.toggleAdminScreen();
    this.setLabel(isVisible);
  }

  registerListeners() {
    this.#toggleBtn.addEventListener('click', (e) => this.onToggle())
  }
}

const adminToggleBtnHtml = `
<div id="adminToggleBtn">
</div>
`

export default _AdminToggleBtn;
