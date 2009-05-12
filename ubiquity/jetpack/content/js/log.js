var Logging = {
  ConsoleListener: function ConsoleListener() {
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

    MemoryTracking.track(this);
  },
  JsErrorConsoleLogger: function JsErrorConsoleLogger() {
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

    MemoryTracking.track(this);
  },

  FirebugLogger: function FirebugLogger(chromeWindow) {
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
        dump(evt.originalTarget.innerHTML);
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

    MemoryTracking.track(this);
  }
};

(function() {
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
