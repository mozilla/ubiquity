var JetpackRuntime = {
  // Just so we show up as some class when introspected.
  constructor: function JetpackRuntime() {},

  _statusBarInstance: null,
  _jetpackNamespace: null,

  _unloadJetpackNamespace: function _unloadJetpackNamespace() {
    var Jetpack = this._jetpackNamespace;
    var statusBar = this._statusBarInstance;

    this._jetpackNamespace = null;
    this._statusBarInstance = null;

    Jetpack.lib = null;
    Jetpack.statusBar = null;
    Jetpack.unload();
    statusBar.unload();
  },

  _buildJetpackNamespace: function buildJetpackNamespace() {
    var self = this;
    var Jetpack = new JetpackLibrary();

    Jetpack.lib = {};
    Jetpack.lib.twitter = Twitter;

    self._statusBarInstance = new StatusBar();

    Jetpack.statusBar = {};
    Jetpack.statusBar.append = function append(options) {
      return self._statusBarInstance.append(options);
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

    this._jetpackNamespace = Jetpack;
  },

  contexts: [],

  Context: function JetpackContext(sandbox, url, srcUrl) {
    MemoryTracking.track(this);
    Extension.addUnloadMethod(
      this,
      function() {
        delete sandbox['$'];
        delete sandbox['jQuery'];
      });

    this.url = url;
    this.srcUrl = srcUrl;
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

    function makeGlobals(codeSource) {
      if (!self._jetpackNamespace)
        self._buildJetpackNamespace();

      var globals = {
        location: codeSource.id,
        console: console,
        $: jQuery,
        jQuery: jQuery,
        Jetpack: self._jetpackNamespace
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
    var feeds = self.FeedPlugin.FeedManager.getSubscribedFeeds();
    feeds.forEach(
      function(feed) {
        if (feed.type == "jetpack") {
          var codeSource = feed.getCodeSource();
          var code = codeSource.getCode();
          var sandbox = sandboxFactory.makeSandbox(codeSource);
          self.contexts.push(new self.Context(sandbox, feed.uri.spec,
                                              feed.srcUri.spec));
          try {
            var codeSections = [{length: code.length,
                                 filename: codeSource.id,
                                 lineNumber: 1}];
            sandboxFactory.evalInSandbox(code, sandbox, codeSections);
          } catch (e) {
            console.exception(e);
          }
        }
      });
    jsm = null;
    sandboxFactory = null;
    feeds = null;
  },

  FeedPlugin: {}
};

Extension.addUnloadMethod(
  JetpackRuntime,
  function() {
    JetpackRuntime.unloadAllJetpacks();
    JetpackRuntime._unloadJetpackNamespace();
  });

Components.utils.import("resource://jetpack/modules/jetpack_feed_plugin.js",
                        JetpackRuntime.FeedPlugin);

$(window).ready(
  function() {
    JetpackRuntime.loadJetpacks();

    function maybeReload(eventName, uri) {
      var doReload = false;

      switch (eventName) {
      case "feed-change":
      case "purge":
      case "unsubscribe":
        var matches = [context for each (context in JetpackRuntime.contexts)
                               if (context.url == uri.spec)];
        if (matches.length)
          doReload = true;
        break;
      case "subscribe":
        JetpackRuntime.FeedPlugin.FeedManager.getSubscribedFeeds().forEach(
          function(feed) {
            if (feed.uri.spec == uri.spec && feed.type == "jetpack") {
              doReload = true;
            }
          });
        break;
      }

      if (doReload) {
        console.log("Reloading Jetpack due to", eventName, "on",
                    uri.spec);
        window.location.reload();
      }
    }

    var watcher = new EventHubWatcher(JetpackRuntime.FeedPlugin.FeedManager);
    watcher.add("feed-change", maybeReload);
    watcher.add("subscribe", maybeReload);
    watcher.add("purge", maybeReload);
    watcher.add("unsubscribe", maybeReload);
  });
