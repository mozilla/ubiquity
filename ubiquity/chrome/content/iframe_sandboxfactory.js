function IframeSandboxFactory(globals) {
  if (globals == undefined)
    globals = {};
  this._globals = globals;
}

IframeSandboxFactory.prototype = {
  makeSandbox: function() {
    let iframe = window.document.createElementNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      "iframe"
    );

    var finishedLoading = false;

    iframe.onload = function() {
      finishedLoading = true;
    };

    window.document.documentElement.appendChild(iframe);

    var thread = Components.classes["@mozilla.org/thread-manager;1"]
                 .getService(Components.interfaces.nsIThreadManager)
                 .currentThread;

    while (!finishedLoading)
      thread.processNextEvent(true);

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
