// This sets up jQuery when it's loaded in a hidden chrome window
// that doesn't provide a user interface.

jQuery.ajaxSetup(
  {xhr: function() {
     // This is a fix for Ubiquity bug #470. We're going to create the
     // XHR object from whatever current window the user's using, so
     // that any UI that needs to be brought up as a result of the XHR
     // is shown to the user, rather than being invisible and locking
     // up the application.

     if (Extension.isHidden) {
       var jsm = {};
       Components.utils.import("resource://ubiquity/modules/utils.js", jsm);
       var currWindow = jsm.Utils.currentChromeWindow;
       return new currWindow.XMLHttpRequest();
     }
     return new XMLHttpRequest();
   }
  });

// Call the given onLoad/onUnload() functions for all browser windows;
// when this function is called, the onLoad() is called for all browser
// windows, and subsequently for all newly-opened browser windows. When
// a browser window closes, onUnload() is called.  onUnload() is also
// called once for each browser window when the extension is unloaded.

function forAllBrowsers(options) {
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

  function addUnloader(chromeWindow, extensionWindow, func) {
    function onUnload() {
      chromeWindow.removeEventListener("unload", onUnload, false);
      extensionWindow.removeEventListener("unload", onUnload, false);
      func(chromeWindow);
    }
    chromeWindow.addEventListener("unload", onUnload, false);
    extensionWindow.addEventListener("unload", onUnload, false);
  }

  function loadAndBind(chromeWindow) {
    if (options.onLoad)
      (makeSafeFunc(options.onLoad))(chromeWindow);
    if (options.onUnload)
      addUnloader(chromeWindow, window, makeSafeFunc(options.onUnload));
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
    function removeEventHandlers() {
      chromeWindow.removeEventListener("load", onLoad, false);
      window.removeEventListener("unload", onExtensionUnload, false);
    }
    function onLoad() {
      removeEventHandlers();
      var type = chromeWindow.document.documentElement
                 .getAttribute("windowtype");
      if (type == "navigator:browser")
        loadAndBind(chromeWindow);
    }
    function onExtensionUnload() { removeEventHandlers(); }
    window.addEventListener("unload", onExtensionUnload, false);
    chromeWindow.addEventListener("load", onLoad, false);
  }

  var ww = new WindowWatcher();
  ww.onWindowOpened = onWindowOpened;
}

var Jetpack = {
  _makeGlobals: function _makeGlobals(codeSource) {
    var me = {
      url: codeSource.id,
      toString: function toString() {
        var parts = codeSource.id.split("/");
        return parts.slice(-1)[0];
      }
    };

    var Jetpack = new JetpackLibrary();

    Jetpack.lib = {};
    Jetpack.lib.twitter = Twitter;

    Jetpack.statusBar = {};
    Jetpack.statusBar.append = function append(options) {
      return StatusBar.append(options);
    };

    Jetpack.track = function() {
      var newArgs = [];
      for (var i = 0; i < 2; i++)
        newArgs.push(arguments[i]);
      // Make the memory tracker record the stack frame/line number of our
      // caller, not us.
      newArgs.push(1);
      MemoryTracking.track.apply(MemoryTracking, newArgs);
    };

    var globals = {
      location: codeSource.id,
      console: console,
      $: jQuery,
      jQuery: jQuery,
      Jetpack: Jetpack
    };

    // Add stubs for deprecated/obsolete functions.
    globals.addStatusBarPanel = function() {
      throw new Error("addStatusBarPanel() has been moved to " +
                      "Jetpack.statusBar.append().");
    };

    return globals;
  },

  contexts: [],

  Context: function JetpackContext(sandbox) {
    this.finalize = function finalize() {
      delete sandbox['$'];
      delete sandbox['jQuery'];
    };

    MemoryTracking.track(this);
  },

  finalize: function finalize() {
    Jetpack.contexts.forEach(
      function(jetpack) {
        jetpack.finalize();
      });
    Jetpack.contexts = [];
  },

  loadAll: function loadAll() {
    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/sandboxfactory.js",
                            jsm);

    var sandboxFactory = new jsm.SandboxFactory(this._makeGlobals);
    var feeds = Jetpack.FeedPlugin.FeedManager.getSubscribedFeeds();
    feeds.forEach(
      function(feed) {
        if (feed.type == "jetpack") {
          var codeSource = feed.getCodeSource();
          var code = codeSource.getCode();
          var sandbox = sandboxFactory.makeSandbox(codeSource);
          Jetpack.contexts.push(new Jetpack.Context(sandbox));
          try {
            var codeSections = [{length: code.length,
                                 filename: codeSource.id,
                                 lineNumber: 1}];
            sandboxFactory.evalInSandbox(code, sandbox, codeSections);
          } catch (e) {
            console.exception(e);
          }
        }
      });
  },

  FeedPlugin: {}
};

Components.utils.import("resource://jetpack/modules/jetpack_feed_plugin.js",
                        Jetpack.FeedPlugin);

$(window).ready(
  function() {
    Jetpack.loadAll();
    window.addEventListener("unload", Jetpack.finalize, false);

    var watcher = new EventHubWatcher(Jetpack.FeedPlugin.FeedManager);

    function maybeReload(eventName, uri) {
      if (eventName == "purge") {
        // TODO: There's a bug in Ubiquity's feed manager which makes it
        // impossible for us to get metadata about the feed, because it's
        // already purged. We need to fix this. For now, just play it
        // safe and reload Jetpack.
        console.log("Reloading Jetpack due to purge on", uri.spec);
        window.location.reload();
      } else
        Jetpack.FeedPlugin.FeedManager.getSubscribedFeeds().forEach(
          function(feed) {
            // TODO: This logic means that we actually reload many
            // times during Firefox startup, depending on how many
            // Jetpack feeds exist, since a feed-change event is
            // fired for every feed at startup!
            if (feed.uri.spec == uri.spec && feed.type == "jetpack") {
              console.log("Reloading Jetpack due to", eventName, "on",
                          uri.spec);
              window.location.reload();
            }
          });
    }

    watcher.add("feed-change", maybeReload);
    watcher.add("subscribe", maybeReload);
    watcher.add("purge", maybeReload);
    watcher.add("unsubscribe", maybeReload);
  });
