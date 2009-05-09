// Just some sample code.
Components.utils.import("resource://jetpack/modules/jetpack_feed_plugin.js");
Components.utils.import("resource://jetpack/modules/init.js");
Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");

if (JetpackFeedManager) {
  var watcher = new EventHubWatcher(JetpackFeedManager);
  var doReload = false;
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

$(window).ready(
  function() {
    reloadAllJetpacks();
    window.addEventListener("unload", finalizeJetpacks, false);
    window.setInterval(tick, 1000);
    tick();
  });
