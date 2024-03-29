import MessageRouter from "../messaging/messageRouter.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import config from "../../config.js";
import WalletStore from "./walletStore.js";
import KeyValueStore from "./keyValueStore.js";

class _InvoiceStore {
  #invoices

  constructor() {
    this.init();
  }

  async init() {
    this.#invoices = await KeyValueStore.getDocument('invoices') || [];

    // check old invoices
    this.#invoices.map(async (invoice) => {
      let url = null;
      try {
        const status = await this.checkInvoice(invoice.paywalledApp.paywall, invoice.invoice);

        url = status.url;
      } catch (e) {
        logError('There was an error while waiting for payment: ' + e);
      }

      if (url) {
        const urlObj = new URL(url);
        const urlParams = new URLSearchParams(urlObj.search);

        if (urlParams.has('encryptionKey') && urlParams.has('appId')) {
          await this.updateInvoice(urlParams.get('appId'), urlParams.get('encryptionKey'));
        }
      }
    });

    this.#invoices = this.#invoices.filter(i => (new Date() - config.invoiceExpiration > i.date));

  }

  watchInvoice(paywalledApp, invoice) {
    const newInvoice = {paywalledApp, invoice, date: new Date()};
    this.#invoices.push(newInvoice);
    KeyValueStore.setDocument('invoices', this.#invoices);
  }

  async updateInvoice(appId, encryptionKey) {
    this.#invoices = await KeyValueStore.getDocument('invoices');
    const invoice = this.#invoices.reverse().find(i => i.paywalledApp.id === appId);
    const { paywalledApp } = invoice;

    try {
      const app = {
        ...paywalledApp,
        code: CryptoJS.AES.decrypt(paywalledApp.encryptedCode, encryptionKey).toString(CryptoJS.enc.Utf8),
        encryptedCode: undefined,
        paywall: undefined,
      }

      this.#invoices = this.#invoices.filter(i => i.paywalledApp.id !== appId && (new Date() - config.invoiceExpiration > i.date));

      await KeyValueStore.setDocument('invoices', this.#invoices);

      MessageRouter.onInstallApp(app);
      MessageRouter.alert(`Installed '${app.name}'`);
    } catch (e) {
      logError(`InvoiceStore Error decrypting app code ${e}}`)
    }
  }

  async #createInvoice(paywall) {
    try {
      const res = await fetch('https://legend.lnbits.com/paywall/api/v1/paywalls/invoice/' + paywall.id, {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WalletStore.getPrimaryWalletReadKey()
        },
        body: JSON.stringify(
          {
            "amount": paywall.amount,
          }
        ),
        method: "POST"
      });

      return await res.json();
    } catch (e) {
      logError("Failed to generate invoice. Please check payment settings.")
    }
  }

  async checkInvoice(paywall, invoice) {
    try {
      const res = await fetch('https://legend.lnbits.com/paywall/api/v1/paywalls/check_invoice/' + paywall.id, {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WalletStore.getPrimaryWalletReadKey()
        },
        body: JSON.stringify(
          {
            "payment_hash": invoice.payment_hash,
          }
        ),
        method: "POST"
      });

      return  await res.json();
    } catch (e) {
      return {error: e};
    }
  }

  encryptCode(code, encryptionKey) {
    return CryptoJS.AES.encrypt(code, encryptionKey).toString()
  }

  async purchaseApp(paywalledApp) {

    const invoice = await this.#createInvoice(paywalledApp.paywall);

    this.watchInvoice(paywalledApp, invoice);

    MessageRouter.onRunApp({appFileName: 'paymentApp.html'}, {
      appName: paywalledApp.name,
      appId: paywalledApp.id,
      paywall: paywalledApp.paywall,
      apiKey: WalletStore.getPrimaryWalletReadKey(),
      invoice
    });

  }

  async paywallApp(app) {
    const encryptionKey = uuidv4();

    const encryptedCode = this.encryptCode(app.code, encryptionKey);

    const appWallet = await WalletStore.getOrCreateAppWallet(app);

    const paywall = await this.createPaywall(appWallet.readKey, app.id, encryptionKey, app.price);

    return {
      ...app,
      code: null,
      encryptedCode,
      paywall
    }
  }

  async createPaywall(apiKey, appId, encryptionKey, price) {
    try {
      const res = await fetch("https://legend.lnbits.com/paywall/api/v1/paywalls", {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(
          {
            "amount": parseFloat(price),
            "description": 'paywall invoice',
            "memo": 'memo1',
            "remembers": true,
            "url": window.location.href+'?' + new URLSearchParams({encryptionKey, appId}).toString()
          }
        ),
        method: "POST"
      });

      return await res.json();
    } catch (e) {
      logError("Failed to generate paywall. Please check payment settings.");
    }
  }

}

export default _InvoiceStore;
