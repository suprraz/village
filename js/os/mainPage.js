import {hide, show} from "./utils/dom.js";

class _MainPage {
  #navbarBurgersEls
  #navbarMenuBtn
  #storeBtn
  #networkBtn

  constructor() {
    this.#navbarBurgersEls = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    this.#navbarMenuBtn = document.getElementById('navbarMenu');
    this.#storeBtn = document.getElementById('storeTab');
    this.#networkBtn = document.getElementById('networkTab');

    this.#initListeners();
  }

  #initListeners() {
    this.#navbarBurgersEls.forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('is-active');
        this.#navbarMenuBtn.classList.toggle('is-active');
      });
    });

    this.#storeBtn.addEventListener('click', () => {
      this.#hideMenu();
      hide('networkScreen');
      show('appStoreScreen');
      this.#networkBtn.classList.remove('is-tab');
      this.#storeBtn.classList.add('is-tab');
    });

    this.#networkBtn.addEventListener('click', () => {
      this.#hideMenu();
      hide('appStoreScreen');
      show('networkScreen');
      this.#storeBtn.classList.remove('is-tab');
      this.#networkBtn.classList.add('is-tab');
    });
  }

  #hideMenu () {
    this.#navbarBurgersEls.forEach(el => {
      el.classList.remove('is-active');
      this.#navbarMenuBtn.classList.remove('is-active');
    });
  }

}

const MainPage = new _MainPage();

export default MainPage;
