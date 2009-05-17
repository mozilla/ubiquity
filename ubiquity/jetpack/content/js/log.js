var Logging = {
  console: null,

  ConsoleListener: function ConsoleListener() {
    MemoryTracking.track(this);
    var self = this;

    var consoleListener = {
      observe: function(object) {
        var newObj = new Object();
        try {
          var scriptError = object.QueryInterface(Ci.nsIScriptError);
          newObj.isWarning = (scriptError.flags &
                              Ci.nsIScriptError.warningFlag) != 0;
          newObj.isStrictWarning = (scriptError.flags &
                                    Ci.nsIScriptError.strictFlag) != 0;
          newObj.isException = (scriptError.flags &
                                Ci.nsIScriptError.exceptionFlag) != 0;
          newObj.isError = (!(newObj.isWarning || newObj.isStrictWarning));
          newObj.message = scriptError.errorMessage;
          ["category", "lineNumber", "sourceName", "sourceLine",
           "columnNumber"].forEach(
             function(propName) {
               newObj[propName] = scriptError[propName];
             });
        } catch (e) {
          try {
            newObj.message = object.QueryInterface(Ci.nsIConsoleMessage);
          } catch (e) {
            newObj.message = object.toString();
          }
        }
        if (self.onMessage)
          self.onMessage(newObj);
      }
    };

    var cService = Cc['@mozilla.org/consoleservice;1'].getService()
                   .QueryInterface(Ci.nsIConsoleService);
    cService.registerListener(consoleListener);

    Extension.addUnloadMethod(
      this,
      function() {
        cService.unregisterListener(consoleListener);
      });
  },
  JsErrorConsoleLogger: function JsErrorConsoleLogger() {
    MemoryTracking.track(this);
    function stringifyArgs(args) {
      var stringArgs = [];
      for (var i = 0; i < args.length; i++)
        stringArgs.push(args[i]);
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
        stackFrame = stackFrameNumber;
      else
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
    this.exception = function exception(e) {
      if (e.location) {
        report(e, 'exceptionFlag', e.location);
      } else if (e.fileName) {
        report(e.message, 'exceptionFlag', {filename: e.fileName,
                                            lineNumber: e.lineNumber});
      } else
        this.report(e, 'errorFlag', 1);
    };
  },

  _onFirebugConsoleInjected: function _onFirebugConsoleInjected() {
    if (this.console != window.console) {
      this.console = null;
      this._init();
    }
  },

  FirebugLogger: function FirebugLogger(chromeWindow, context) {
    MemoryTracking.track(this);
    var Firebug = chromeWindow.Firebug;
    var FBL = chromeWindow.FBL;

    function wrapFirebugLogger(className) {
      function wrappedFirebugLogger() {
        var frame = Components.stack.caller;
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

    self.exception = function exception(e) {
      if (e.location) {
        Firebug.Console.logFormatted([e], context, "error",
                                     false,
                                     new FBL.SourceLink(e.location.filename,
                                                        e.location.lineNumber,
                                                        "js"));
      } else if (e.fileName) {
        Firebug.Console.logFormatted([e.name, e.message, "(", e, ")"],
                                     context, "error", false,
                                     new FBL.SourceLink(e.fileName,
                                                        e.lineNumber,
                                                        "js"));
      } else
        self.error(e);
    };
  },

  _init: function _init() {
    var warnings = [];

    if (Extension.isVisible) {
      // TODO: Use a Logging.ConsoleListener to report errors to
      // Firebug/JS Error Console if Firebug.showChromeErrors is false or
      // javascript.options.showInConsole is false. We don't want the user
      // to have to manually enable any preferences if they're actually
      // looking at the extension's page!

      var browser = Extension.visibleBrowser;
      if (browser.chrome && browser.chrome.window &&
          browser.chrome.window.TabWatcher) {
        try {
          // We're not detecting Firebug when we're not the currently
          // focused tab in our window. Right now, the Firebug extension side
          // of Jetpack will force us to reload when the user selects our
          // tab, if it detects that this is the case.
          var TabWatcher = browser.chrome.window.TabWatcher;
          var context;
          TabWatcher.iterateContexts(
            function(aContext) {
              if (aContext.name == window.location.href)
                context = aContext;
            });
          if (context) {
            var fbConsole = new Logging.FirebugLogger(browser.chrome.window,
                                                      context);
            if (window.console)
              fbConsole.__proto__ = window.console;
            Logging.console = fbConsole;
          }
        } catch (e) {
          warnings.push(["Installing Logging.FirebugLogger failed:", e]);
        }
      }
    }

    if (!Logging.console)
      Logging.console = new Logging.JsErrorConsoleLogger();

    if (window.console)
      delete window.console;
    window.console = Logging.console;

    warnings.forEach(
      function(objects) { console.warn.apply(console, objects); }
    );
  }
};

Logging._init();
