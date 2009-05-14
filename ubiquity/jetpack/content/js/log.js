var Logging = {
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

    $(window).unload(
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

  FirebugLogger: function FirebugLogger(chromeWindow) {
    MemoryTracking.track(this);
    var context = chromeWindow.FirebugContext;
    var Firebug = chromeWindow.Firebug;
    var FBL = chromeWindow.FBL;

    Firebug.showChromeErrors = true;

    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/sandboxfactory.js",
                            jsm);
    var SandboxFactory = jsm.SandboxFactory;

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

    // Here we post-process all newly-added logging messages to un-munge any
    // URLs coming from sandboxed code.
    Firebug.chrome.selectPanel("console");
    var consoleDocument = Firebug.chrome.getSelectedPanel().document;
    var consoleElement = $(consoleDocument).find(".panelNode-console");
    if (consoleElement.length) {
      consoleElement = consoleElement.get(0);
      function unmungeUrl(url) {
        var mungedPrefix = SandboxFactory.protectedFileUriPrefix;
        if (SandboxFactory.isInitialized &&
            SandboxFactory.isFilenameReported &&
            url.indexOf(mungedPrefix) != -1) {
          return url.slice(mungedPrefix.length);
        }
        return url;
      }

      function onInsert(evt) {
        var obj = $(evt.originalTarget).find(".objectLink-sourceLink");
        if (obj.length) {
          obj.each(
            function() {
              var href = unmungeUrl(this.repObject.href);
              if (href != this.repObject.href) {
                this.repObject.href = href;
                // Firebug's source code excerpt is all wrong, just remove
                // it for now.
                $(this).prev(".errorSourceBox").remove();
              }
            });
        }
      }
      consoleElement.addEventListener("DOMNodeInserted", onInsert, false);
      $(window).unload(
        function() {
          consoleElement.removeEventListener("DOMNodeInserted", onInsert,
                                             false);
        });
    }
  }
};

(function() {
   var warnings = [];

   if (Extension.isVisible) {
     // TODO: Use a Logging.ConsoleListener to report errors to
     // Firebug/JS Error Console if Firebug.showChromeErrors is false or
     // javascript.options.showInConsole is false. We don't want the user
     // to have to manually enable any preferences if they're actually
     // looking at the extension's page!

     var mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIWebNavigation)
                      .QueryInterface(Ci.nsIDocShellTreeItem)
                      .rootTreeItem
                      .QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIDOMWindow);
     var browser = mainWindow.getBrowserFromContentWindow(window);
     if (browser.chrome && browser.chrome.window &&
         browser.chrome.window.FirebugContext) {
       try {
         var fbConsole = new Logging.FirebugLogger(browser.chrome.window);
         if (window.console) {
           fbConsole.__proto__ = window.console;
           delete window.console;
         }
         window.console = fbConsole;
       } catch (e) {
         warnings.push(["Installing Logging.FirebugLogger failed:", e]);
       }
     }
   }

   if (!window.console)
     window.console = new Logging.JsErrorConsoleLogger();

   warnings.forEach(
     function(objects) { console.warn.apply(console, objects); }
   );
 })();
