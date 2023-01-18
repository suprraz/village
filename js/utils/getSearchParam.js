export default function getSearchParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.has(param)) {
    return urlParams.get(param);
  }
  return null;
}
