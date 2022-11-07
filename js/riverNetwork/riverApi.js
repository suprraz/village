import RiverMessenger from "./riverMessenger.js";
import _RouteBalancer from "./workers/routeBalancer.js";
import _MqttWorker from "./workers/mqttWorker.js";

class RiverApi {
  #RiverMessenger

  constructor() {
    const MqttWorker = new _MqttWorker(
      () => RiverMessenger.onNetworkChange(),
      (node) => RiverMessenger.onConnection(node),
      (data, node) => RiverMessenger.onMessage(data, node));
    const RouteBalancer = new _RouteBalancer();

    const riverApps = {
      RouteBalancer,
      MqttWorker,
    }

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
    this.#RiverMessenger.registerOnDownloadProgressHandler(onDownloadProgressHandler);
  }

  registerHandler(type, handler) {
    this.#RiverMessenger.registerHandler(type, handler);
  }

  connect() {
    this.#RiverMessenger.connect();
  }

}


export default RiverApi;
