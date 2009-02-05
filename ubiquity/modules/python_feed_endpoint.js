Components.utils.import('resource://ubiquity/modules/utils.js');
Components.utils.import('resource://ubiquity/modules/python_bootstrap.js');

var EXPORTED_SYMBOLS = ['Endpoint'];

var Cc = Components.classes;
var Ci = Components.interfaces;

function fireEvent(name, obj) {
  var events = {};
  Components.utils.import("resource://jsbridge/modules/events.js", events);
  events.fireEvent(name, obj);
}

var Endpoint = {
  __registryCallbacks: {},
  __apis: {},
  isServerRegistered: false,
  serverProcess: null,
  getApi: function getApi(url) {
    return Endpoint.__apis[url];
  },
  executeVerb: function executeVerb(options) {
    fireEvent("ubiquity-python:execute-verb", options);
  },
  refreshServer: function refreshServer(options) {
    Endpoint.__apis[options.info.feed] = options.api;
    fireEvent("ubiquity-python:refresh-feed", options.info);
  },
  registerServer: function registerServer() {
    Endpoint.isServerRegistered = true;
    let Application = Components.classes["@mozilla.org/fuel/application;1"]
                      .getService(Components.interfaces.fuelIApplication);
    Application.events.addListener(
      "quit",
      {handleEvent: function() {
         fireEvent('ubiquity-python:shutdown', true);
       }}
    );
    for (uri in Endpoint.__registryCallbacks)
      Utils.setTimeout(Endpoint.__registryCallbacks[uri], 0);
    Endpoint.__registryCallbacks = {};
  },
  setServerRegistryCallback: function setServerRegistryCallback(uri, cb) {
    Endpoint.__registryCallbacks[uri] = cb;
  },
  startServer: function startServer() {
    var extMgr = Cc["@mozilla.org/extensions/manager;1"].
                 getService(Ci.nsIExtensionManager);
    var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");

    var serverFile = loc.getItemLocation("ubiquity@labs.mozilla.com");
    serverFile.append('python');
    serverFile.append('feed_server.py');
    var process = Cc["@mozilla.org/process/util;1"]
                  .createInstance(Ci.nsIProcess);

    var pythonFile = PyBootstrap.envDir.clone();
    pythonFile.append('bin');
    pythonFile.append('python');

    process.init(pythonFile);
    var args = [serverFile.path, PyBootstrap.jsbridgePort];
    process.run(false, args, args.length);
    Endpoint.serverProcess = process;
  }
};
