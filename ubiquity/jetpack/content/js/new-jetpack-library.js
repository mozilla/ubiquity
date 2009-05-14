function Dictionary() {
  var keys = [];
  var values = [];

  this.set = function set(key, value) {
    var id = keys.indexOf(key);
    if (id == -1) {
      keys.push(key);
      values.push(value);
    } else
      values[id] = value;
  };

  this.get = function get(key, defaultValue) {
    if (defaultValue === undefined)
      defaultValue = null;
    var id = keys.indexOf(key);
    if (id == -1)
      return defaultValue;
    return values[id];
  };

  this.remove = function remove(key) {
    var id = keys.indexOf(key);
    if (id == -1)
      throw new Error("object not in dictionary: ", key);
    keys.splice(id, 1);
    values.splice(id, 1);
  };

  this.keys = function keys() {
    return keys.slice();
  };

  this.values = function values() {
    return values.slice();
  };

  this.__defineGetter__("length", function() { return keys.length; });
  MemoryTracking.track(this);
}

function NewJetpackLibrary() {
  var trackedWindows = new Dictionary();
  var trackedTabs = new Dictionary();

  var tabArray = new Array();

  var UNSUPPORTED_MUTATOR_METHODS = ["pop", "push", "reverse", "shift",
                                     "sort", "splice", "unshift"];
  var tabs = {
    get focused() {
      var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator);
      var chromeWindow = wm.getMostRecentWindow("navigator:browser");
      if (chromeWindow) {
        var browserWindow = trackedWindows.get(chromeWindow);
        if (browserWindow)
          return browserWindow.getFocusedTab();
      }
      return null;
    }
  };

  UNSUPPORTED_MUTATOR_METHODS.forEach(
    function(methodName) {
      tabs[methodName] = function() {
        throw new Error("Mutator method '" + methodName + "()' is " +
                        "unsupported on this object.");
      };
    });

  tabs.__proto__ = tabArray;

  function newBrowserTab(browser) {
    var browserTab = new BrowserTab(browser);
    tabArray.push(browserTab);
    trackedTabs.set(browser, browserTab);
  }

  function finalizeBrowserTab(browser) {
    var browserTab = trackedTabs.get(browser);
    trackedTabs.remove(browser);
    browserTab._finalize();
    tabArray.splice(tabArray.indexOf(browserTab), 1);
  }

  function BrowserWindow(chromeWindow) {
    var tabbrowser = chromeWindow.getBrowser();

    for (var i = 0; i < tabbrowser.browsers.length; i++)
      newBrowserTab(tabbrowser.browsers[i]);

    const EVENTS_TO_WATCH = ["TabOpen", "TabMove", "TabClose", "TabSelect"];

    function onEvent(event) {
      // TODO: For some reason, exceptions that are raised outside of this
      // function get eaten, rather than logged, so we're adding our own
      // error logging here.
      try {
        // This is a XUL <tab> element of class tabbrowser-tab.
        var chromeTab = event.originalTarget;
        var browser = chromeTab.linkedBrowser;

        switch (event.type) {
        case "TabSelect":
          break;
        case "TabOpen":
          newBrowserTab(browser);
          break;
        case "TabMove":
          break;
        case "TabClose":
          finalizeBrowserTab(browser);
          break;
        }
      } catch (e) {
        console.error(e);
      }
    }

    EVENTS_TO_WATCH.forEach(
      function(eventType) {
        tabbrowser.addEventListener(eventType, onEvent, true);
      });

    this.getFocusedTab = function getFocusedTab() {
      var chromeTab = tabbrowser.selectedTab;
      var browser = chromeTab.linkedBrowser;
      return trackedTabs.get(browser);
    };

    this.finalize = function finalize() {
      EVENTS_TO_WATCH.forEach(
        function(eventType) {
          tabbrowser.removeEventListener(eventType, onEvent, true);
        });
      for (var i = 0; i < tabbrowser.browsers.length; i++)
        finalizeBrowserTab(tabbrowser.browsers[i]);
    };

    MemoryTracking.track(this);
  }

  function BrowserTab(browser) {
    this.__defineGetter__("isClosed",
                          function() { return (browser == null); });

    this.__defineGetter__(
      "url",
      function() {
        if (browser && browser.currentURI)
          return browser.currentURI.spec;
        return null;
      });

    this.__defineGetter__(
      "raw",
      function() {
        if (browser)
          return browser;
        return null;
      });

    this._finalize = function _finalize() {
      browser = null;
    };

    this.toString = function toString() {
      if (!browser)
        return "[Closed Browser Tab]";
      else
        return "[Browser Tab]";
    };

    MemoryTracking.track(this);
  }

  forAllBrowsers(
    {onLoad: function(chromeWindow) {
       var trackedWindow = trackedWindows.get(chromeWindow);
       if (!trackedWindow)
         trackedWindows.set(chromeWindow,
                            new BrowserWindow(chromeWindow));
     },
     onUnload: function(chromeWindow) {
       var browserWindow = trackedWindows.get(chromeWindow);
       trackedWindows.remove(chromeWindow);
       browserWindow.finalize();
     }
    });

  this.__defineGetter__("tabs", function() { return tabs; });
}

$(window).ready(
  function() {
    // Just for debugging purposes, assign an instance of the
    // new library to a global so we can play around with it in the
    // Firebug console.
    j = new NewJetpackLibrary();
  });
