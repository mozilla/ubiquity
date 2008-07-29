var Ci = Components.interfaces;
var Cc = Components.classes;

function getPath(path) {
  var file = Cc["@mozilla.org/file/local;1"].
             createInstance(Ci.nsILocalFile);

  file.initWithPath(path);
  return file;
}

function bindDirToResource(path, alias) {
  var ioService = Cc["@mozilla.org/network/io-service;1"].
                  getService(Ci.nsIIOService);

  var resProt = ioService.getProtocolHandler("resource")
                         .QueryInterface(Ci.nsIResProtocolHandler);

  var aliasURI = ioService.newFileURI(path);
  resProt.setSubstitution(alias, aliasURI);
}

function registerComponent(path) {
  var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

  registrar.autoRegister(path);
}

if (arguments.length === 0) {
  throw new Error("Please provide the path to the root of the extension.");
}

var basePath = arguments[0];
var modulesDir = getPath(basePath);
modulesDir.appendRelativePath("modules");
bindDirToResource(modulesDir, "ubiquity-modules");

var componentPath = getPath(basePath);
componentPath.appendRelativePath("components");
componentPath.appendRelativePath("about.js");
registerComponent(componentPath);

var XpcShellTestResponder = {
  onStartTest : function(test) {
    dump("Running test: "+test.name+"\n");
  },

  onException : function(test, e) {
    var text = ("Error in test " +
                test.name + ": " + e.message);
    if (e.fileName)
      text += (" (in " + e.fileName +
               ", line " + e.lineNumber + ")");
    text += "\n";
    dump(text);
  },

  onFinished : function(successes, failures) {
    var total = successes + failures;

    var text = (successes + " out of " +
                total + " tests successful (" + failures +
                " failed).\n");

    dump(text);

    if (failures)
      throw new Error("Some tests were unsuccessful.");
  }
};

load(basePath + "/chrome/content/nlparser/verbtypes.js");
load(basePath + "/chrome/content/nlparser/nlparser.js");
load(basePath + "/chrome/content/test.js");
load(basePath + "/chrome/content/sandboxfactory.js");
load(basePath + "/chrome/content/cmdmanager.js");
load(basePath + "/chrome/content/tests.js");
load(basePath + "/chrome/content/verbtypes_unit_tests.js");

var suite = new TestSuite(XpcShellTestResponder, this);

suite.start();
