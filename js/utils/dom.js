
function hide(elementId) {
  const target = el(elementId);
  if(target) {
    target.classList.add('is-hidden');
  }
}
function show(elementId) {
  const target = el(elementId);
  if(target) {
    target.classList.remove('is-hidden');
  }
}

function el(elementId) {
  return document.getElementById(elementId);
}

export {hide, show, el};
