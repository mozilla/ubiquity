function JetpackNamespace(urlFactory) {
  var self = this;
  var Jetpack = new JetpackLibrary();

  Jetpack.lib = {};
  Jetpack.lib.twitter = Twitter;

  var statusBar = new StatusBar(urlFactory);

  Jetpack.statusBar = {};
  Jetpack.statusBar.append = function append(options) {
    return statusBar.append(options);
  };

  Jetpack.track = function() {
    var newArgs = [];
    for (var i = 0; i < 2; i++)
      newArgs.push(arguments[i]);
    // Make the memory tracker record the stack frame/line number of our
    // caller, not us.
    newArgs.push(1);
    MemoryTracking.track.apply(MemoryTracking, newArgs);
  };

  Extension.addUnloadMethod(
    self,
    function() {
      Jetpack.lib = null;
      Jetpack.statusBar = null;
      Jetpack.unload();
      statusBar.unload();
      statusBar = null;
    });

  self.Jetpack = Jetpack;
}

var JetpackRuntime = {
  // Just so we show up as some class when introspected.
  constructor: function JetpackRuntime() {},

  contexts: [],

  Context: function JetpackContext(feed, console) {
    MemoryTracking.track(this);
    function makeGlobals(codeSource) {
      var globals = {
        location: codeSource.id,
        console: console,
        $: jQuery,
        jQuery: jQuery,
        Jetpack: jetpackNamespace.Jetpack
      };

      // Add stubs for deprecated/obsolete functions.
      globals.addStatusBarPanel = function() {
        throw new Error("addStatusBarPanel() has been moved to " +
                        "Jetpack.statusBar.append().");
      };

      return globals;
    }

    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/sandboxfactory.js",
                            jsm);
    var sandboxFactory = new jsm.SandboxFactory(makeGlobals);
    jsm = null;

    var codeSource = feed.getCodeSource();
    var code = codeSource.getCode();
    var urlFactory = new UrlFactory(feed.uri.spec);
    var jetpackNamespace = new JetpackNamespace(urlFactory);
    var sandbox = sandboxFactory.makeSandbox(codeSource);
    try {
      var codeSections = [{length: code.length,
                           filename: codeSource.id,
                           lineNumber: 1}];
      sandboxFactory.evalInSandbox(code, sandbox, codeSections);
    } catch (e) {
      console.exception(e);
    }

    sandboxFactory = null;

    Extension.addUnloadMethod(
      this,
      function() {
        delete sandbox['$'];
        delete sandbox['jQuery'];
        jetpackNamespace.unload();
        jetpackNamespace = null;
      });

    this.sandbox = sandbox;
    this.url = feed.uri.spec;
    this.srcUrl = feed.srcUri.spec;
  },

  addJetpack: function addJetpack(url) {
    var self = this;
    JetpackRuntime.FeedPlugin.FeedManager.getSubscribedFeeds().forEach(
      function(feed) {
        if (feed.uri.spec == url) {
          self.contexts.push(new self.Context(feed, console));
        }
      });
  },

  removeJetpack: function removeJetpack(context) {
    var index = this.contexts.indexOf(context);
    this.contexts.splice(index, 1);
    context.unload();
  },

  reloadJetpack: function reloadJetpack(context) {
    var url = context.url;
    this.removeJetpack(context);
    this.addJetpack(url);
  },

  unloadAllJetpacks: function unloadAllJetpacks() {
    this.contexts.forEach(
      function(jetpack) {
        jetpack.unload();
      });
    this.contexts = [];
  },

  loadJetpacks: function loadJetpacks() {
    var self = this;

    var feeds = self.FeedPlugin.FeedManager.getSubscribedFeeds();
    feeds.forEach(
      function(feed) {
        if (feed.type == "jetpack") {
          self.contexts.push(new self.Context(feed, console));
        }
      });
    feeds = null;
  },

  FeedPlugin: {}
};

Extension.addUnloadMethod(JetpackRuntime, JetpackRuntime.unloadAllJetpacks);

Components.utils.import("resource://jetpack/modules/jetpack_feed_plugin.js",
                        JetpackRuntime.FeedPlugin);

$(window).ready(
  function() {
    JetpackRuntime.loadJetpacks();

    function maybeReload(eventName, uri) {
      switch (eventName) {
      case "feed-change":
      case "purge":
      case "unsubscribe":
        var matches = [context for each (context in JetpackRuntime.contexts)
                               if (context.url == uri.spec)];
        if (matches.length) {
          if (eventName == "feed-change")
            // Reload the feed.
            JetpackRuntime.reloadJetpack(matches[0]);
          else
            // Destroy the feed.
            JetpackRuntime.removeJetpack(matches[0]);
        }
        break;
      case "subscribe":
        JetpackRuntime.FeedPlugin.FeedManager.getSubscribedFeeds().forEach(
          function(feed) {
            if (feed.uri.spec == uri.spec && feed.type == "jetpack")
              JetpackRuntime.addJetpack(uri.spec);
          });
        break;
      }
    }

    var watcher = new EventHubWatcher(JetpackRuntime.FeedPlugin.FeedManager);
    watcher.add("feed-change", maybeReload);
    watcher.add("subscribe", maybeReload);
    watcher.add("purge", maybeReload);
    watcher.add("unsubscribe", maybeReload);
  });
