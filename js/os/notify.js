class _Notify {
  #el
  #text
  #closeBtn
  #cancelBtn
  #okayBtn
  #closeBtnListener
  #cancelBtnListener
  #okayBtnListener

  constructor() {
    const container = document.getElementById('notification');
    container.innerHTML = notifyHtml;
    this.#el = container.querySelector('#notifyContainer')
    this.#text = this.#el.querySelector('#notifyText');
    this.#closeBtn = this.#el.querySelector('#notifyClose');
    this.#cancelBtn = this.#el.querySelector('#notifyCancel');
    this.#okayBtn = this.#el.querySelector('#notifyOkay');

    this.registerListeners();
  }

  alert(text) {
    this.#text.innerText = text;
    this.#cancelBtn.classList.add('is-hidden');
    this.#el.classList.remove('is-hidden');

    this.#closeBtnListener = () => this.close();
    this.#cancelBtnListener = () => this.close();
    this.#okayBtnListener = () => this.close();

    this.#closeBtn.addEventListener('click', this.#closeBtnListener);
    this.#cancelBtn.addEventListener('click', this.#cancelBtnListener);
    this.#okayBtn.addEventListener('click', this.#okayBtnListener);
  }

  confirm(text, onConfirm, onCancel) {
    this.#text.innerText = text;
    this.#cancelBtn.classList.remove('is-hidden');
    this.#el.classList.remove('is-hidden');

    this.#closeBtn.addEventListener('click', () => {
      this.close();
      if(typeof onCancel === 'function') {
        onCancel();
      }
    });
    this.#cancelBtn.addEventListener('click', () => {
      this.close();
      if(typeof onCancel === 'function') {
        onCancel();
      }
    });
    this.#okayBtn.addEventListener('click', () => {
      this.close();
      if(typeof onConfirm === 'function') {
        onConfirm();
      }
    });
  }

  close() {
    this.#el.classList.add('is-hidden');
    this.#closeBtn.removeEventListener('click', this.#closeBtnListener);
    this.#cancelBtn.removeEventListener('click', this.#cancelBtnListener);
    this.#okayBtn.removeEventListener('click', this.#okayBtnListener);
  }


  registerListeners() {

  }
}

const notifyHtml = `
<div id="notifyContainer" class="is-overlay hero is-hidden">   
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Alert</p>
        <button id="notifyClose" class="delete" aria-label="close"></button>
      </header>
      <section class="modal-card-body">
        <p class="is-size-4" id="notifyText"></p>
      </section>
      <footer class="modal-card-foot">
        <button id="notifyOkay" class="button is-success">Okay</button>
        <button id="notifyCancel" class="button">Cancel</button>
      </footer>
    </div>
  </div>
</div>
`;

const Notify = new _Notify();

export default Notify;
