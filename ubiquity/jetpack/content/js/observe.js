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

// When this object is instantiated, the given onLoad() is called for
// all browser windows, and subsequently for all newly-opened browser
// windows. When a browser window closes, onUnload() is called.
// onUnload() is also called once for each browser window when the
// extension is unloaded.

function BrowserWatcher(options) {
  MemoryTracking.track(this);
  var pendingHandlers = [];

  function makeSafeFunc(func) {
    function safeFunc(window) {
      try {
        func(window);
      } catch (e) {
        console.exception(e);
      }
    };
    return safeFunc;
  }

  function addUnloader(chromeWindow, func) {
    function onUnload() {
      chromeWindow.removeEventListener("unload", onUnload, false);
      pendingHandlers.splice(pendingHandlers.indexOf(onUnload), 1);
      func(chromeWindow);
    }
    pendingHandlers.push(onUnload);
    chromeWindow.addEventListener("unload", onUnload, false);
  }

  function loadAndBind(chromeWindow) {
    if (options.onLoad)
      (makeSafeFunc(options.onLoad))(chromeWindow);
    if (options.onUnload)
      addUnloader(chromeWindow, makeSafeFunc(options.onUnload));
  }

  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);

  var enumerator = wm.getEnumerator("navigator:browser");

  while (enumerator.hasMoreElements()) {
    var chromeWindow = enumerator.getNext();
    if (chromeWindow.gBrowser)
      loadAndBind(chromeWindow);
    else
      onWindowOpened(chromeWindow);
  }

  function onWindowOpened(chromeWindow) {
    function removeListener() {
      chromeWindow.removeEventListener("load", onLoad, false);
      pendingHandlers.splice(pendingHandlers.indexOf(removeListener), 1);
    }
    function onLoad() {
      removeListener();
      var type = chromeWindow.document.documentElement
                 .getAttribute("windowtype");
      if (type == "navigator:browser")
        loadAndBind(chromeWindow);
    }
    chromeWindow.addEventListener("load", onLoad, false);
    pendingHandlers.push(removeListener);
  }

  var ww = new WindowWatcher();
  ww.onWindowOpened = onWindowOpened;

  Extension.addUnloadMethod(
    this,
    function() {
      ww.unload();
      var handlers = pendingHandlers.slice();
      handlers.forEach(function(handler) { handler(); });
    });
}
