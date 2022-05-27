

class _Logger {
  constructor() {
    this.onMsg = () => {};
    this.onError = () => {};
  }

  setOnMsg(onMsg) {
    this.onMsg = onMsg;
  }
  setOnError(onError) {
    this.onError = onError;
  }
}

const Logger = new _Logger();

function logMessage(msg) {
  console.log(msg);
  Logger.onMsg(msg);
}
function logError(msg) {
  console.error(msg);
  Logger.onError(msg);
}

export {logError, logMessage, Logger};
