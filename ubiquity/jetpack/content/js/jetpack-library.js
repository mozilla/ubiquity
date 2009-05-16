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
      throw new Error("object not in dictionary: " + key);
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

function EventListenerMixIns(mixInto) {
  MemoryTracking.track(this);
  var mixIns = {};

  this.add = function add(options) {
    if (mixIns) {
      if (options.name in mixIns)
        throw new Error("mixIn for", options.name, "already exists.");
      options.mixInto = mixInto;
      mixIns[options.name] = new EventListenerMixIn(options);
    }
  };

  this.bubble = function bubble(name, target, event) {
    if (mixIns)
      mixIns[name].trigger(target, event);
  };

  Extension.addUnloadMethod(
    this,
    function() {
      for (name in mixIns) {
        mixIns[name].unload();
        delete mixIns[name];
      }
      mixIns = null;
    });
}

function EventListenerMixIn(options) {
  MemoryTracking.track(this);
  var listeners = [];

  function onEvent(event, target) {
    if (listeners) {
      if (options.filter)
        event = options.filter.call(this, event);
      if (event) {
        if (!target)
          target = options.mixInto;
        var listenersCopy = listeners.slice();
        for (var i = 0; i < listenersCopy.length; i++)
          try {
            listenersCopy[i].call(target, event);
          } catch (e) {
            console.exception(e);
          }
        if (options.bubbleTo)
          options.bubbleTo.bubble(options.name, target, event);
      }
    }
  };

  options.mixInto[options.name] = function bind(cb) {
    if (listeners)
      listeners.push(cb);
  };

  options.mixInto[options.name].unbind = function unbind(cb) {
    if (listeners) {
      var index = listeners.indexOf(cb);
      if (index != -1)
        listeners.splice(index, 1);
    }
  };

  this.trigger = function trigger(target, event) {
    onEvent(event, target);
  };

  if (options.observe)
    options.observe.addEventListener(options.eventName,
                                     onEvent,
                                     options.useCapture);

  Extension.addUnloadMethod(
    this,
    function() {
      listeners = null;
      if (options.observe)
        options.observe.removeEventListener(options.eventName,
                                            onEvent,
                                            options.useCapture);
    });
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

  var tabsMixIns = new EventListenerMixIns(tabs);
  tabsMixIns.add({name: "onReady"});

  tabs.__proto__ = trackedTabs.values;

  function newBrowserTab(tabbrowser, chromeTab) {
    var browserTab = new BrowserTab(tabbrowser, chromeTab);
    trackedTabs.set(chromeTab, browserTab);
    return browserTab;
  }

  function unloadBrowserTab(chromeTab) {
    var browserTab = trackedTabs.get(chromeTab);
    trackedTabs.remove(chromeTab);
    browserTab._unload();
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
          unloadBrowserTab(chromeTab);
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
      // The TabOpen event has just been triggered, so we
      // just need to fetch it from our dictionary now.
      return trackedTabs.get(chromeTab);
    };

    this.getFocusedTab = function getFocusedTab() {
      return trackedTabs.get(tabbrowser.selectedTab);
    };

    Extension.addUnloadMethod(
      this,
      function() {
        EVENTS_TO_WATCH.forEach(
          function(eventType) {
            tabbrowser.removeEventListener(eventType, onEvent, true);
          });
        for (var i = 0; i < tabbrowser.tabContainer.itemCount; i++)
          unloadBrowserTab(tabbrowser.tabContainer.getItemAtIndex(i));
      });
  }

  function BrowserTab(tabbrowser, chromeTab) {
    MemoryTracking.track(this);
    var browser = chromeTab.linkedBrowser;

    var mixIns = new EventListenerMixIns(this);

    mixIns.add(
      {name: "onReady",
       observe: browser,
       eventName: "DOMContentLoaded",
       useCapture: true,
       bubbleTo: tabsMixIns,
       filter: function(event) {
         // Return the document that just loaded.
         return event.originalTarget;
       }});

    this.__proto__ = {
      get isClosed() { return (browser == null); },

      get url() {
        if (browser && browser.currentURI)
          return browser.currentURI.spec;
        return null;
      },

      get contentWindow() {
        if (browser && browser.contentWindow)
          return browser.contentWindow;
        return null;
      },

      get contentDocument() {
        if (browser && browser.contentDocument)
          return browser.contentDocument;
        return null;
      },

      get raw() { return chromeTab; },

      focus: function focus() {
        if (browser)
          tabbrowser.selectedTab = chromeTab;
      },

      close: function close() {
        if (browser)
          browser.contentWindow.close();
      },

      toString: function toString() {
        if (!browser)
          return "[Closed Browser Tab]";
        else
          return "[Browser Tab]";
      },

      _unload: function _unload() {
        mixIns.unload();
        mixIns = null;
        tabbrowser = null;
        chromeTab = null;
        browser = null;
      }
    };
  }

  var browserWatcher = new BrowserWatcher(
    {onLoad: function(chromeWindow) {
       var trackedWindow = trackedWindows.get(chromeWindow);
       if (!trackedWindow)
         trackedWindows.set(chromeWindow,
                            new BrowserWindow(chromeWindow));
     },
     onUnload: function(chromeWindow) {
       var browserWindow = trackedWindows.get(chromeWindow);
       trackedWindows.remove(chromeWindow);
       browserWindow.unload();
     }
    });

  this.__defineGetter__("tabs", function() { return tabs; });

  Extension.addUnloadMethod(
    this,
    function() {
      tabsMixIns.unload();
      browserWatcher.unload();
    });
}
