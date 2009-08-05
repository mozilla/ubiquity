/*
  TODO: add following metrics (from http://labs.toolness.com/trac/ticket/409)
* Which standard feeds are enabled
* What feeds are subscribed to (to see what feeds are subscribed to but never used)
* What commands are executed/previewed from each feed
* What modifiers are used for each command
* How often noun-first suggestions are used (either from the popup or the context menu)
* How often commands are previewed but never executed (and vice-versa)
* How often the first suggestion isn't the one that's used
* How often selected text is used as input (or other contextual information)
* Whether the command editor is used



TODO: doesn't currently take into account multiple windows, or the new jsmodule changes


also needs to be able to work across applications (FF, TB, SB)
*/


var Metrics = {};

Metrics.DEBUG = true;
Metrics.SUBMIT_INTERVAL = 1000 * 60 * 60; // 1 hour
Metrics.RETRY_INTERVAL = 1000 * 60 * 5; // 5 minutes
Metrics.BASE_URL = "https://ubiquity.mozilla.com/metrics/";
Metrics.PREF_BASE = "extensions.ubiquity.metrics.";
Metrics.HOOK_PREFIX = "hook_";
Metrics.API_VERSION = "20081111";


Metrics.data = {};
Metrics.loggedItems = [];
Metrics.itemsPendingSubmit = [];
Metrics.clientId = null;
Metrics.submitTimer = null;

Metrics.windowHooks = [];
Metrics.prefHooks = [];


Metrics.init = function Metrics__init() {
  Metrics.retrieveBackup();
  Metrics.ensureClientId();

  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/setup.js",
                          jsm);
  Metrics.hookIntoFunction(jsm.UbiquitySetup, "setupWindow",
                           Metrics.onWindowOpen);

  Metrics.installHooks();
};


Metrics.onWindowOpen = function Metrics__onWindowOpen(aWindow) {
  Metrics.windowHooks.forEach(function forEachWindowHook(windowHook) {
    windowHook(aWindow);
  });
};


Metrics.isOkResponse = function Metrics__isOkResponse(aResponse) {
  return aResponse && aResponse.status == "ok";
};


Metrics.fetchNewClientId = function Metrics__fetchNewClientId(aSuccessCallback) {
  jQuery.ajax({
    url: Metrics.BASE_URL + "register",
    dataType: "json",
    success: function Metrics__fetchNewClientId__success(aResponse) {
      if (Metrics.isOkResponse(aResponse)) {
        Application.prefs.setValue(Metrics.PREF_BASE + "clientId",
                                   aResponse.clientId);
        Metrics.clientId = aResponse.clientId;
        aSuccessCallback(true);
      } else {
        aSuccessCallback(false);
      }
    },
    error: function Metrics__fetchNewClientId__error() {
      aSuccessCallback(false);
    }
  });
};


Metrics.ensureClientId = function Metrics__ensureClientId() {
  if (Metrics.DEBUG) {
    Metrics.clientId = -1;
    return;
  }

  var clientId = Application.prefs.getValue(Metrics.PREF_BASE + "clientId",
                                            null);
  if (clientId) {
    Metrics.clientId = clientId;
  } else {
    Metrics.fetchNewClientId(function Metrics__ensureClientId__success(aSuccess) {
      if (aSuccess) {
        Metrics.submitLogs();
      } else {
        CmdUtils.log("Metrics: Error registering client. Retrying again in " +
                     Metrics.RETRY_INTERVAL + "ms.");
        Utils.setTimeout(Metrics.ensureClientId, Metrics.RETRY_INTERVAL);
      }
    });
  }
};


Metrics.installHooks = function Metrics__installHooks() {
  if (Metrics.DEBUG)
    CmdUtils.log("Metrics: Installing hooks...");

  var window = Metrics.getChromeWindow();
  var hookFunc = null;
  for (var hookName in CmdUtils.__globalObject) {
    if (typeof CmdUtils.__globalObject[hookName] == "function" &&
        hookName.indexOf(Metrics.HOOK_PREFIX) == 0) {

      hookFunc = CmdUtils.__globalObject[hookName];
      try {
        if (hookFunc(window) === false) {
          CmdUtils.log("Metrics: Error installing hook '" + hookName + "'");
        } else if (Metrics.DEBUG) {
          CmdUtils.log("Metrics: Successfully installed hook (" + hookName + ")");
        }
      } catch (e) {
        CmdUtils.log("Metrics: Error installing hook '" + hookName + "':", e);
      }
    }
  }

  if (Metrics.DEBUG)
    CmdUtils.log("Metrics: Done installing hooks.");
};


Metrics.getChromeWindow = function Metrics__getChromeWindow() {
  return Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator)
                   .getMostRecentWindow(Utils.appWindowType);
};


Metrics.hasClientId = function Metrics__hasClientId() {
  return Metrics.clientId !== null;
};


Metrics.clearSubmitTimer = function Metrics__clearSubmitTimer() {
  if (Metrics.submitTimer) {
    Utils.clearTimeout(Metrics.submitTimer);
    Metrics.submitTimer = null;
  }
};


Metrics.setSubmitTimer = function Metrics__setSubmitTimer(aDelay) {
  Metrics.clearSubmitTimer();
  Metrics.submitTimer = Utils.setTimeout(Metrics.submitLogs, aDelay);
};


Metrics.setItemsPendingSubmit = function Metrics__setItemsPendingSubmit(aPending) {
  var oldPendingItems = Metrics.itemsPendingSubmit;
  Metrics.itemsPendingSubmit = aPending;
  Metrics.backupLogs();
  return oldPendingItems;
};


Metrics.submitLogs = function Metrics__submitLogs() {
  if (!Metrics.hasClientId()) {
    CmdUtils.log("Metrics: No client ID obtained, unable to submit.");
    return;
  }

  if(Metrics.itemsPendingSubmit.length > 0) {
     Metrics.setSubmitTimer(Metrics.RETRY_INTERVAL);
    return;
  }

  Metrics.setSubmitTimer(Metrics.SUBMIT_INTERVAL);

  Metrics.setItemsPendingSubmit(Metrics.loggedItems.splice(0));

  if (Metrics.DEBUG) {
    CmdUtils.log("Metrics: In debug mode, skipping submission of "
                 + Metrics.itemsPendingSubmit.length + " logged items: ",
                 Metrics.itemsPendingSubmit);
    Metrics.setItemsPendingSubmit([]);
    return;
  }

  function onErrrorSubitting() {
    CmdUtils.log("Metrics: Error submitting metrics. Retrying again in " +
                 Metrics.RETRY_INTERVAL + "ms.")
    Metrics.loggedItems = Metrics.setItemsPendingSubmit([]).concat(Metrics.loggedItems);
    Metrics.setSubmitTimer(Metrics.RETRY_INTERVAL);
  }

  jQuery.ajax({
    url: Metrics.BASE_URL + "submit",
    type: "json",
    data: {
      apiVersion: Metrics.API_VERSION,
      clientId: Metrics.clientId,
      items: Utils.encodeJson(itemsToSubmit)
    },
    success: function Metrics__submitLogs__success(aResponse) {
      if (Metrics.isOkResponse(aResponse)) {
        Metrics.setItemsPendingSubmit([]);
      } else {
        onErrrorSubitting();
      }
    },
    error: function Metrics__submitLogs__error() {
      onErrrorSubitting();
    }
  });
};


Metrics.backupLogs = function Metrics__backupLogs() {
  Application.prefs.setValue(Metrics.PREF_BASE + "backup.logs",
                             Utils.encodeJson(Metrics.loggedItems));
  Application.prefs.setValue(Metrics.PREF_BASE + "backup.pending",
                             Utils.encodeJson(Metrics.itemsPendingSubmit));
}


Metrics.retrieveBackup = function Metrics__retrieveBackup() {
  try {
    Metrics.loggedItems = Utils.decodeJson(Application.prefs.getValue(Metrics.PREF_BASE + "backup.logs", null));
  } catch (e) {
    Metrics.loggedItems = [];
  }

  try {
    Metrics.itemsPendingSubmit = Utils.decodeJson(Application.prefs.getValue(Metrics.PREF_BASE + "backup.pending", null));
  } catch (e) {
    Metrics.itemsPendingSubmit = [];
  }
}


Metrics.log = function Metrics__log(aType, aData) {
  if (Metrics.DEBUG)
    CmdUtils.log("Metrics: Logged '" + aType + "' with data: ", aData);

  Metrics.loggedItems.push({
    timestamp: (new Date).toString(),
    type: aType,
    data: aData
  });
  Metrics.backupLogs();
};


Metrics.handleCallback = function Metrics__handleCallback(aCallback, aArgs) {
  if (typeof aCallback == "function") {
    try {
      aCallback(aArgs);
    } catch (e) {
      CmdUtils.log("Metrics: Hook callback ", aCallback, " errorred: ", e)
    }
  } else {
    Metrics.log(aCallback);
  }
};


Metrics.hookIntoWindow = function Metrics__hookIntoWindow(aCallback) {
  var wmEnum = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                         .getService(Components.interfaces.nsIWindowMediator)
                         .getEnumerator(Utils.appWindowType);
  while (mwEnum.hasMoreElements()) {
    var win = wmEnum.getNext();
    Metrics.handleCallback(aCallback, win);
  }
};


Metrics.hookIntoFunction = function Metrics__wrapFunction(aContext, aFunction, aCallback) {
  if (Metrics.DEBUG)
    CmdUtils.log("Metrics: Hooking into function: ", aContext[aFunction]);

  var originalFunction = aContext[aFunction];
  aContext[aFunction] = function Metrics__wrapFunction__wrappedFunction() {
    Metrics.handleCallback(aCallback, arguments);
    originalFunction.apply(aContext, arguments);
  }
};


Metrics.hookIntoPageLoad = function Metrics__hookIntoPageLoad(aUrlMatch, aCallback) {
  function onPageLoad(aDocument) {
    if (typeof aUrlMatch == "string" && aUrlMatch.toLower() != aDocument.location.toString())
      return;
    if (typeof aUrlMatch == "function" && !aUrlMatch(aDocument.location))
      return;
    if (aUrlMatch instanceof RegExp && !aUrlMatch.test(aDocument.location.toString()))
      return;

    Metrics.handleCallback(aCallback, aDocument);
  }

  CmdUtils.onPageLoad(onPageLoad);
};


Metrics.hookIntoPrefs = function Metrics__hookIntoPrefs(aBranch, aCallback) {
  var prefBranch;
  if (typeof(aBranch) == "string") {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);

    prefBranch = prefService.getBranch(aBranch);
    prefBranch = prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  } else if (aBranch instanceof Components.interfaces.nsIPrefBranch2) {
    prefBranch = aBranch;
  } else if (aBranch instanceof Components.interfaces.nsIPrefBranch) {
    prefBranch = aBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  } else {
    CmdUtils.log("Metrics: bad prefs branch passed to Metrics.hookIntoPrefs()");
    return;
  }

  var observer = {
    callback : aCallback,
    branch : prefBranch,
    observe : function observe(aSubject, aTopic, aData) {
      Metrics.handleCallback(this.callback, {
                                              branch: aSubject,
                                              name: aData
                                            });
    }
  };
  Metrics.prefHooks.push(observer);

  prefBranch.addObserver("", observer, false);
}


Metrics.sendFeedback = function Metrics__sendFeedback(aComment) {
  Metrics.log("feedback", {comment: aComment});
};


function startup_metricsInit() {
  Metrics.init();
}


var noun_type_command = {
  name: "command name",
  suggest: function(input) {
    var suggestions = [];
    var window = Metrics.getChromeWindow();
    //XXX BITROT
    var commands = window.gUbiquity.__cmdManager._cmdSource._commands;
    for (var name in commands) {
      if (name.indexOf(input) > -1)
        suggest.push(CmdUtils.makeSugg(name, null, commands[name]));
    }
    return suggestions;
  }
};


CmdUtils.CreateCommand({
  name: "feedback",
  takes: {comment: noun_arb_text},
  modifiers: {"for": noun_type_command},
  preview: function(previewBlock, inputObject) {
    // TODO take into account feedback about specific command: "... feedback about the 'XXX' command: ..."
    var previewTemplate = "Post the following feedback to the Ubiquity developers:" +
                          "<p><i>${comment}</i></p>";
    previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate,
                                                     {comment: inputObject.text});
  },
  execute: function(inputObject) {
    if(inputObject.text.length < 4) {
      displayMessage("Enter a comment to post feedback.");
      return;
    }
    Metrics.sendFeedback(inputObject.text);
    CmdUtils.log(Metrics);
    displayMessage("Thank you for your feedback.");
  }
});


function hook_startup(aMainWindow) {
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                          .getService(Components.interfaces.nsIXULAppInfo);
  var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                             .getService(Components.interfaces.nsIXULRuntime);

  function getXPCOMABI() {
    try {
      return xulRuntime.XPCOMABI;
    } catch (e) {
      return "";
    }
  }

  function getExtensions() {
    function mapExtensions(aExtension) {
      return {
        id: aExtension.id,
        name: aExtension.name,
        version: aExtension.version,
        enabled: aExtension.enabled
        };
    }
    //XXX APP-COMPAT
    return Application.extensions.all.map(mapExtensions);
  }

  function getSubscribedFeeds() {
    function filterFeeds(aFeed) {
      var skipSchemes = ["file", "chrome", "resource"];
      return skipSchemes.indexOf(aFeed.jsUri.scheme) > -1;
    }
    function mapFeeds(aFeed) {
      return aFeed.jsUri.spec;
    }
    //XX BITROT
    return aMainWindow.LinkRelCodeSource
                      .getMarkedPages()
                      .filter(filterFeeds)
                      .map(mapFeeds);
  }

  var data = {
    app: {
      name: appInfo.name,
      version: appInfo.version,
      //XXX APP COMPAT
      locale: Application.prefs.getValue("general.useragent.locale", ""),
      os: xulRuntime.OS,
      abi: getXPCOMABI(),
      extentions: getExtensions()
    },
    ubiquity: {
      //XXX APP COMPAT
      version: Application.extensions.get("ubiquity@labs.mozilla.com").version,
      language: globals.languageCode,
      feeds: {
        subscribed: getSubscribedFeeds(),
        standard: []
      }
    }
  };

  Metrics.log("startup", data);
}


function hook_aboutubiquity_load() {
  Metrics.hookIntoPageLoad("about:ubiquity", "aboutubiquity-load");
}


function hook_commandlist_load() {
  Metrics.hookIntoPageLoad("chrome://ubiquity/content/cmdlist.xhtml", "commandlist-load");
}


function hook_commandeditor_load() {
  Metrics.hookIntoPageLoad("chrome://ubiquity/content/editor.xhtml", "commandeditor-load");
}


function hook_popup(aMainWindow) {
  //Metrics.hookIntoWindow(function)
  Metrics.hookIntoFunction(aMainWindow.gUbiquity, "openWindow", "popup");
}


function hook_command_preview_update(aMainWindow) {
  function commandPreviewCallback() {
    Metrics.data.previewUpdateTime = new Date;
  }
  Metrics.hookIntoFunction(aMainWindow.gUbiquity.__cmdManager, "_preview", commandPreviewCallback);
}


function hook_command_execute(aMainWindow) {
  var cmdManager = aMainWindow.gUbiquity.__cmdManager;

  function commandExecuteCallback() {
    var parsedSentence = cmdManager.__nlParser.getSentence(cmdManager.__hilitedSuggestion);

    if (!parsedSentence) {

      Metrics.log("command-doesntexist", {
        input: cmdManager.__lastInput // XXX potential privacy breach!
      });

    } else {

      Metrics.log("command-execute", {
        input: cmdManager.__lastInput, // XXX potential privacy breach!
        //sentance: parsedSentence.getCompletionText(aMainWindow.NLParser.getSelectionObject(context)), // XXX potential privacy breach!
        matchscores: {
          verb: parsedSentence.verbMatchScore,
          arg: parsedSentence.argMatchScore,
          frequency: parsedSentence.frequencyMatchScore
        },
        previewtime: (new Date) - Metrics.data.previewUpdateTime,
        command: {
          name: parsedSentence._verb._name,
          feed: "", // TODO: fill in this
          args: "" // TODO: fill in this
        }
      });

    }
  }
  Metrics.hookIntoFunction(cmdManager, "execute", commandExecuteCallback);
}


var gHotkeyChangeTimer = null;

function hook_hotkey_change(aMainWindow) {
  // monitor changes to both keycode and keymodifier, since only one may change,
  // but we don't get notified if one of them is set but doesn't change
  const PREF_KEYCODE = "extensions.ubiquity.keycode";
  const PREF_KEYMODIFIER = "extensions.ubiquity.keymodifier";

  function queueHotkeyChanged() {
    if (gHotkeyChangeTimer) {
      Utils.clearTimeout(gHotkeyChangeTimer);
      gHotkeyChangeTimer = null;
    }
    gHotkeyChangeTimer = Utils.setTimeout(100, hotkeyChanged);
  }

  function hotkeyChanged() {
    gHotkeyChangeTimer = null;
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    prefBranch = prefService.getBranch("");

    Metrics.log("change-hotkey", {
      keycode: prefBranch.getCharPref(PREF_KEYCODE),
      keymodifier: prefBranch.getCharPref(PREF_KEYMODIFIER)
    });
  };

  Metrics.hookIntoPrefs(PREF_KEYCODE, hotkeyChanged);
  Metrics.hookIntoPrefs(PREF_KEYMODIFIER, hotkeyChanged);
}