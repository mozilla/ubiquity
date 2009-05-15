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

var StatusBar = {
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

  _panels: [],
  _windows: [],

  DEFAULT_PANEL_WIDTH: 200,

  append: function append(options) {
    var self = this;
    var url;

    if (options.url)
      url = options.url;
    else if (options.html) {
      url = "data:text/html," + encodeURI(options.html);
    } else
      url = "about:blank";

    var width = options.width ? options.width : self.DEFAULT_PANEL_WIDTH;

    forAllBrowsers(
      {onLoad: function(window) {
         var iframe = self._addPanelToWindow(window, url, width);
         self._windows.push(window);
         self._panels.push({url: url, iframe: iframe});
         if (options.onLoad) {
           iframe.addEventListener(
             "DOMContentLoaded",
             function onPanelLoad(event) {
               iframe.removeEventListener("DOMContentLoaded",
                                          onPanelLoad,
                                          false);
               try {
                 options.onLoad(iframe.contentDocument);
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
           if (panel.iframe.parentNode)
             panel.iframe.parentNode.removeChild(panel.iframe);
         }
       }
      });
  }
};
