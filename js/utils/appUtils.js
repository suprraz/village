import {appTypes} from "../os/store/appStore.js";

function appTypeToString(type) {
  switch (type) {
    case appTypes.ebook:
      return 'ebook';
    case appTypes.audio:
      return 'audio'
    case appTypes.application:
    default:
      return 'app'
  }
}

function appTypeToVerb(type) {
  switch (type) {
    case appTypes.ebook:
      return 'Read';
    case appTypes.audio:
      return 'Listen'
    case appTypes.application:
    default:
      return 'Run'
  }
}

function defaultIconForAppType(type) {
  switch (type) {
    case appTypes.ebook:
      return 'img/default-ebook-icon.svg';
    case appTypes.audio:
      return 'img/default-audio-icon.svg'
    case appTypes.application:
    default:
      return 'img/default-app-icon.svg'
  }
}

export {appTypeToString, appTypeToVerb, defaultIconForAppType};
