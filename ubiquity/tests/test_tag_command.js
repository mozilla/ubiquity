Components.utils.import("resource://ubiquity/tests/framework.js");
Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/cmdmanager.js");
Components.utils.import("resource://ubiquity/modules/parser/parser.js");

const Ci = Components.interfaces;
const Cc = Components.classes;

var module = this;

function testTagCommand() {
  this.skipIfXPCShell();

  var hiddenWindow = Cc["@mozilla.org/appshell/appShellService;1"]
                     .getService(Ci.nsIAppShellService)
                     .hiddenDOMWindow;
  var fakeDom = hiddenWindow.document;

  var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
              .getService(Ci.nsINavBookmarksService);

  var tagsvc = Cc["@mozilla.org/browser/tagging-service;1"]
               .getService(Ci.nsITaggingService);

  Components.utils.import("resource://ubiquity/modules/setup.js");

  var services = UbiquitySetup.createServices();
  var cmdSource = services.commandSource;
  var nlParser = NLParser.makeParserForLanguage(UbiquitySetup.languageCode,
                                                [], []);
  var cmdManager = new CommandManager(cmdSource, services.messageService,
                                      nlParser,
                                      fakeDom.createElement("div"),
                                      fakeDom.createElement("div"),
                                      fakeDom.createElement("div"));

  function uriHasTags(aURI, aTags) {
    var tags = tagsvc.getTagsForURI(aURI, {});
    return aTags.every(function(aTag) {
      return tags.indexOf(aTag) > -1;
    }, module);
  }

  let Application = Components.classes["@mozilla.org/fuel/application;1"]
                    .getService(Components.interfaces.fuelIApplication);

  var testURI = Application.activeWindow.activeTab.uri;

  // for cleanup
  var isBookmarked = bmsvc.isBookmarked(testURI);

  var cmd = cmdSource.getCommand("tag");
  this.assert(cmd);

  var context = {focusedElement: null,
                 focusedWindow: null};

  // test add tag
  cmdManager.updateInput("tag foo", context);
  cmdManager.execute(context);
  this.assert(uriHasTags(testURI, ["foo"]));

  // test tag appended to existing tags
  cmdManager.updateInput("tag bar", context);
  cmdManager.execute(context);
  this.assert(uriHasTags(testURI, ["foo", "bar"]));

  // test add tags separated by spaces
  cmdManager.updateInput("tag baz bot", context);
  cmdManager.execute(context);
  this.assert(uriHasTags(testURI, ["foo", "bar", "baz", "bot"]));

  // test add tags separated by commas
  cmdManager.updateInput("tag bom, la bamba", context);
  cmdManager.execute(context);
  this.assert(uriHasTags(testURI, ["foo", "bar", "baz", "bot", "bom",
                                   "la bamba"]));

  // cleanup
  tagsvc.untagURI(testURI, null);
  if (!isBookmarked)
    bmsvc.removeItem(bmsvc.getBookmarkIdsForURI(testURI, {})[0]);
}

exportTests(this);
