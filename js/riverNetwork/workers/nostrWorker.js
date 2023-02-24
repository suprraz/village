import config from "../../config.js";
import nostrConfig from "../../nostrConfig.js";
import Profile from "../profile.js";
import { logError, logMessage } from "../../utils/logger.js";
import _Node from "../node.js";
import NodeStore from "../nodeStore.js";
import Settings from "../../os/settings.js";

class _NostrWorker {
  #onNetworkChangeHandler;
  #onConnectionHandler;
  #onMessageHandler;
  #relay;
  #broadcastTopic;
  #msgTopic;
  #nostrRelayUrl;
  #connectingNodes;
  #requestedNodes;

  constructor(onNetworkChangeHandler, onConnectionHandler, onMessageHandler) {
    this.#onNetworkChangeHandler = onNetworkChangeHandler;
    this.#onConnectionHandler = onConnectionHandler;
    this.#onMessageHandler = onMessageHandler;

    this.#relay = null;
    this.#broadcastTopic = `${config.appNameConcat}Pub`;
    this.#msgTopic = `${config.appNameConcat}Msg`;

    this.#connectingNodes = [];
    this.#requestedNodes = [];
  }

  prepareKey() {
    if (!Settings.get("nostrSecretKey")) {
      Settings.update("nostrSecretKey", NostrTools.generatePrivateKey());
    }
  }

  async seekNodes() {
    this.#nostrRelayUrl =
      nostrConfig.relays[Math.floor(Math.random() * nostrConfig.relays.length)];

    if (this.#connectingNodes.length >= nostrConfig.parallelReqs) {
      return;
    }

    this.prepareKey();

    logMessage("NOSTR Seeking nodes");
    if (this.#relay) {
      logMessage("NOSTR Client ready");
      this.broadcastAvailable();
    } else {
      logMessage(
        `NOSTR Initializing connection with relay url ${this.#nostrRelayUrl}`
      );
      try {
        this.#relay = NostrTools.relayInit(this.#nostrRelayUrl);

        this.#relay.on("connect", () => {
          logMessage(`NOSTR Connected to ${this.#relay.url}`);

          this.registerListeners();
          this.broadcastAvailable();
        });
        this.#relay.on("error", () => {
          logError(`NOSTR Failed to connect to ${this.#relay.url}`);
          setTimeout(() => {
            this.#relay = null;
            this.seekNodes();
          }, nostrConfig.tryNewRelayTimeout);
        });

        await this.#relay.connect();
      } catch (e) {
        throw e;
      }
    }
  }

  onMessage(e, senderNode) {
    if (e.data) {
      try {
        const data = JSON.parse(e.data);

        this.#onMessageHandler(data, senderNode);
      } catch (e) {
        logError(`NOSTR message receive error: ${e}`);
      }
    }
  }

  onMsgNotif(payload, fromPk) {
    try {
      const message = JSON.parse(payload);
      if (message.toId === Profile.getNodeID()) {
        logMessage("NOSTR Received message");
        this.parseMessage(message, fromPk);
      }
    } catch (e) {
      logError(`NOSTR notification error: ${e}`);
    }
  }

  onBcastNotif(payload, fromPk) {
    try {
      const message = JSON.parse(payload);

      if (message.fromId === Profile.getNodeID()) {
        return;
      }
      logMessage("NOSTR Received broadcast");
      this.parseBroadcast(message, fromPk);
    } catch (e) {
      logError(`NOSTR broadcast receive error: ${e}`);
    }
  }

  async acceptOffer(message, toPk) {
    if (
      message.fromId !== Profile.getNodeID() &&
      !NodeStore.getNodeById(message.fromId)
    ) {
      let answerKey = null;
      try {
        const node = new _Node({
          nodeId: message.fromId,
          onConnection: (node) => this.#onConnectionHandler(node),
          onMessage: (data, node) => this.onMessage(data, node),
          signalProtocol: "nostr",
        });

        answerKey = await node.acceptOffer(message.offerKey);

        this.#connectingNodes = this.#connectingNodes.filter(
          (nId) => nId !== message.fromId
        );
        this.#requestedNodes = this.#requestedNodes.filter(
          (nId) => nId !== message.fromId
        );

        if (NodeStore.getNodeById(message.fromId)) {
          logMessage(`NOSTR terminating node duplicate ${message.fromId}`);
          node.terminate();
          return;
        }

        NodeStore.addNode(node);

        const answerMsg = {
          fromId: Profile.getNodeID(),
          toId: message.fromId,
          type: "answer-key",
          date: new Date(),
          answerKey,
        };

        logMessage(`NOSTR sending answer to ${message.fromId}`);
        await this.sendMessage(message.fromId, toPk, answerMsg);
      } catch (e) {
        throw new Error(e);
      }
    }
  }

  async onAnswer(message) {
    logMessage(`NOSTR received answer from ${message.fromId}`);

    this.#connectingNodes = this.#connectingNodes.filter(
      (nId) => nId !== message.fromId
    );
    this.#requestedNodes = this.#requestedNodes.filter(
      (nId) => nId !== message.fromId
    );

    if (message.fromId !== Profile.getNodeID()) {
      try {
        const connectionObj = JSON.parse(atob(message.answerKey));

        const node = NodeStore.getNodeById(message.fromId);

        if (node) {
          node.setRemoteDescription(connectionObj);
        }
      } catch (e) {
        logError(e);
      }
    }
  }

  onCandidate(message) {
    try {
      const node = NodeStore.getNodeById(message.fromId);
      if (node) {
        logMessage(
          `NOSTR Adding Ice candidate to ${node?.getProfile()?.nodeId}`
        );
        node.addIceCandidate(message.candidate);
      }
    } catch (e) {
      logError(e);
    }
  }

  async sendOffer(toId, toPk) {
    if (
      toId !== Profile.getNodeID() &&
      !NodeStore.getNodeById(toId) &&
      !this.#connectingNodes.includes(toId)
    ) {
      this.#connectingNodes.push(toId);

      setTimeout(() => {
        this.#connectingNodes = this.#connectingNodes.filter(
          (nId) => nId !== toId
        );
      }, config.RTC.handshakeTimeout);

      try {
        const node = new _Node({
          nodeId: toId,
          onConnection: (node) => this.#onConnectionHandler(node),
          onMessage: (data, node) => this.onMessage(data, node),
          signalProtocol: "nostr",
        });

        const offerKey = await node.createOffer();

        this.#connectingNodes = this.#connectingNodes.filter(
          (nId) => nId !== toId
        );
        if (NodeStore.getNodeById(toId)) {
          logMessage(`NOSTR terminating node duplicate ${toId}`);
          node.terminate();
          return;
        }

        NodeStore.addNode(node);

        const offerMsg = {
          type: "offer-key",
          fromId: Profile.getNodeID(),
          toId,
          date: new Date(),
          offerKey,
        };

        logMessage(`NOSTR Sending offer to ${toId}`);
        await this.sendMessage(toId, toPk, offerMsg);
      } catch (e) {
        logError(e);
      }
    }
  }

  registerListeners() {
    logMessage("NOSTR Registering listeners");

    const broadcastSub = this.#relay.sub([
      {
        kinds: [1],
        "#t": [this.#broadcastTopic],
      },
    ]);

    const messageSub = this.#relay.sub([
      {
        kinds: [4],
        "#t": [this.#msgTopic],
      },
    ]);

    broadcastSub.on("event", (event) => {
      this.onBcastNotif(event.content, event.pubkey);
    });

    messageSub.on("event", async (event) => {
      const toPk = event.tags.find(([k, v]) => k === "p" && v && v !== "")[1];

      if (toPk === NostrTools.getPublicKey(Settings.get("nostrSecretKey"))) {
        let plaintext = await NostrTools.nip04.decrypt(
          Settings.get("nostrSecretKey"),
          event.pubkey,
          event.content
        );
        this.onMsgNotif(plaintext, event.pubkey);
      }
    });
  }

  broadcastAvailable() {
    const message = {
      type: "available",
      fromId: Profile.getNodeID(),
      date: new Date(),
    };

    logMessage(`NOSTR Broadcasting available, source: ${Profile.getNodeID()}`);
    this.broadcastMessage(message);
  }

  channelAvailable(toId, toPk) {
    if (
      NodeStore.getNodeById(toId) ||
      toId === Profile.getNodeID() ||
      this.#connectingNodes.includes(toId) ||
      this.#requestedNodes.includes(toId)
    ) {
      return;
    }

    if (
      NodeStore.getNodes().length < config.maxConnectedNeighbors &&
      this.#requestedNodes.length < nostrConfig.parallelReqs
    ) {
      this.#requestedNodes.push(toId);
      setTimeout(() => {
        this.#requestedNodes = this.#requestedNodes.filter(
          (nId) => nId !== toId
        );
      }, config.RTC.handshakeTimeout);

      logMessage(`NOSTR sending channel-available to ${toId}`);
      this.sendMessage(toId, toPk, {
        type: "channel-available",
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  channelRequest(toId, toPk) {
    if (
      this.#connectingNodes.length < nostrConfig.parallelReqs &&
      !NodeStore.getNodeById(toId) &&
      !this.#connectingNodes.includes(toId) &&
      !this.#requestedNodes.includes(toId)
    ) {
      this.#requestedNodes.push(toId);
      setTimeout(() => {
        this.#requestedNodes = this.#requestedNodes.filter(
          (nId) => nId !== toId
        );
      }, config.RTC.handshakeTimeout);

      logMessage(`NOSTR Sending channel-request to: ${toId}`);

      this.sendMessage(toId, toPk, {
        type: "channel-request",
        fromId: Profile.getNodeID(),
        toId,
        date: new Date(),
      });
    }
  }

  async sendMessage(toId, toPk, message) {
    const cipherText = await NostrTools.nip04.encrypt(
      Settings.get("nostrSecretKey"),
      toPk,
      JSON.stringify(message)
    );
    const event = {
      kind: 4,
      pubkey: NostrTools.getPublicKey(Settings.get("nostrSecretKey")),
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", this.#msgTopic],
        ["p", toPk],
      ],
      content: cipherText,
    };

    event.id = NostrTools.getEventHash(event);
    event.sig = NostrTools.signEvent(event, Settings.get("nostrSecretKey"));

    const pub = this.#relay.publish(event);

    logMessage(
      `NOSTR ${this.#relay.url} event message published from ${event.pubkey} ${
        message.type
      }`
    );

    pub.on("ok", () => {
      logMessage(`NOSTR ${this.#relay.url} has accepted our message event`);
    });
    pub.on("failed", (reason) => {
      logError(`NOSTR failed to publish to ${this.#relay.url}: ${reason}`);
    });
  }

  broadcastMessage(message) {
    const event = {
      kind: 1,
      pubkey: NostrTools.getPublicKey(Settings.get("nostrSecretKey")),
      created_at: Math.floor(Date.now() / 1000),
      tags: [["t", this.#broadcastTopic]],
      content: JSON.stringify(message),
    };

    event.id = NostrTools.getEventHash(event);
    event.sig = NostrTools.signEvent(event, Settings.get("nostrSecretKey"));

    const pub = this.#relay.publish(event);

    logMessage(`NOSTR ${this.#relay.url} event published from ${event.pubkey}`);

    pub.on("ok", () => {
      logMessage(`NOSTR ${this.#relay.url} has accepted our broadcast event`);
    });
    pub.on("failed", (reason) => {
      logError(
        `NOSTR failed to publish broadcast to ${this.#relay.url}: ${reason}`
      );
    });
  }

  parseBroadcast(message, fromPk) {
    logMessage("NOSTR Parsing broadcast from: " + message.fromId);
    switch (message.type) {
      case "available":
        this.channelAvailable(message.fromId, fromPk);
        break;
    }
  }

  parseMessage(message, fromPk) {
    logMessage("NOSTR Parsing message of type: " + message.type);
    switch (message.type) {
      case "channel-available":
        this.channelRequest(message.fromId, fromPk);
        break;
      case "channel-request":
        this.sendOffer(message.fromId, fromPk);
        break;
      case "offer-key":
        this.acceptOffer(message, fromPk);
        break;
      case "answer-key":
        this.onAnswer(message);
        break;
      case "candidate":
        this.onCandidate(message);
        break;
      default:
        break;
    }
  }
}

export default _NostrWorker;
