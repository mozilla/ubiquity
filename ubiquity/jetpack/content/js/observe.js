function EventHubWatcher(hub) {
  MemoryTracking.track(this);
  var listeners = [];

  this.add = function add(name, listener) {
    function listenerWrapper(eventName, data) {
      try {
        listener(eventName, data);
      } catch (e) {
        console.exception(e);
      }
    }
    hub.addListener(name, listenerWrapper);
    listeners.push({name: name, listener: listenerWrapper});
  };

  Extension.addUnloadMethod(
    this,
    function() {
      listeners.forEach(
        function(info) {
          hub.removeListener(info.name, info.listener);
        });
    });
}

function WindowWatcher() {
  MemoryTracking.track(this);
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

  Extension.addUnloadMethod(
    this,
    function() {
      ww.unregisterNotification(observer);
    });
}
