import Profile from "./store/profile.js";


class _MessageRouter {

  init (coreApps, onConnection) {
    this.coreApps = coreApps;
    this.callerOnConnection = (node) => onConnection(node);
  }

  onMessage (data, node) {
    if (data.msg) {
      this.coreApps.Chat.messageReceived(data);
    } else if (data.code) {
      this.coreApps.Editor.updateCode(data.code);
      eval(data.code);
    } else if (data.apps) {
      this.coreApps.AppListApp.onAvailableApps(data.apps);
    } else if (data.profile) {
      node.updateProfile(data.profile);
    }
  }

  onConnection(node) {
    node.send({profile: Profile.getShareable()});

    this.callerOnConnection(node);
  }

}

const MessageRouter = new _MessageRouter();

export default MessageRouter;
