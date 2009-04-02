Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/cmdmanager.js");

EXPORTED_SYMBOLS = ["FakeCommandSource", "makeCommandManager"];

function FakeCommandSource( cmdList ) {
  this._cmdList = cmdList;
  for ( var x in cmdList ) {
    this._cmdList[x].name = x;
  }
}
FakeCommandSource.prototype = {
  addListener: function() {},
  getCommand: function(name) {
    return this._cmdList[name];
  },
  getAllCommands: function(name) {
    return this._cmdList;
  },
  getAllNounTypes: function() {
    return [];
  },
  refresh: function() {
  }
};

function makeCommandManager(source, msgService, parser) {
  this.skipIfXPCShell();

  var Cc = Components.classes;
  var Ci = Components.interfaces;

  var hiddenWindow = Cc["@mozilla.org/appshell/appShellService;1"]
                     .getService(Ci.nsIAppShellService)
                     .hiddenDOMWindow;
  var fakeDom = hiddenWindow.document;

  return new CommandManager(source, msgService, parser,
                            fakeDom.createElement("div"),
                            fakeDom.createElement("div"),
                            fakeDom.createElement("div"));
}
