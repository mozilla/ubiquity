Components.utils.import("resource://ubiquity-tests/framework.js");
Components.utils.import("resource://ubiquity-modules/setup.js");
Components.utils.import("resource://ubiquity-modules/cmdmanager.js");
Components.utils.import("resource://ubiquity-modules/cmdsource.js");
Components.utils.import("resource://ubiquity-modules/parser/parser.js");

function LOG(aMsg) {
  aMsg = ("*** UBI TESTS: " + aMsg);
  Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).
    logStringMessage(aMsg);
}

var services = UbiquitySetup.createServices();
var cmdSource = services.commandSource;
var nlParser = NLParser.makeParserForLanguage(UbiquitySetup.languageCode, [], []);
var cmdManager = new CommandManager(cmdSource, services.messageService,
                                    nlParser);

const Ci = Components.interfaces;
const Cc = Components.classes;

var tagsvc = Cc["@mozilla.org/browser/tagging-service;1"].getService(Ci.nsITaggingService);
var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
var iosvc = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

function uri(spec) {
  return iosvc.newURI(spec, null, null);
}

function uriHasTags(aURI, aTags) {
  var tags = tagsvc.getTagsForURI(aURI, {});
  return aTags.every(function(aTag) {
    return tags.indexOf(aTag) > -1;
  }, this);
}

function testTagCommand() {
  var testURI = uri("chrome://ubiquity/content/test.html");

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
  this.assert(uriHasTags(testURI, ["foo", "bar", "baz", "bot", "bom", "la bamba"])); 

  // cleanup
  tagsvc.untagURI(testURI, null);
  if (!isBookmarked)
    bmsvc.removeItem(bmsvc.getBookmarkIdsForURI(testURI, {})[0]);
}

exportTests(this);
