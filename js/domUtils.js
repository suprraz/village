
function hide(elementId) {
  document.getElementById(elementId).classList.add('is-hidden');
}
function show(elementId) {
  document.getElementById(elementId).classList.remove('is-hidden');
}

function el(elementId) {
  return document.getElementById(elementId);
}

export {hide, show, el};
