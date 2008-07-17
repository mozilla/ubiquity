// Create some iframes to use as sandboxes; the window's onload()
// won't be called until they're all loaded.  This is so the
// IframeSandboxFactory can create sandboxes without requiring a
// callback.

var __iframes = [];
var __NUM_IFRAMES = 10;
var __currIframe = 0;

for (var i = 0; i < __NUM_IFRAMES; i++) {
  let iframe = window.document.createElementNS(
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    "iframe"
  );

  window.document.documentElement.appendChild(iframe);
  __iframes.push(iframe);
}

function IframeSandboxFactory(globals) {
  if (globals == undefined)
    globals = {};
  this._globals = globals;
}

IframeSandboxFactory.prototype = {
  makeSandbox: function(cb) {
    if (__currIframe == __NUM_IFRAMES)
      throw new Error("Maximum number of sandboxes reached.");
    var iframe = __iframes[__currIframe];
    __currIframe += 1;

    var sandbox = iframe.contentWindow.wrappedJSObject;

    for (symbolName in this._globals) {
      sandbox[symbolName] = this._globals[symbolName];
    }

    return sandbox;
  },

  evalInSandbox: function(code, sandbox) {
    var newScript = sandbox.document.createElement("script");

    newScript.textContent = code;
    newScript.type = "text/javascript;version=1.7";
    // The following call actually executes the code.
    sandbox.document.documentElement.appendChild(newScript);
  }
};
