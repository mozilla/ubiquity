function Import(url) {
  var jsmodule = {};

  if (this._sandboxContext) {
    var context = this._sandboxContext;
    if (!(url in context.modules))
      _loadIntoContext(url, context);

    var sandbox = context.modules[url];

    for (name in sandbox.EXPORTED_SYMBOLS)
      jsmodule[name] = sandbox[name];
  } else {
    Components.utils.import(url, jsmodule);
  }
  return jsmodule;
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
