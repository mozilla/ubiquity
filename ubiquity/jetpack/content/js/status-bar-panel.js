var WebContentFunctions = {
  // Safely import the given list of functions into the given webpage
  // window, so that they can be used from content-space.  Each
  // function must return a JS primitive.
  importIntoWindow: function importIntoWindow(functions, window) {
    var sandbox = Components.utils.Sandbox(window);
    var codeLines = [];

    for (name in functions)
      if (typeof(functions[name]) == "function") {
        codeLines.push("window." + name + " = " + name + ";");
        sandbox.importFunction(functions[name]);
      }

    sandbox.window = window.wrappedJSObject;
    Components.utils.evalInSandbox(codeLines.join('\n'), sandbox);
  },

  // Inject the source code of the given functions into the given webpage.
  evalIntoWindow: function evalIntoWindow(functions, window) {
    var sandbox = Components.utils.Sandbox(window);
    var codeLines = [];

    for (name in functions)
      if (typeof(functions[name]) == "function")
        codeLines.push("window." + name + " = " +
                       functions[name].toString() + ";");

    sandbox.window = window.wrappedJSObject;

    Components.utils.evalInSandbox(codeLines.join('\n'), sandbox);
  }
};

function UrlFactory(baseUrl) {
  MemoryTracking.track(this);
  var ios = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);
  var base = ios.newURI(baseUrl, null, null);

  this.makeUrl = function(url) {
    return ios.newURI(url, null, base).spec;
  };
}

function StatusBar(urlFactory) {
  this._urlFactory = urlFactory;
  this._browserWatchers = [];
  this._panels = [];
  this._windows = [];

  Extension.addUnloadMethod(
    this,
    function() {
      this._browserWatchers.forEach(
        function(watcher) {
          watcher.unload();
        });
      this._browserWatchers = [];
      // TODO: Assert that panel and window lists are empty?
    });
}

StatusBar.prototype = {
  _BG_PROPS: ["backgroundImage",
              "backgroundPosition",
              "backgroundRepeat",
              "backgroundColor",
              "backgroundAttachment"],

  _copyBackground: function copyBackground(fromElement, toElement) {
    var window = fromElement.ownerDocument.defaultView;
    var style = window.getComputedStyle(fromElement, null);
    this._BG_PROPS.forEach(
      function(name) {
        toElement.style[name] = style[name];
      });
  },

  _injectPanelWindowFunctions: function _injectPanelWindowFunctions(iframe) {
    var functions = {
      close: function close() {
        iframe.parentNode.removeChild(iframe);
      }
    };

    WebContentFunctions.importIntoWindow(functions, iframe.contentWindow);
  },

  _addPanelToWindow: function _addPanelToWindow(window, url, width) {
    var self = this;
    var document = window.document;
    var statusBar = document.getElementById("status-bar");
    var iframe = document.createElement("iframe");
    MemoryTracking.track(iframe, "StatusBarPanel");
    iframe.setAttribute("type", "content");

    if (statusBar.hidden) {
      $(statusBar).bind(
        "DOMAttrModified",
        function onAttrModified(event) {
          if (event.originalTarget == statusBar && !statusBar.hidden) {
            $(statusBar).unbind("DOMAttrModified", onAttrModified);
            embedIframe();
          }
        });
    } else
      embedIframe();

    function embedIframe() {
      iframe.setAttribute("width", width);
      iframe.setAttribute("height", statusBar.boxObject.height);
      iframe.setAttribute("src", url);
      iframe.style.overflow = "hidden";
      iframe.addEventListener(
        "DOMContentLoaded",
        function onPanelLoad(evt) {
          if (evt.originalTarget.nodeName == "#document") {
            iframe.removeEventListener("DOMContentLoaded", onPanelLoad, true);
            self._injectPanelWindowFunctions(iframe);
            self._copyBackground(iframe.parentNode,
                                 iframe.contentDocument.body);
            iframe.contentDocument.body.style.padding = 0;
            iframe.contentDocument.body.style.margin = 0;
          }
        },
        true
      );
      statusBar.appendChild(iframe);
    }

    return iframe;
  },

  DEFAULT_PANEL_WIDTH: 200,

  append: function append(options) {
    var self = this;
    var url;

    if (options.url) {
      url = self._urlFactory.makeUrl(options.url);
    } else if (options.html) {
      url = "data:text/html," + encodeURI(options.html);
    } else
      url = "about:blank";

    var width = options.width ? options.width : self.DEFAULT_PANEL_WIDTH;

    // Add a deprecation/not-implemented warning to be helpful.
    if (options.onLoad)
      console.warn("options.onLoad is not currently supported; please " +
                   "consider using options.onReady instead.");

    self._browserWatchers.push(
      new BrowserWatcher(
        {onLoad: function(window) {
           var iframe = self._addPanelToWindow(window, url, width);
           self._windows.push(window);
           self._panels.push({url: url, iframe: iframe});
           if (options.onReady) {
             iframe.addEventListener(
               "DOMContentLoaded",
               function onPanelLoad(event) {
                 iframe.removeEventListener("DOMContentLoaded",
                                            onPanelLoad,
                                            false);
                 try {
                   // TODO: Do we want to use .call() or .apply() to
                   // set the handler's 'this' variable?
                   options.onReady(iframe.contentDocument);
                 } catch (e) {
                   console.exception(e);
                 }
               },
               false
             );
           }
         },
         onUnload: function(window) {
           var index = self._windows.indexOf(window);
           if (index != -1) {
             var panel = self._panels[index];
             delete self._windows[index];
             delete self._panels[index];
             if (options.onUnload) {
               try {
                 options.onUnload(panel.iframe.contentDocument);
               } catch (e) {
                 console.exception(e);
               }
             }

             // Remove anything in jQuery's cache that's associated with
             // the window we're closing.
             for (var id in jQuery.cache)
               if (jQuery.cache[id].handle) {
                 var elem = jQuery.cache[id].handle.elem;
                 if (elem.ownerDocument == panel.iframe.contentDocument)
                   jQuery.event.remove(elem);
               }

             if (panel.iframe.parentNode)
               panel.iframe.parentNode.removeChild(panel.iframe);
           }
         }
        }));
    }
};
