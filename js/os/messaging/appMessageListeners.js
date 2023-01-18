import Settings from "../settings.js";
import AppStore from "../store/appStore.js";
import NodeStore from "../../riverNetwork/nodeStore.js";
import {logError} from "../../utils/logger.js";
import MessageRouter from "./messageRouter.js";

function hideLanding(data) {
  if(data.payload.sourceApp === 'landingAppId') {
    Settings.update('showLanding', false);
  }
}

function closeApp(data) {
  MessageRouter.onCloseApp(data.payload.sourceApp);
  if(data.payload.sourceApp === 'landingAppId') {
    MessageRouter.onNetworkChange();
  }
}

async function saveAndRunApp(coreApps,data) {
  if (data.payload.runAfterSave) {
    MessageRouter.onCloseApp(data.payload.sourceApp);
  }

  await AppStore.updateApp(data.payload.app, data.payload.runAfterSave);

  await coreApps.AppListCard.updateAppList();
}

async function saveData(coreApps, data) {
  try {
    await coreApps.SandboxStore.save(coreApps.Sandbox.getRunningAppId(), data.payload?.key, data.payload?.value);
    coreApps.Sandbox.postMessage({type: 'saveDataSuccess', payload: data.payload})
  } catch (e) {
    coreApps.Sandbox.postMessage({type: 'saveDataFailure', payload: data.payload})
  }
}

async function readData(coreApps, data) {
  const { key } = data?.payload;
  try {
    const storedObject = await coreApps.SandboxStore.read(coreApps.Sandbox.getRunningAppId(), data.payload.key);
    coreApps.Sandbox.postMessage({type: 'readDataSuccess', payload: {key, value: storedObject.value}});
  } catch (e) {
    coreApps.Sandbox.postMessage({type: 'readDataFailure', payload: data.payload})
  }
}

function broadcastMessage(coreApps, data) {
  NodeStore.broadcast({
    app: coreApps.Sandbox.getRunningAppId(),
    payload: data?.payload,
    type: 'app'
  });
}

function appOwnerMessage(coreApps, data) {
  const appId = coreApps.Sandbox.getRunningAppId();

  if(data.destinationId) {
    NodeStore.sendMsg({
      app: appId,
      payload: data?.payload,
      type: 'app'
    }, data.destinationId);
  }
}

function appOwnerMulticast(coreApps, data) {
  const appId = coreApps.Sandbox.getRunningAppId();
  const nodeIds = coreApps.AppListCard.getOwnerNodeIds(appId);

  NodeStore.multicast({
    app: appId,
    payload: data?.payload,
    type: 'app'
  }, nodeIds);
}


async function invoicePaid(coreApps, data) {
  await coreApps.InvoiceStore.updateInvoice(data.payload.appId, data.payload.encryptionKey);
}

function showAlert(data) {
  if (typeof data.payload?.alertMsg === "string") {
    MessageRouter.alert(data.payload.alertMsg);
  }
}

function showProgress(data) {
  if (typeof data.payload?.progressLabel === "string" && typeof data.payload?.progressValue === "number" && typeof data.payload?.progressTotal === "number") {
    MessageRouter.progress( data.payload.progressLabel, data.payload.progressValue, data.payload.progressTotal );
  }
}


export default function registerAppMessageListeners(coreApps) {
  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (data) {
      switch (data.type) {
        case 'hideLanding':
          return hideLanding(data);
        case 'closeApp':
          return closeApp(data);
        case 'saveAndRunApp':
          return await saveAndRunApp(coreApps, data);
        case 'invoicePaid':
          return invoicePaid(coreApps, data);
        case 'saveData':
          return await saveData(coreApps, data);
        case 'readData':
          return await readData(coreApps, data);
        case 'broadcastMessage':
          return broadcastMessage(coreApps, data);
        case 'appOwnerMessage':
          return appOwnerMessage(coreApps, data);
        case 'appOwnerMulticast':
          return appOwnerMulticast(coreApps, data);
        case 'alert':
          return showAlert( data);
        case 'progress':
          return showProgress(data);
        default:
          logError(`MessageRouter Unhandled iframe message: ${JSON.stringify(data)}`);
      }
    }
  }, false);
}
