
function appTypeToString(type) {
  switch (type) {
    case 'eBook-app-type':
      return 'ebook';
    case 'audio-app-type':
      return 'audio'
    case 'application-app-type':
    default:
      return 'app'
  }
}

function appTypeToVerb(type) {
  switch (type) {
    case 'eBook-app-type':
      return 'Read';
    case 'audio-app-type':
      return 'Listen'
    case 'application-app-type':
    default:
      return 'Run'
  }
}

function defaultIconForAppType(type) {
  switch (type) {
    case 'eBook-app-type':
      return 'img/default-ebook-icon.svg';
    case 'audio-app-type':
      return 'img/default-audio-icon.svg'
    case 'application-app-type':
    default:
      return 'img/default-app-icon.svg'
  }
}

export {appTypeToString, appTypeToVerb, defaultIconForAppType};
