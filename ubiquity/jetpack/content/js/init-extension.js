const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://jetpack/modules/track.js");

var Extension = {
  // TODO: Eventually we may want to be able to put extensions in iframes
  // that are in visible windows, which these flags aren't compatible
  // with (right now they assume that if they're in an iframe, they're in
  // the hidden window).
  isVisible: (window.frameElement === null),
  isHidden: (window.frameElement !== null),

  visibleMainWindow: null,
  visibleBrowser: null,

  Manager: {},

  addUnloadMethod: function addUnloadMethod(obj, unloader) {
    function unloadWrapper() {
      window.removeEventListener("unload", unloadWrapper, true);
      unloader.apply(obj, arguments);
    }

    window.addEventListener("unload", unloadWrapper, true);

    obj.unload = unloadWrapper;
  }
};

(function() {
   var host;
   if (window.location.protocol == "about:")
     host = window.location.href.slice(window.location.href.indexOf(":") + 1);
   else
     host = window.location.host;

   var initUrl  = "resource://" + host + "/modules/init.js";
   Components.utils.import(initUrl, Extension.Manager);
   Extension.Manager.set(window);

   MemoryTracking.track(window, "ExtensionWindow");

   window.setInterval(function() { MemoryTracking.compact(); },
                      MemoryTracking.COMPACT_INTERVAL);

   if (Extension.isVisible) {
     var mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIWebNavigation)
                      .QueryInterface(Ci.nsIDocShellTreeItem)
                      .rootTreeItem
                      .QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIDOMWindow);
     var browser = mainWindow.getBrowserFromContentWindow(window);

     Extension.visibleMainWindow = mainWindow;
     Extension.visibleBrowser = browser;
   }
 })();
