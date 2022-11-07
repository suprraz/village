class _Notify {
  #el
  #promptTitle
  #promptText
  #progressTitle
  #closeBtn
  #cancelBtn
  #okayBtn
  #closeBtnListener
  #cancelBtnListener
  #okayBtnListener
  #promptModal
  #progressModal
  #progressIndicator

  constructor() {
    const container = document.getElementById('notification');
    container.innerHTML = notifyHtml;

    this.#el = container.querySelector('#notifyContainer')
    this.#promptModal = this.#el.querySelector('#promptModal');
    this.#progressModal = this.#el.querySelector('#progressModal');

    this.#promptTitle = this.#el.querySelector('.promptTitle');
    this.#progressTitle = this.#el.querySelector('.progressTitle');
    this.#promptText = this.#el.querySelector('.notifyText');
    this.#closeBtn = this.#el.querySelector('.notifyClose');
    this.#cancelBtn = this.#el.querySelector('.notifyCancel');
    this.#okayBtn = this.#el.querySelector('.notifyOkay');

    this.#progressIndicator = this.#el.querySelector('.progressIndicator');
  }

  alert(text) {
    this.#progressModal.classList.remove('is-active');
    this.#promptModal.classList.add('is-active');
    this.#promptTitle.innerText = 'Alert';
    this.#promptText.innerText = text;
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
    this.#progressModal.classList.remove('is-active');
    this.#promptModal.classList.add('is-active');
    this.#promptTitle.innerText = 'Confirm';
    this.#promptText.innerText = text;
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

  progress(text, value, total) {
    this.#promptTitle.innerText = text;
    this.#promptModal.classList.remove('is-active');
    this.#progressModal.classList.add('is-active');
    this.#promptTitle.innerText = 'Progress';
    this.#progressTitle.innerText = text;
    this.#progressIndicator.setAttribute('value', value);
    this.#progressIndicator.setAttribute('max', total);
    this.#el.classList.remove('is-hidden');

    if(typeof value !== 'number' || typeof total !== 'number' || total === 0 || value > total) {
      this.close();
    }
  }

  close() {
    this.#el.classList.add('is-hidden');
    this.#closeBtn.removeEventListener('click', this.#closeBtnListener);
    this.#cancelBtn.removeEventListener('click', this.#cancelBtnListener);
    this.#okayBtn.removeEventListener('click', this.#okayBtnListener);
  }
}

const notifyHtml = `
<div id="notifyContainer" class="is-overlay hero is-hidden">   
  <div id="promptModal" class="modal">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title promptTitle">Alert</p>
        <button class="delete notifyClose" aria-label="close"></button>
      </header>
      <section class="modal-card-body">
        <p class="is-size-4 notifyText"></p>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success notifyOkay">Okay</button>
        <button class="button notifyCancel">Cancel</button>
      </footer>
    </div>
  </div>
  <div id="progressModal" class="modal">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title progressTitle">Progress</p>
      </header>
      <section class="modal-card-body">
        <progress class="progress is-large is-info progressIndicator" value="0" max="100"></progress>
      </section>
      <footer class="modal-card-foot">
      </footer>
    </div>
  </div>
</div>
`;

const Notify = new _Notify();

export default Notify;
