(function (namespace) {
  var key = "hockey-manager-lite-v1";

  function load() {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function save(game) {
    try {
      window.localStorage.setItem(key, JSON.stringify(game));
    } catch (error) {
      return false;
    }
    return true;
  }

  function clear() {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      return false;
    }
    return true;
  }

  namespace.Storage = {
    load: load,
    save: save,
    clear: clear
  };
})(window.HockeyManager = window.HockeyManager || {});
