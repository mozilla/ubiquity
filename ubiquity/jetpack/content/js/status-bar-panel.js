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

  addPanel: function addStatusBarPanel(window, url, width) {
    var self = this;
    var document = window.document;
    var statusBar = document.getElementById("status-bar");
    var iframe = document.createElement("iframe");
    iframe.setAttribute("type", "content");
    iframe.setAttribute("src", url);
    iframe.setAttribute("width", width);
    iframe.setAttribute("height", statusBar.boxObject.height);
    iframe.style.overflow = "hidden";
    iframe.addEventListener(
      "DOMContentLoaded",
      function onPanelLoad(evt) {
        // TODO: This event fires even if the iframe isn't visible and
        // doesn't have a defined contentWindow yet!
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
    MemoryTracking.track(iframe, "StatusBarPanel");
    return iframe;
  }
};
