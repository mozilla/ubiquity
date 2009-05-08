(function() {
   try {
     var dummy = Components.utils.import;
   } catch (e) {
     return;
   }

   var jsm = {};
   var initUrl = "resource://" + window.location.host + "/modules/init.js";
   Components.utils.import(initUrl, jsm);
   jsm.setExtension(window);

   if (!window.console) {
     const Cc = Components.classes;
     const Ci = Components.interfaces;

     window.console = {
       log: function log() {
         var args = [];
         for (var i = 0; i < arguments.length; i++)
           args.push(arguments[i].toString());
         var consoleService = Cc["@mozilla.org/consoleservice;1"]
                              .getService(Ci.nsIConsoleService);
         consoleService.logStringMessage(args.join(" "));
       }
     };

     if (!window.frameElement) {
       var mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIWebNavigation)
                        .QueryInterface(Ci.nsIDocShellTreeItem)
                        .rootTreeItem
                        .QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIDOMWindow);
       var browser = mainWindow.getBrowserFromContentWindow(window);
       if (browser.chrome && browser.chrome.window &&
           browser.chrome.window.FirebugContext) {
         var context = browser.chrome.window.FirebugContext;
         var Firebug = browser.chrome.window.Firebug;
         window.console = {
           log: function log() {
             Firebug.Console.logFormatted(arguments, context, "log");
           }
         };
       }
     }
   }
 })();
