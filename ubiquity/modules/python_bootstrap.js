Components.utils.import("resource://ubiquity/modules/utils.js");

EXPORTED_SYMBOLS = ["PyBootstrap"];

PyBootstrap = {};

var Cc = Components.classes;
var Ci = Components.interfaces;

var ioSvc = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);

var dirSvc = Cc["@mozilla.org/file/directory_service;1"]
             .getService(Ci.nsIProperties);

var profileDir = dirSvc.get("ProfD", Ci.nsIFile);
var envDir = profileDir.clone();
envDir.append('ubiquity_python');

var logFile = profileDir.clone();
logFile.append('ubiquity_python.log');

var configFile = profileDir.clone();
configFile.append('ubiquity_python.config');

var extMgr = Cc["@mozilla.org/extensions/manager;1"]
             .getService(Ci.nsIExtensionManager);
var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");

var pythonFile = Cc["@mozilla.org/file/local;1"].
                 createInstance(Ci.nsILocalFile);

// TODO: Unix-specific.
pythonFile.initWithPath('/usr/bin/python');

var bootstrapDir = loc.getItemLocation("ubiquity@labs.mozilla.com");
bootstrapDir.append('python');

var bootstrapFile = bootstrapDir.clone();
bootstrapFile.append('bootstrap.py');

var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                        createInstance(Ci.nsIFileInputStream);
var sstream = Cc["@mozilla.org/scriptableinputstream;1"].
                        createInstance(Ci.nsIScriptableInputStream);

PyBootstrap.startJsbridge = function startJsbridge(log) {
  var configUri = ioSvc.newFileURI(configFile).spec;
  var json = Utils.getLocalUrl(configUri);
  var config = Utils.decodeJson(json);

  var jsbridgeResourceDir = Cc["@mozilla.org/file/local;1"].
                            createInstance(Ci.nsILocalFile);
  jsbridgeResourceDir.initWithPath(config.jsbridge_resource_dir);

  var resProt = ioSvc.getProtocolHandler("resource")
                     .QueryInterface(Ci.nsIResProtocolHandler);
  var aliasURI = ioSvc.newFileURI(jsbridgeResourceDir);
  resProt.setSubstitution("jsbridge", aliasURI);

  Components.utils.import("resource://jsbridge/modules/init.js");

  log("done.");
};

PyBootstrap.install = function install(window, log) {
  log("Attempting to bootstrap virtualenv + jsbridge.\n");
  log("bootstrap file is at " + bootstrapFile.path);
  log("python dir is at " + envDir.path);
  log("logfile is at " + logFile.path);
  log("python is at " + pythonFile.path);

  if (logFile.exists())
    logFile.remove(true);

  log("\nPlease wait...\n");

  var process = Cc["@mozilla.org/process/util;1"]
                .createInstance(Ci.nsIProcess);

  process.init(pythonFile);
  var args = [bootstrapFile.path, envDir.path, logFile.path,
              configFile.path, bootstrapDir.path];
  process.run(false, args, args.length);

  window.setTimeout(waitForLogCreation, 100);

  function waitForLogCreation() {
    if (logFile.exists()) {
      fstream.init(logFile, -1, 0, 0);
      sstream.init(fstream);
      window.setTimeout(waitForLogEnd, 100);
    } else
      window.setTimeout(waitForLogCreation, 100);
  }

  var logContents = "";

  function waitForLogEnd() {
    var str = sstream.read(4096);
    logContents += str;
    log(str, false);
    var match = logContents.match(/DONE:(SUCCESS|FAILURE)/);
    if (match) {
      var result = match[1];
      log("Bootstrap result: " + result);
      sstream.close();
      fstream.close();
    } else
      window.setTimeout(waitForLogEnd, 100);
  }
};

PyBootstrap.uninstall = function uninstall(log) {
  if (envDir.exists()) {
    log("Removing virtualenv dir.");
    envDir.remove(true);
    log("Done.");
  }
};
