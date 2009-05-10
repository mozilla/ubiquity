Components.utils.import("resource://jetpack/modules/jetpack_feed_plugin.js");
Components.utils.import("resource://jetpack/modules/init.js");
Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");

// This sets up jQuery when it's loaded in a hidden chrome window
// that doesn't provide a user interface.

jQuery.ajaxSetup(
  {xhr: function() {
     // This is a fix for Ubiquity bug #470. We're going to create the
     // XHR object from whatever current window the user's using, so
     // that any UI that needs to be brought up as a result of the XHR
     // is shown to the user, rather than being invisible and locking
     // up the application.

     var jsm = {};
     Components.utils.import("resource://ubiquity/modules/utils.js", jsm);
     var window = jsm.Utils.currentChromeWindow;
     return new window.XMLHttpRequest();
   }
  });

if (JetpackFeedManager) {
  var watcher = new EventHubWatcher(JetpackFeedManager);
  var doReload = false;
  // TODO: Watch more events.
  watcher.add(
    "feed-change",
    function(name, uri) {
      if (uri.spec in JetpackFeeds)
        doReload = true;
      if (doReload)
        reloadAllJetpacks();
    });
} else
  console.log("JetpackFeedManager is null");

function tick() {
  $("#jetpacks").empty();
  for (url in JetpackFeeds)
    $("#jetpacks").append($('<div class="jetpack"></div>').text(url));

  var numWeakRefs = getExtensionDebugInfo().weakRefs.length;
  $("#extension-weakrefs").text(numWeakRefs);
}

function makeGlobals(codeSource) {
  let Application = Components.classes["@mozilla.org/fuel/application;1"]
                    .getService(Components.interfaces.fuelIApplication);

  var me = {
    url: codeSource.id,
    toString: function toString() {
      var parts = codeSource.id.split("/");
      return parts.slice(-1)[0];
   }
  };
  var newConsole = {
    log: function log() {
      var newArgs = [me, ':'];
      for (var i = 0; i < arguments.length; i++)
        newArgs.push(arguments[i]);
      console.log.apply(console, newArgs);
    }
  };
  return {location: codeSource.id,
          console: newConsole,
          Application: Application,
          $: jQuery};
}

var jetpacks = [];

function Jetpack(sandbox) {
  this.finalize = function finalize() {
    delete sandbox['$'];
  };
}

function finalizeJetpacks() {
  jetpacks.forEach(
    function(jetpack) {
      jetpack.finalize();
    });
  jetpacks = [];
}

function reloadAllJetpacks() {
  finalizeJetpacks();

  let sandboxFactory = new SandboxFactory(makeGlobals);
  var feeds = JetpackFeedManager.getSubscribedFeeds();
  feeds.forEach(
    function(feed) {
      if (feed.type == "jetpack") {
        var codeSource = feed.getCodeSource();
        var code = codeSource.getCode();
        var sandbox = sandboxFactory.makeSandbox(codeSource);
        jetpacks.push(new Jetpack(sandbox));
        try {
          var codeSections = [{length: code.length,
                               filename: codeSource.id,
                               lineNumber: 1}];
          sandboxFactory.evalInSandbox(code, sandbox, codeSections);
        } catch (e) {
          console.log("Error ", e, "occurred while evaluating code for ",
                      feed.uri.spec);
        }
      }
    });
}

function openJsErrorConsole() {
  var Cc = Components.classes;
  var Ci = Components.interfaces;
  var wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
  var wmInterface = wm.QueryInterface(Ci.nsIWindowMediator);
  var topWindow = wmInterface.getMostRecentWindow("global:console");

  if (topWindow)
    topWindow.focus();
  else
    window.open("chrome://global/content/console.xul", "_blank",
                "chrome,extrachrome,menubar,resizable,scrollbars," +
                "status,toolbar");
}

$(window).ready(
  function() {
    reloadAllJetpacks();
    window.addEventListener("unload", finalizeJetpacks, false);
    window.setInterval(tick, 1000);

    $("#force-gc").click(function() { Components.utils.forceGC(); tick(); });
    $("#js-error-console").click(openJsErrorConsole);

    if (!window.console.isFirebug)
      $("#firebug-not-found").show();

    tick();
  });
