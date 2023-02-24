import RiverMessenger from "./riverMessenger.js";
import _RouteBalancer from "./workers/routeBalancer.js";
import _MqttWorker from "./workers/mqttWorker.js";
import _NostrWorker from "./workers/nostrWorker.js";
import { logError } from "../utils/logger.js";
import config from "../config.js";

class RiverApi {
  #RiverMessenger;

  constructor() {
    let SignalWorker;

    if (config.signalingNetwork === "nostr") {
      const NostrWorker = new _NostrWorker(
        () => RiverMessenger.onNetworkChange(),
        (node) => RiverMessenger.onConnection(node),
        (data, node) => RiverMessenger.onMessage(data, node)
      );
      SignalWorker = NostrWorker;
    } else if (config.signalingNetwork === "mqtt") {
      const MqttWorker = new _MqttWorker(
        () => RiverMessenger.onNetworkChange(),
        (node) => RiverMessenger.onConnection(node),
        (data, node) => RiverMessenger.onMessage(data, node)
      );

      SignalWorker = MqttWorker;
    } else {
      logError(
        `RiverApi invalid signalingNetwork configured ${config.signalingNetwork}`
      );
    }

    const RouteBalancer = new _RouteBalancer();

    const riverApps = {
      RouteBalancer,
      SignalWorker,
    };

    RiverMessenger.init(riverApps);
    this.#RiverMessenger = RiverMessenger;
  }

  registerOnNodeConnected(onNodeConnected) {
    this.#RiverMessenger.registerOnNodeConnected(onNodeConnected);
  }

  registerOnNetworkChangeHandler(onNetworkChangeHandler) {
    this.#RiverMessenger.registerOnNetworkChangeHandler(onNetworkChangeHandler);
  }

  registerOnDownloadProgressHandler(onDownloadProgressHandler) {
    this.#RiverMessenger.registerOnDownloadProgressHandler(
      onDownloadProgressHandler
    );
  }

  registerHandler(type, handler) {
    this.#RiverMessenger.registerHandler(type, handler);
  }

  connect() {
    this.#RiverMessenger.connect();
  }
}

export default RiverApi;
