function EventHubWatcher(hub) {
  var listeners = [];

  this.add = function add(name, listener) {
    function listenerWrapper(eventName, data) {
      try {
        listener(eventName, data);
      } catch (e) {
        console.error("listener", listener, "raised exception", e);
      }
    }
    hub.addListener(name, listenerWrapper);
    listeners.push({name: name, listener: listenerWrapper});
  };

  $(window).unload(
    function() {
      listeners.forEach(
        function(info) {
          hub.removeListener(info.name, info.listener);
        });
    });

  MemoryTracking.track(this);
}

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

  MemoryTracking.track(this);
}
