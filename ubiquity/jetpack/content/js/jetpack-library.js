/*
  Jetpack.UI
  Jetpack.windows.active
  Jetpack.tabs.active

  Jetpack.active.window
  Jetpack.active.element

  Jetpack.windows
    [window]
    .active

  Jetpack.tabs
    [tab]
    .active
    .new( url )

    .onOpen
    .onClose
    .onMove
    .onSelect

  Jetpack.tabs[].tab
    .load( url )
    .focus()
    .close()

    .onClose
    .onChange
    .onSelect
*/

function JetpackLibrary() {
  MemoryTracking.track(this);
  var Jetpack = this;

  Jetpack.__proto__ = {
    active: {
      get window() {
        return Application.activeWindow;
      },

      // It turns out that Application.activeWindow.activeTab is a
      // different type of object than those stored in
      // Application.activeWindow.tabs[i]. Thus, we return the more
      // generic type.
      get tab() {
        var index = Application.activeWindow.activeTab.index;
        return new Tab(Application.activeWindow.tabs[index]);
      }
    },

    get tabs() {
      return new Tabs();
    }
  };

  var Utils = {
    url: function(spec) {
      var ios = Cc["@mozilla.org/network/io-service;1"]
               .getService(Ci.nsIIOService);
      return ios.newURI(spec, null, null);
    },

    extend: function( base, extender ){
      for (key in extender)
        base[key] = extender[key];
      return base;
    }
  };

  var Tab = function(tab) {
    this.__tab = tab;
  };

  Tab.prototype = {
    load: function(input) {
      switch (typeof(input)) {
      case "string":
        this.__tab.load(Utils.url(input));
        break;
      case "function":
        var context = this;
        var onLoad = function() {
          input.apply(context);
        };
        this.__tab.events.addListener("load", onLoad);
        $(window).unload(
          function() { win.events.removeListener("TabSelect", onSelect); }
        );
        break;
      }
    },

    _event: function (callback, funcName, eventName) {
      switch (typeof(callback)) {
      case "undefined":
        this.__tab[funcName]();
        break;
      case "function":
        var win = this.parent;
        var tabId = this.id;
        var context = this;

        function onEvent() {
          if (tabId == Jetpack.active.tab.id)
            callback.apply(context);
        }

        win.events.addListener(eventName, onEvent);
        $(window).unload(
          function() { win.events.removeListener(eventName, onEvent); }
        );
        break;
      }
    },

    close: function(callback) {
      this._event( callback, "close", "TabClose");
    },

    focus: function(callback) {
      this._event( callback, "focus", "TabSelect");
    },

    // This is annoying. There's no good way of figuring out what a tab's
    // parent window is in FUEL. And comparing tab objects seems to fail.
    // For example:
    //
    //   >> Application.windows[0].tabs[0] == Application.windows[0].tabs[0]
    //   false
    //
    // So, to figure out what the parent window is, we iterate over every tab
    // in every window looking for the Jetpack-generated unique ID of the tab.

    get parent() {
      for each (win in Application.windows) {
        for each (tab in win.tabs) {
          if (tab._browser._id == this.id) {
            return win;
          }
        }
      }
      return null;
    },

    get id() {
      // You can't set attributes for this.__tab, but you can for
      // this.__tab._browser. Go figure.

      if(!this.__tab._browser._id)
        this.__tab._browser._id = Math.random();
      return this.__tab._browser._id;
    },

    get document() {
      return this.__tab.document;
    }
  };

  var Tabs = function() {
    for each (var win in Application.windows){
      for each (var tab in win.tabs) {
        this.push(new Tab(tab));
      }
    }
  };

  Tabs.prototype = Utils.extend(
    new Array, {
      ready: function(handlerFunc){
        forAllTabs( "DOMContentLoaded", handlerFunc);
      }
    });
}
