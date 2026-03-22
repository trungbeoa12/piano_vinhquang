window.PVQ_getQueryParam = function (name) {
  return new URLSearchParams(window.location.search).get(name);
};
