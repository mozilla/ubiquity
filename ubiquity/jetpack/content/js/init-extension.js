(function() {
   try {
     var dummy = Components.utils.import;
   } catch (e) {
     return;
   }

   var host;
   if (window.location.protocol == "about:")
     host = window.location.href.slice(window.location.href.indexOf(":") + 1);
   else
     host = window.location.host;

   var Extension = {};
   var initUrl  = "resource://" + host + "/modules/init.js";
   Components.utils.import(initUrl, Extension);
   Extension.set(window);

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
           isFirebug: true,
           log: function log() {
             Firebug.Console.logFormatted(arguments, context, "log");
           }
         };
       }
     }
   }
 })();
