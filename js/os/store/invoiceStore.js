import DataStore from "./dataStore.js";
import MessageRouter from "../messageRouter.js";
import {logError} from "../../utils/logger.js";
import uuidv4 from "../../utils/uuid.js";
import config from "../../config.js";
import paymentApp from "../../apps/sandboxed/paymentApp.js";
import WalletStore from "./walletStore.js";

class _InvoiceStore {
  #invoices

  constructor() {
    this.#invoices = DataStore.getDocument('invoices') || [];
  }

  watchInvoice(encryptedApp) {
    this.#invoices.push({encryptedApp, date: new Date()});
    DataStore.setDocument('invoices', this.#invoices);
  }

  updateInvoice(appId, encryptionKey) {
    this.#invoices = DataStore.getDocument('invoices');
    const invoice = this.#invoices.reverse().find(i => i.encryptedApp.id === appId);
    const { encryptedApp } = invoice;

    try {
      const app = {
        ...encryptedApp,
        code: CryptoJS.AES.decrypt(encryptedApp.encryptedCode, encryptionKey).toString(CryptoJS.enc.Utf8)
      }

      this.#invoices = this.#invoices.filter(i => i.encryptedApp.id !== appId && (new Date() - config.invoiceExpiration > i.date));

      DataStore.setDocument('invoices', this.#invoices);

      MessageRouter.onInstallApp(app);
      alert(`Installed '${app.name}'`);
    } catch (e) {
      logError(`InvoiceStore Error decrypting app code ${e}}`)
    }
  }

  encryptCode(code, encryptionKey) {
    return CryptoJS.AES.encrypt(code, encryptionKey).toString()
  }

  async purchaseApp(paywalledApp) {

    this.watchInvoice(paywalledApp);

    MessageRouter.onRunApp(paymentApp, {
      appName: paywalledApp.name,
      appId: paywalledApp.id,
      paywall: paywalledApp.paywall,
      apiKey: WalletStore.getPrimaryWalletReadKey(),
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

      const resObj = await res.json();

      return resObj;
    } catch (e) {
      alert("Failed to generate paywall. Please check payment settings.")
      logError("Failed to generate paywall. Please check payment settings.");
    }
  }

}

export default _InvoiceStore;
