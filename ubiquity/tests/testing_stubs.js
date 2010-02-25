const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/cmdmanager.js");

var EXPORTED_SYMBOLS = ["FakeCommandSource", "makeCommandManager",
                        "fakeContextUtils"];

var fakeContextUtils = {
  getHtmlSelection: function(context) { return context.htmlSelection; },
  getSelection: function(context) { return context.textSelection; },
  getSelectionObject: function(context) {
    return { text: context.textSelection,
             html: context.htmlSelection };
  }
};

function FakeCommandSource(cmdList) {
  for (var x in cmdList) {
    cmdList[x].names = [x];
  }
  this._cmdList = cmdList;
}
FakeCommandSource.prototype = {
  addListener: function () {},
  getCommand: function (name) {
    return this._cmdList[name];
  },
  getAllCommands: function (name) {
    return this._cmdList;
  },
  refresh: function () {}
};

function makeCommandManager(source, msgService, parser, callback) {
  this.skipIfXPCShell();

  var self = this;
  var {hiddenWindow} = Utils;
  var fakeDom = hiddenWindow.document;
  var xulIframe = fakeDom.createElement("iframe");
  var onload = this.makeCallback(function _onload() {
    xulIframe.removeEventListener("load", onload, true);
    var doc = xulIframe.contentDocument;
    var suggNode = doc.createElement("div");
    var suggFrame = doc.createElementNS("http://www.w3.org/1999/xhtml",
                                        "iframe");
    var prevNode = doc.createElement("div");
    var pbrowser = doc.createElementNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      "browser");
    pbrowser.setAttribute("disablehistory", true);

    suggNode.appendChild(suggFrame).src = "data:text/html,";
    prevNode.appendChild(pbrowser);

    callback.call(self,
                  new CommandManager(source, msgService, parser,
                                     doc.documentElement.appendChild(suggNode),
                                     doc.documentElement.appendChild(prevNode),
                                     doc.createElement("div")));
    xulIframe.parentNode.removeChild(xulIframe);
    callback = null;
    xulIframe = null;
  });
  xulIframe.setAttribute("src",
                         "chrome://ubiquity/content/content-preview.xul");
  xulIframe.addEventListener("load", onload, true);
  // Workaround to make this code work on platforms where the hidden
  // window is XUL instead of HTML.
  if (!fakeDom.body) {
    var fakeDomBody = fakeDom.createElement("body");
    fakeDom.documentElement.appendChild(fakeDomBody);
    fakeDom.body = fakeDomBody;
  }
  fakeDom.body.appendChild(xulIframe);
}
