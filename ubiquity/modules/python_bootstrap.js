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
PyBootstrap.envDir = envDir;

var logFile = profileDir.clone();
logFile.append('ubiquity_python.log');

var configFile = profileDir.clone();
configFile.append('ubiquity_python.config');

var pythonFile = Cc["@mozilla.org/file/local;1"].
                 createInstance(Ci.nsILocalFile);

// TODO: Unix-specific.
var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"].
                 getService(Components.interfaces.nsIXULRuntime);
if (xulRuntime.OS != "WINNT") {
  pythonFile.initWithPath('/usr/bin/python');
}

var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
              createInstance(Ci.nsIFileInputStream);
var sstream = Cc["@mozilla.org/scriptableinputstream;1"].
              createInstance(Ci.nsIScriptableInputStream);

PyBootstrap.isJsbridgeStarted = false;

PyBootstrap.startJsbridge = function startJsbridge(log) {
  if (this.isJsbridgeStarted) {
    log("jsbridge is already started.");
    return true;
  }

  var configUri = ioSvc.newFileURI(configFile);
  if (!configFile.exists()) {
    log("config file does not exist: " + configFile.path);
    return false;
  }

  var json = Utils.getLocalUrl(configUri.spec);
  var config = Utils.decodeJson(json);

  var jsbridgeResourceDir = Cc["@mozilla.org/file/local;1"].
                            createInstance(Ci.nsILocalFile);
  jsbridgeResourceDir.initWithPath(config.jsbridge_resource_dir);

  if (!jsbridgeResourceDir.exists()) {
    log("jsbridge resource dir does not exist: " + jsbridgeResourceDir.path);
    return false;
  }

  var resProt = ioSvc.getProtocolHandler("resource")
                     .QueryInterface(Ci.nsIResProtocolHandler);
  var aliasURI = ioSvc.newFileURI(jsbridgeResourceDir);
  resProt.setSubstitution("jsbridge", aliasURI);

  var jsm = {};
  Components.utils.import("resource://jsbridge/modules/init.js", jsm);

  var server = jsm.server.server;
  for (var i = 0; i < 10; i++) {
    if (server.port != server.serv.port) {
      //errorToLocalize
      var msg = "listening on port " + server.port + " failed, trying next.";
      log(msg);
      Utils.reportWarning(msg);
      server = new jsm.server.Server(server.port + 1);
      server.start();
    } else
      break;
  }

  log("jsbridge started on port " + server.port + ".");

  this.isJsbridgeStarted = true;
  this.jsbridgePort = server.port;
  return true;
};

PyBootstrap.install = function install(log, callback) {
  log("Attempting to bootstrap virtualenv + jsbridge.\n");

  var extMgr = Cc["@mozilla.org/extensions/manager;1"].
               getService(Ci.nsIExtensionManager);
  var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");

  var bootstrapDir = loc.getItemLocation("ubiquity@labs.mozilla.com");
  bootstrapDir.append('python');

  var bootstrapFile = bootstrapDir.clone();
  bootstrapFile.append('bootstrap.py');

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

  Utils.setTimeout(waitForLogCreation, 100);

  function waitForLogCreation() {
    if (logFile.exists()) {
      fstream.init(logFile, -1, 0, 0);
      sstream.init(fstream);
      Utils.setTimeout(waitForLogEnd, 100);
    } else
      Utils.setTimeout(waitForLogCreation, 100);
  }

  var logContents = "";

  function waitForLogEnd() {
    var str = sstream.read(4096);
    logContents += str;
    log(str, false);
    var match = logContents.match(/DONE:(SUCCESS|FAILURE)/);
    if (match) {
      var result = match[1];
      sstream.close();
      fstream.close();
      if (callback) {
        if (result == "SUCCESS")
          callback(true);
        else
          callback(false);
      }
    } else
      Utils.setTimeout(waitForLogEnd, 100);
  }
};

PyBootstrap.uninstall = function uninstall(log) {
  if (envDir.exists()) {
    log("removing virtualenv dir: " + envDir.path);
    envDir.remove(true);
  }
  if (configFile.exists()) {
    log("removing config file: " + configFile.path);
    configFile.remove(true);
  }
  log("python bootstrap uninstalled.");
};
