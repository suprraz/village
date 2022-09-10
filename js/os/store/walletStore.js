import {logError} from "../../utils/logger.js";
import config from "../../config.js";

const WALLET_NAME = "Village Wallet";

class _WalletStore {
  #walletStoreDb
  #primaryWallet = {
    userId: null,
    walletId: null,
    adminKey: null,
    readKey: null,
  };
  #secondaryWallet = {
    userId: null,
    walletId: null,
    adminKey: null,
    readKey: null,
  };

  constructor() {
    this.#walletStoreDb = new Dexie("WalletStore");
    this.#setWalletStoreSchema();

    this.getPrimaryWalletReadKey();
    this.getSecondaryWalletReadKey();
  }

  async getPrimaryWalletReadKey() {
    if(!this.#primaryWallet.readKey) {
      await this.#loadOrCreatePrimaryWallet();
    }
    return this.#primaryWallet.readKey;
  }

  async getSecondaryWalletReadKey() {
    if(!this.#secondaryWallet.readKey) {
      await this.#loadOrCreateSecondaryWallet();
    }
    return this.#secondaryWallet.readKey;
  }

  async getPrimaryWalletId() {
    if(!this.#primaryWallet.walletId) {
      await this.#loadOrCreatePrimaryWallet();
    }
    return this.#primaryWallet.walletId;
  }

  async getOrCreateAppWallet(app) {
    let wallet = await this.#getAppWallet(app.id);
    if(!wallet) {
      wallet = await this.#createWallet(`Wallet for '${app.name}' payouts`);
      if(wallet) {
        wallet.appId = app.id;

        const splitPaymentsEnabled = await this.#activateExtensionForWallet(wallet, 'splitpayments')
        const paywallEnabled = await this.#activateExtensionForWallet(wallet, 'paywall')

        if (splitPaymentsEnabled && paywallEnabled) {
          await this.#splitPayments(wallet, app);

          await this.#saveAppIdWallet(wallet);
        }
      }
    }

    return wallet;
  }

  async getPrimaryWalletBalance() {
    return this.#getWalletBalance(await this.#loadOrCreatePrimaryWallet());
  }

  async getSecondaryWalletBalance() {
    return this.#getWalletBalance(await this.#loadOrCreateSecondaryWallet());
  }

  async #getWalletBalance(wallet) {
    const res = await fetch('https://legend.lnbits.com/api/v1/wallet', {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wallet.readKey
      }
    })

    if(res.ok) {
      let walletDetails = await res.json();

      return walletDetails.balance;

    } else {
      logError('WalletStore Error getting wallet balance')
      throw 'Error getting wallet balance';
    }
  }

  async #splitPayments(wallet, app) {
    let targets;
    if(app.authorWalletId === this.#secondaryWallet.walletId) {
      targets = [
        {
          wallet: app.authorWalletId,
          alias: 'Developer rev share for ' + app.name,
          percent: 80
        },
        {
          wallet: config.lnbits.villageWalletId,
          alias: 'Platform rev share for ' + app.name,
          percent: 20
        }
      ]
    } else {
      targets = [
        {
          wallet: app.authorWalletId,
          alias: 'Developer rev share for ' + app.name,
          percent: 70
        },
        {
          wallet: config.lnbits.villageWalletId,
          alias: 'Platform rev share for ' + app.name,
          percent: 20
        },
        {
          wallet: this.#secondaryWallet.walletId,
          alias: 'Broker (me) rev share for ' + app.name,
          percent: 10
        },
      ]
    }

    const res = await fetch('https://legend.lnbits.com/splitpayments/api/v1/targets', {
      method: 'PUT',
      body: JSON.stringify({
        targets,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wallet.adminKey
      }
    })

    return res.ok;
  }

  async #activateExtensionForWallet (wallet, extensionName) {
    const res = await fetch('https://legend.lnbits.com/usermanager/api/v1/extensions', {
      method: 'POST',
      body: JSON.stringify({
        userid: wallet.userId,
        extension: extensionName,
        active: 1
      }),

      // Adding headers to the request
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wallet.adminKey
      }
    });

    return res.ok;
  }

  #setWalletStoreSchema() {
    try {
      this.#walletStoreDb.version(2).stores({
        wallets: `id, type, userId, adminKey, readKey, appId`
      });

    } catch (e) {
      logError(`WalletStore Error ${e}`);
    }
  }

  async #getAppWallet(appId) {
    const query = this.#walletStoreDb.wallets.where({type: 'appWallet', appId});
    const results = await query.toArray();

    if(results.length) {
      return {
        userId: results[0].userId,
        walletId: results[0].id,
        adminKey: results[0].adminKey,
        readKey: results[0].readKey,
        appId: results[0].appId,
      };
    }

    return null;
  }

  async #getPrimaryWallet() {
    const query = this.#walletStoreDb.wallets.where({type: 'primary'});
    const results = await query.toArray();

    if(results.length) {
      return {
        userId: results[0].userId,
        walletId: results[0].id,
        adminKey: results[0].adminKey,
        readKey: results[0].readKey,
      };
    }

    return null;
  }

  async #getSecondaryWallet() {
    const query = this.#walletStoreDb.wallets.where({type: 'secondary'});
    const results = await query.toArray();

    if(results.length) {
      return {
        userId: results[0].userId,
        walletId: results[0].id,
        adminKey: results[0].adminKey,
        readKey: results[0].readKey,
      };
    }

    return null;
  }

  async #saveAppIdWallet(wallet) {
    return this.#walletStoreDb.wallets.put({
      id: wallet.walletId,
      type: 'appWallet',
      userId: wallet.userId,
      adminKey: wallet.adminKey,
      readKey: wallet.readKey,
      appId: wallet.appId,
    });
  }

  async #savePrimaryWallet() {
    return this.#walletStoreDb.wallets.put({
      id: this.#primaryWallet.walletId,
      type: 'primary',
      userId: this.#primaryWallet.userId,
      adminKey: this.#primaryWallet.adminKey,
      readKey: this.#primaryWallet.readKey,
      appId: null,
    });
  }

  async #saveSecondaryWallet() {
    return this.#walletStoreDb.wallets.put({
      id: this.#secondaryWallet.walletId,
      type: 'secondary',
      userId: this.#secondaryWallet.userId,
      adminKey: this.#secondaryWallet.adminKey,
      readKey: this.#secondaryWallet.readKey,
      appId: null,
    });
  }

  async #loadOrCreatePrimaryWallet() {
    this.#primaryWallet = await this.#getPrimaryWallet();
    if(this.#primaryWallet) {
      return this.#primaryWallet;
    } else {
      this.#primaryWallet = await this.#createWallet(WALLET_NAME);

      if(this.#primaryWallet) {
        await this.#savePrimaryWallet();
        return this.#primaryWallet;
      }
    }

    return null;
  }

  async #loadOrCreateSecondaryWallet() {
    this.#secondaryWallet = await this.#getSecondaryWallet();
    if(this.#secondaryWallet) {
      return this.#secondaryWallet;
    } else {
      this.#secondaryWallet = await this.#createWallet(WALLET_NAME);

      if(this.#secondaryWallet) {
        await this.#saveSecondaryWallet();
        return this.#secondaryWallet;
      }
    }

    return null;
  }

  async #createWallet(name) {
    let wallet = null;

    const res = await fetch("https://legend.lnbits.com/wallet?nme=" + encodeURIComponent(name), {
      "headers": {
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.5",
      },
      "method": "GET",
      "mode": "cors"
    });

    if(res.url) {
      let url = new URL(res.url);
      const userId = url.searchParams.get("usr");
      const walletId = url.searchParams.get("wal");

      const res2 = await fetch(res.url, {
        "headers": {
          "Accept": "text/html",
          "Accept-Language": "en-US,en;q=0.5",
        },
        "method": "GET",
        "mode": "cors"
      });

      const html = await res2.text();

      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(html, 'text/html');

      const apiInfoItems = htmlDoc.querySelectorAll('[label="API info"] > q-card-section > em');

      if(apiInfoItems && apiInfoItems.length === 3) {
        wallet = {
          userId,
          walletId,
          adminKey: apiInfoItems[1].innerText,
          readKey: apiInfoItems[2].innerText
        };

        return wallet;
      }
    }
  }

}

const WalletStore = new _WalletStore();

export default WalletStore;
