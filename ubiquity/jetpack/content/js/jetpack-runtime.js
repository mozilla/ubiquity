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
      statusBar.unload();
      Jetpack.unload();
      statusBar = null;
      Jetpack.lib = null;
      Jetpack.statusBar = null;
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
        // Some of this unloading will call code in the jetpack, so we want
        // to be careful to make sure not to remove core components of
        // the jetpack's environment until the last possible moment.
        jetpackNamespace.unload();
        jetpackNamespace = null;
        delete sandbox['$'];
        delete sandbox['jQuery'];
      });

    this.sandbox = sandbox;
    this.url = feed.uri.spec;
    this.srcUrl = feed.srcUri.spec;
  },

  getJetpack: function getJetpack(url) {
    var matches = [context for each (context in JetpackRuntime.contexts)
                           if (context.url == url)];
    if (matches.length)
      return matches[0];
    return null;
  },

  addJetpack: function addJetpack(url) {
    var self = this;
    var feed = JetpackRuntime.FeedPlugin.FeedManager.getFeedForUrl(url);
    if (feed && feed.isSubscribed && feed.type == "jetpack")
      self.contexts.push(new self.Context(feed, console));
    else
      throw new Error("Not a subscribed jetpack feed: " + uri);
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
        var context = JetpackRuntime.getJetpack(uri.spec);
        if (context) {
          if (eventName == "feed-change")
            // Reload the feed.
            JetpackRuntime.reloadJetpack(context);
          else
            // Destroy the feed.
            JetpackRuntime.removeJetpack(context);
        }
        break;
      case "subscribe":
        var feed = JetpackRuntime.FeedPlugin.FeedManager.getFeedForUrl(uri);
        if (feed && feed.type == "jetpack")
          JetpackRuntime.addJetpack(uri.spec);
        break;
      }
    }

    var watcher = new EventHubWatcher(JetpackRuntime.FeedPlugin.FeedManager);
    watcher.add("feed-change", maybeReload);
    watcher.add("subscribe", maybeReload);
    watcher.add("purge", maybeReload);
    watcher.add("unsubscribe", maybeReload);
  });
