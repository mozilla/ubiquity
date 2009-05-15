function Dictionary() {
  MemoryTracking.track(this);
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

  var readOnlyKeys = new ImmutableArray(keys);
  var readOnlyValues = new ImmutableArray(values);

  this.__defineGetter__("keys", function() { return readOnlyKeys; });
  this.__defineGetter__("values", function() { return readOnlyValues; });
  this.__defineGetter__("length", function() { return keys.length; });
}

function ImmutableArray(baseArray) {
  var self = this;
  var UNSUPPORTED_MUTATOR_METHODS = ["pop", "push", "reverse", "shift",
                                     "sort", "splice", "unshift"];
  UNSUPPORTED_MUTATOR_METHODS.forEach(
    function(methodName) {
      self[methodName] = function() {
        throw new Error("Mutator method '" + methodName + "()' is " +
                        "unsupported on this object.");
      };
    });

  self.__proto__ = baseArray;
}

function JetpackLibrary() {
  MemoryTracking.track(this);
  var trackedWindows = new Dictionary();
  var trackedTabs = new Dictionary();

  var windows = {
    get focused() {
      var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator);
      var chromeWindow = wm.getMostRecentWindow("navigator:browser");
      if (chromeWindow)
        return trackedWindows.get(chromeWindow);
      return null;
    }
  };
  windows.__proto__ = trackedWindows.values;

  var tabs = {
    get focused() {
      var browserWindow = windows.focused;
      if (browserWindow)
        return browserWindow.getFocusedTab();
      return null;
    },
    open: function open(url) {
      var browserWindow = windows.focused;
      // TODO: What to do if we have no focused window?
      // make a new one?
      return browserWindow.addTab(url);
    }
  };

  tabs.__proto__ = trackedTabs.values;

  function newBrowserTab(tabbrowser, chromeTab) {
    var browserTab = new BrowserTab(tabbrowser, chromeTab);
    trackedTabs.set(chromeTab, browserTab);
    return browserTab;
  }

  function finalizeBrowserTab(chromeTab) {
    var browserTab = trackedTabs.get(chromeTab);
    trackedTabs.remove(chromeTab);
    browserTab._finalize();
  }

  function BrowserWindow(chromeWindow) {
    MemoryTracking.track(this);
    var tabbrowser = chromeWindow.getBrowser();

    for (var i = 0; i < tabbrowser.tabContainer.itemCount; i++)
      newBrowserTab(tabbrowser,
                    tabbrowser.tabContainer.getItemAtIndex(i));

    const EVENTS_TO_WATCH = ["TabOpen", "TabMove", "TabClose", "TabSelect"];

    function onEvent(event) {
      // TODO: For some reason, exceptions that are raised outside of this
      // function get eaten, rather than logged, so we're adding our own
      // error logging here.
      try {
        // This is a XUL <tab> element of class tabbrowser-tab.
        var chromeTab = event.originalTarget;

        switch (event.type) {
        case "TabSelect":
          break;
        case "TabOpen":
          newBrowserTab(tabbrowser, chromeTab);
          break;
        case "TabMove":
          break;
        case "TabClose":
          finalizeBrowserTab(chromeTab);
          break;
        }
      } catch (e) {
        console.exception(e);
      }
    }

    EVENTS_TO_WATCH.forEach(
      function(eventType) {
        tabbrowser.addEventListener(eventType, onEvent, true);
      });

    this.addTab = function addTab(url) {
      var chromeTab = tabbrowser.addTab(url);
      return newBrowserTab(tabbrowser, chromeTab);
    };

    this.getFocusedTab = function getFocusedTab() {
      return trackedTabs.get(tabbrowser.selectedTab);
    };

    this.finalize = function finalize() {
      EVENTS_TO_WATCH.forEach(
        function(eventType) {
          tabbrowser.removeEventListener(eventType, onEvent, true);
        });
      for (var i = 0; i < tabbrowser.tabContainer.itemCount; i++)
        finalizeBrowserTab(tabbrowser.tabContainer.getItemAtIndex(i));
    };
  }

  function BrowserTab(tabbrowser, chromeTab) {
    MemoryTracking.track(this);
    var browser = chromeTab.linkedBrowser;

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
      "contentWindow",
      function() {
        if (browser && browser.contentWindow)
          return browser.contentWindow;
        return null;
        });

    this.__defineGetter__(
      "contentDocument",
      function() {
        if (browser && browser.contentDocument)
          return browser.contentDocument;
        return null;
        });

    this.__defineGetter__(
      "raw",
      function() {
        if (browser)
          return chromeTab;
        return null;
      });

    this.focus = function focus() {
      if (browser)
        tabbrowser.selectedTab = chromeTab;
    };

    this.close = function close() {
      if (browser)
        browser.contentWindow.close();
    };

    this._finalize = function _finalize() {
      tabbrowser = null;
      chromeTab = null;
      browser = null;
    };

    this.toString = function toString() {
      if (!browser)
        return "[Closed Browser Tab]";
      else
        return "[Browser Tab]";
    };
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
