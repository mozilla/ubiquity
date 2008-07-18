function _getUrlBasename(url) {
  var start = url.lastIndexOf("/") + 1;
  var end = url.lastIndexOf(".");

  return url.slice(start, end);
}

function Import(url, jsmodule) {
  var jsmName;
  if (typeof(jsmodule) == "undefined") {
    jsmodule = {};
    jsmName = _getUrlBasename(url);
    if (!jsmName)
      throw new Error("Couldn't generate name for " + url);
  }

  if (this._sandboxContext) {
    var context = this._sandboxContext;
    if (!(url in context.modules))
      _loadIntoContext(url, context);

    var sandbox = context.modules[url];

    for (var i = 0; i < sandbox.EXPORTED_SYMBOLS.length; i++) {
      var name = sandbox.EXPORTED_SYMBOLS[i];
      jsmodule[name] = sandbox[name];
    }
  } else {
    Components.utils.import(url, jsmodule);
  }

  if (jsmName)
    this[jsmName] = jsmodule;
}

function setSandboxContext(sandboxFactory) {
  if (this._sandboxContext)
    throw new Error("Sandbox context is already set.");

  this._sandboxContext = {
    factory: sandboxFactory,
    modules: {}
  };
}

function _loadIntoContext(url, context) {
  var sandbox = context.factory.makeSandbox();
  sandbox._sandboxContext = context;

  var request = Components.
                classes["@mozilla.org/xmlextras/xmlhttprequest;1"].
                createInstance();

  request.open("GET", url, false);
  request.send(null);
  // TODO: What if request failed?
  var code = request.responseText;

  context.modules[url] = sandbox;
  context.factory.evalInSandbox(code, sandbox);
  if (!sandbox.EXPORTED_SYMBOLS)
    throw new Error("JSModule does not define EXPORTED_SYMBOLS: " + url);
}

function exportPublicSymbols() {
  var exportedSymbols = [];

  for (name in this)
    if (name.charAt(0) != "_")
      exportedSymbols.push(name);

  this["EXPORTED_SYMBOLS"] = exportedSymbols;
}

exportPublicSymbols();
