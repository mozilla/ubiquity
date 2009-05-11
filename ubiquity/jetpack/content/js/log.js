var Logging = {
  JsErrorConsoleLogger: function JsErrorConsoleLogger() {
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

    this.log = this.info = logStringMessage;
    this.warn = function warn() {
      report(stringifyArgs(arguments), 'warningFlag', 1);
    };
    this.error = function error() {
      report(stringifyArgs(arguments), 'errorFlag', 1);
    };
  },

  FirebugLogger: function FirebugLogger(chromeWindow) {
    var context = chromeWindow.FirebugContext;
    var Firebug = chromeWindow.Firebug;
    var FBL = chromeWindow.FBL;

    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/sandboxfactory.js",
                            jsm);
    var SandboxFactory = jsm.SandboxFactory;

    function unmungeStackFrame(frame) {
      var mungedPrefix = SandboxFactory.protectedFileUriPrefix;
      if (SandboxFactory.isInitialized &&
          SandboxFactory.isFilenameReported &&
          frame.filename.indexOf(mungedPrefix) != -1) {
        var newFrame = {
          filename: frame.filename.slice(mungedPrefix.length)
        };
        newFrame.__proto__ = frame;
        return newFrame;
      }
      return frame;
    }

    function wrapFirebugLogger(className) {
      function wrappedFirebugLogger() {
        var frame = unmungeStackFrame(Components.stack.caller);
        Firebug.Console.logFormatted(arguments, context, className, false,
                                     FBL.getFrameSourceLink(frame));
      }
      return wrappedFirebugLogger;
    }

    this.isFirebug = true;
    var self = this;
    ["log", "info", "warn", "error"].forEach(
      function(className) { self[className] = wrapFirebugLogger(className); }
    );
  }
};

(function() {
   if (Extension.isVisible) {
     var mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIWebNavigation)
                      .QueryInterface(Ci.nsIDocShellTreeItem)
                      .rootTreeItem
                      .QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIDOMWindow);
     var browser = mainWindow.getBrowserFromContentWindow(window);
     if (browser.chrome && browser.chrome.window &&
         browser.chrome.window.FirebugContext) {
       var fbConsole = new Logging.FirebugLogger(browser.chrome.window);
       if (window.console) {
         fbConsole.__proto__ = window.console;
         delete window.console;
       }
       window.console = fbConsole;
     } else
       window.console = new Logging.JsErrorConsoleLogger();
   } else
     window.console = new Logging.JsErrorConsoleLogger();
 })();
