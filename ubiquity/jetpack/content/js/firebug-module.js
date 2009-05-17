FBL.ns(
  function() {
    with (FBL) {
      var jsm = {};
      Components.utils.import("resource://ubiquity/modules/sandboxfactory.js",
                              jsm);

      var JETPACK_URL = "about:jetpack";

      var JetpackTabWatcher = {
        shouldCreateContext: function(win, uri) {
          if (uri == JETPACK_URL) {
            return true;
          }
        },
        shouldNotCreateContext: function(win, uri) {
        },
        initContext: function(context) {
        },
        showContext: function(browser, context) {
          if (browser.contentWindow.location.href == JETPACK_URL) {
            Firebug.showChromeErrors = true;
            Firebug.toggleBar(true);
          }
        },
        loadedContext: function(context) {
          // If the Jetpack page wasn't visible when it was loaded,
          // then a FB context won't be created for it until the
          // user navigates there. Here we detect if we're arriving at
          // a Jetpack page that can't use Firebug because no
          // context was created for it, and if it's the case, we
          // tell the window to reload so that it can detect us
          // when it reloads.
          if (context &&
              context.window &&
              context.window.location.href == JETPACK_URL &&
              context.window.wrappedJSObject &&
              context.window.wrappedJSObject.console &&
              !context.window.wrappedJSObject.console.isFirebug) {
            context.window.location.reload();
          }
        },
        destroyContext: function(context) {
        }
      };

      var JetpackConsoleListener = {
        onConsoleInjected:function(context, win) {
          // Not sure if we need to wrap this, but let's be safe.
          win = XPCNativeWrapper(win);
          if (win.location.href == JETPACK_URL) {
            if (win.wrappedJSObject.Logging)
              win.wrappedJSObject.Logging._onFirebugConsoleInjected();
          }
        },
        log: function(context, object, className, sourceLink) {
          sourceLink.href = jsm.SandboxFactory.unmungeUrl(sourceLink.href);
        },
        logFormatted: function(context, objects, className, sourceLink) {
          sourceLink.href = jsm.SandboxFactory.unmungeUrl(sourceLink.href);
        }
      };

      JetpackModule = extend(
        Firebug.Module,
        {
          loadedContext: function(context) {
          },
          watchWindow: function(context, win) {
          },
          initialize: function() {
            Firebug.Module.initialize.apply(this, arguments);
            Firebug.Console.addListener(JetpackConsoleListener);
            TabWatcher.addListener(JetpackTabWatcher);
          },

          shutdown: function() {
            Firebug.Module.shutdown.apply(this, arguments);
            Firebug.Console.removeListener(JetpackConsoleListener);
            TabWatcher.removeListener(JetpackTabWatcher);
          }
        });

      Firebug.registerModule(JetpackModule);

      // TODO: We should totally use this for something.
      //
      // function JetpackPanel() {}
      // JetpackPanel.prototype = extend(
      //   Firebug.Panel,
      //   {
      //     name: "Jetpack",
      //     title: "Jetpack",
      //
      //     initialize: function() {
      //       Firebug.Panel.initialize.apply(this, arguments);
      //     }
      //   });
      //
      // Firebug.registerPanel(JetpackPanel);
    }});
