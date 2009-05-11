// This sets up jQuery when it's loaded in a hidden chrome window
// that doesn't provide a user interface.

jQuery.ajaxSetup(
  {xhr: function() {
     // This is a fix for Ubiquity bug #470. We're going to create the
     // XHR object from whatever current window the user's using, so
     // that any UI that needs to be brought up as a result of the XHR
     // is shown to the user, rather than being invisible and locking
     // up the application.

     var jsm = {};
     Components.utils.import("resource://ubiquity/modules/utils.js", jsm);
     var window = jsm.Utils.currentChromeWindow;
     return new window.XMLHttpRequest();
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
        console.error(e);
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
    loadAndBind(chromeWindow);
  }

  var ww = new WindowWatcher();
  ww.onWindowOpened = function(chromeWindow) {
    chromeWindow.addEventListener(
      "load",
      function onLoad() {
        chromeWindow.removeEventListener("load", onLoad, false);
        if (!window.closed) {
          var type = chromeWindow.document.documentElement
                     .getAttribute("windowtype");
          if (type == "navigator:browser")
            loadAndBind(chromeWindow);
        }
      },
      false
    );
  };
}

var Jetpack = {
  _makeGlobals: function _makeGlobals(codeSource) {
    var Application = Cc["@mozilla.org/fuel/application;1"]
                      .getService(Ci.fuelIApplication);

    var me = {
      url: codeSource.id,
      toString: function toString() {
        var parts = codeSource.id.split("/");
        return parts.slice(-1)[0];
      }
    };

    var statusBarPanels = [];
    var statusBarPanelWindows = [];

    function addStatusBarPanel(options) {
      var url;

      if (options.url)
        url = options.url;
      else if (options.html) {
        url = "data:text/html," + encodeURI(options.html);
      } else
        url = "about:blank";

      var width = options.width ? options.width : 200;

      forAllBrowsers(
        {onLoad: function(window) {
           var iframe = StatusBar.addPanel(window, url, width);
           statusBarPanelWindows.push(window);
           statusBarPanels.push({url: url,
                                 iframe: iframe});
           if (options.onLoad) {
             iframe.addEventListener(
               "DOMContentLoaded",
               function onPanelLoad(event) {
                 iframe.removeEventListener("DOMContentLoaded",
                                            onPanelLoad,
                                            false);
                 try {
                   options.onLoad(iframe.contentDocument);
                 } catch (e) {
                   console.error(e);
                 }
               },
               false
             );
           }
         },
         onUnload: function(window) {
           var index = statusBarPanelWindows.indexOf(window);
           if (index != -1) {
             var panel = statusBarPanels[index];
             delete statusBarPanelWindows[index];
             delete statusBarPanels[index];
             if (panel.iframe.parentNode)
               panel.iframe.parentNode.removeChild(panel.iframe);
           }
         }
        });
    }

    return {location: codeSource.id,
            console: console,
            Application: Application,
            addStatusBarPanel: addStatusBarPanel,
            $: jQuery,
            jQuery: jQuery};
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
            console.error("Error ", e, "occurred while evaluating code for ",
                          feed.uri.spec);
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
    // TODO: Watch more events.
    watcher.add(
      "feed-change",
      function(name, uri) {
        if (uri.spec in Jetpack.FeedPlugin.Feeds)
          window.location.reload();
      });
  });
