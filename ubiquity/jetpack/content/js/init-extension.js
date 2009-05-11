const Cc = Components.classes;
const Ci = Components.interfaces;

var Extension = {
  Manager: {}
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

   if (!window.console) {
     function stringifyArgs(args) {
       var stringArgs = [];
       for (var i = 0; i < args.length; i++)
         stringArgs.push(args[i].toString());
       return stringArgs.join(" ");
     }

     function logStringMessage() {
       var consoleService = Cc["@mozilla.org/consoleservice;1"]
                            .getService(Ci.nsIConsoleService);
       consoleService.logStringMessage(stringifyArgs(arguments));
     }

     function report(aMessage, flag, stackFrameNumber) {
       var stackFrame = Components.stack.caller;

       if (typeof(stackFrameNumber) != "number")
         stackFrameNumber = 0;

       for (var i = 0; i < stackFrameNumber; i++)
         stackFrame = stackFrame.caller;

       var consoleService = Cc["@mozilla.org/consoleservice;1"]
                            .getService(Ci.nsIConsoleService);
       var scriptError = Cc["@mozilla.org/scripterror;1"]
                         .createInstance(Ci.nsIScriptError);
       var aSourceName = stackFrame.filename;
       var aSourceLine = stackFrame.sourceLine;
       var aLineNumber = stackFrame.lineNumber;
       var aColumnNumber = null;
       var aFlags = scriptError[flag];
       if (typeof(aFlags) != "number")
         throw new Error("assertion failed: aFlags is not a number");
       var aCategory = "jetpack javascript";
       scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber,
                        aColumnNumber, aFlags, aCategory);
       consoleService.logMessage(scriptError);
     };

     window.console = {
       log: logStringMessage,
       info: logStringMessage,
       warn: function warn() {
         report(stringifyArgs(arguments), 'warningFlag', 1);
       },
       error: function error() {
         report(stringifyArgs(arguments), 'errorFlag', 1);
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
           },
           info: function info() {
             Firebug.Console.logFormatted(arguments, context, "info");
           },
           warn: function warn() {
             Firebug.Console.logFormatted(arguments, context, "warn");
           },
           error: function error() {
             Firebug.Console.logFormatted(arguments, context, "error");
           }
         };
       }
     }
   }
 })();
