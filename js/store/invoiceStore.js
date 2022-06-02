import DataStore from "./dataStore.js";
import MessageRouter from "../messageRouter.js";
import {logError} from "../utils/logger.js";
import unrestrictedApp from "../apps/sandboxed/unrestrictedApp.js";
import uuidv4 from "../utils/uuid.js";
import config from "../config.js";

class _InvoiceStore {
  constructor() {
    this.invoices = DataStore.getDocument('invoices') || [];
  }

  watchInvoice(encryptedApp, invoice) {
    this.invoices.push({...invoice, encryptedApp, date: new Date()});
    DataStore.setDocument('invoices', this.invoices);
  }

  updateInvoice(appName, encryptionKey) {
    this.invoices = DataStore.getDocument('invoices');
    const invoice = this.invoices.reverse().find(i => i.encryptedApp.name === appName);
    const { encryptedApp } = invoice;

    try {
      const app = {
        ...encryptedApp,
        code: CryptoJS.AES.decrypt(encryptedApp.code, encryptionKey).toString(CryptoJS.enc.Utf8)
      }

      this.invoices = this.invoices.filter(i => i.encryptedApp.name !== appName && (new Date() - config.invoiceExpiration > i.date));

      DataStore.setDocument('invoices', this.invoices);

      MessageRouter.onInstallApp(app);
      alert(`Installed '${app.name}'`);
    } catch (e) {
      logError(`InvoiceStore Error decrypting app code ${e}}`)
    }
  }

  encryptApp(app, encryptionKey) {
    const encryptedApp = {
      ...app,
      code: CryptoJS.AES.encrypt(app.code, encryptionKey).toString()
    };
    return encryptedApp;
  }

  async purchaseApp(app) {
    const encryptionKey = uuidv4();
    const encryptedApp = this.encryptApp(app, encryptionKey);

    const invoice = await this.createInvoice(encryptedApp.name, encryptionKey);

    this.watchInvoice(encryptedApp, invoice);

    const { invoiceId, invoiceUrl } = invoice;

    MessageRouter.onRunApp(unrestrictedApp, {url: invoiceUrl});
  }

  async createInvoice(appName, encryptionKey) {
    try {
      const res = await fetch("https://pay.invad.com/api/v1/invoices", {
        "headers": {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        "body":
          new URLSearchParams({
            storeId: '6M2uJbthezgNYNyFAFe1xYp1hXexydswYaULjM613TDU',
            browserRedirect: window.location.href+'?' +
              new URLSearchParams({encryptionKey, appName}).toString(),
            price: '0.000000001',
            currency: 'BTC',
            jsonResponse: true
          }).toString(),
        "method": "POST"
      });

      const resObj = await res.json();

      return resObj;
    } catch (e) {
      alert("Failed to generate invoice. Please check payment settings.")
      logError("Failed to generate invoice. Please check payment settings.");
    }
  }

}

export default _InvoiceStore;
