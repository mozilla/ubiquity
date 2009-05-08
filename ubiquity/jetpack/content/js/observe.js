function WindowWatcher() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;

  var self = this;

  var observer = {
    observe: function(window, event) {
      if (event == "domwindowopened") {
        if (self.onWindowOpened)
          self.onWindowOpened(window);
      } else
        if (self.onWindowClosed)
          self.onWindowClosed(window);
    }
  };

  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);
  ww.registerNotification(observer);

  $(window).unload(
    function() {
      ww.unregisterNotification(observer);
    });

  MemoryTracking.track(this, "WindowWatcher");
}

WindowWatcher.isSupported = function isSupported() {
  try {
    if (Components.classes["@mozilla.org/embedcomp/window-watcher;1"])
      return true;
  } catch (e) {}
  return false;
};

WindowWatcher.prototype = {
  toString: function toString() {
    return "[WindowWatcher]";
  }
};
