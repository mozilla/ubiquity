function entityify(string) {
    return string.replace(/&/g, "&amp;").replace(/</g,
        "&lt;").replace(/>/g, "&gt;");
};

var Cc = Components.classes;
var Ci = Components.interfaces;

var dirSvc = Cc["@mozilla.org/file/directory_service;1"]
             .getService(Ci.nsIProperties);
var profileDir = dirSvc.get("ProfD", Ci.nsIFile);
var envDir = profileDir.clone();
envDir.append('ubiquity_python');

var logFile = profileDir.clone();
logFile.append('ubiquity_python.log');

var extMgr = Cc["@mozilla.org/extensions/manager;1"]
             .getService(Ci.nsIExtensionManager);
var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");

var pythonFile = Cc["@mozilla.org/file/local;1"].
                 createInstance(Ci.nsILocalFile);

// TODO: Unix-specific.
pythonFile.initWithPath('/usr/bin/python');

var bootstrapFile = loc.getItemLocation("ubiquity@labs.mozilla.com");
bootstrapFile.append('python');
bootstrapFile.append('bootstrap.py');

var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                        createInstance(Components.interfaces.nsIFileInputStream);
var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"].
                        createInstance(Components.interfaces.nsIScriptableInputStream);

function log(text) {
  $("#install-log").append(entityify(text) + "\n");
}

function startInstall() {
  log("Attempting to bootstrap virtualenv + jsbridge.\n");
  log("bootstrap file is at " + bootstrapFile.path);
  log("python dir is at " + envDir.path);
  log("logfile is at " + logFile.path);
  log("python is at " + pythonFile.path);

  if (logFile.exists())
    logFile.remove(true);

  log("\nPlease wait...\n");

  var process = Components.classes["@mozilla.org/process/util;1"]
                .createInstance(Components.interfaces.nsIProcess);

  process.init(pythonFile);
  var args = [bootstrapFile.path, envDir.path, logFile.path];
  process.run(false, args, args.length);

  window.setTimeout(waitForLogCreation, 100);
}

function killInstall() {
  if (envDir.exists()) {
    log("Removing virtualenv dir.");
    envDir.remove(true);
    log("Done.");
  }
}

function waitForLogCreation() {
  if (logFile.exists()) {
    fstream.init(logFile, -1, 0, 0);
    sstream.init(fstream);
    window.setTimeout(waitForLogEnd, 100);
  } else
    window.setTimeout(waitForLogCreation, 100);
}

function waitForLogEnd() {
  var str = sstream.read(4096);
  $("#install-log").append(str);
  window.setTimeout(waitForLogEnd, 100);

  //TODO:
  //sstream.close();
  //fstream.close();
}
