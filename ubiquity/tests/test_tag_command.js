Components.utils.import("resource://ubiquity/tests/framework.js");
Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/parser/parser.js");

Components.utils.import("resource://ubiquity/tests/testing_stubs.js");

const Ci = Components.interfaces;
const Cc = Components.classes;

var module = this;

function testTagCommand() {

  var self = this;
  
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
  var NLParser = NLParserMaker(0);
  var nlParser = NLParser.makeParserForLanguage("en");
  makeCommandManager.call(this,
                          cmdSource,
                          services.messageService,
                          nlParser,
                          onCM);
  function onCM(cmdManager) {
    function uriHasTags(aURI, aTags) {
      var tags = tagsvc.getTagsForURI(aURI, {});
      dump('real tags: '+tags.join()+'\n');
      dump('aTags: '+aTags.join()+'\n');
      return aTags.every(function(aTag) {
        return tags.indexOf(aTag) > -1;
      }, module);
    }

    let Application = Components.classes["@mozilla.org/fuel/application;1"]
      .getService(Components.interfaces.fuelIApplication);

    var testURI = Application.activeWindow.activeTab.uri;

    // for cleanup
    var isBookmarked = bmsvc.isBookmarked(testURI);

    var cmd = cmdSource.getCommand(UbiquitySetup.getBaseUri() +
                                   "standard-feeds/firefox.html#tag");
    this.assert(cmd, "There should be a tag command here");

    var context = {focusedElement: null,
      focusedWindow: null};

    // test add tag
    cmdManager.updateInput("tag foo", context,
      self.makeCallback(
        function() {
          cmdManager.execute(context);
          self.assert(uriHasTags(testURI, ["foo"]));
        }
      )
    );

    // test tag appended to existing tags
    cmdManager.updateInput("tag bar", context,
      self.makeCallback(
        function() {
          cmdManager.execute(context);
          self.assert(uriHasTags(testURI, ["foo", "bar"]));
        }
      )
    );

    // test tag appended again to existing tags
    cmdManager.updateInput("tag bar", context,
      self.makeCallback(
        function() {
          cmdManager.execute(context);
          self.assert(uriHasTags(testURI, ["foo", "bar"]));
        }
      )
    );

    var cleanup = function() {
      // cleanup
      tagsvc.untagURI(testURI, null);
      if (!isBookmarked) {
        dump('removing now\n');
        dump(bmsvc.getBookmarkIdsForURI(testURI, {}).length+'\n');
        if (bmsvc.getBookmarkIdsForURI(testURI, {}).length)
          bmsvc.removeItem(bmsvc.getBookmarkIdsForURI(testURI, {})[0]);
      }
    }

    // test add tags separated by commas
    cmdManager.updateInput("tag bom, la bamba", context,
      self.makeCallback(
        function() {
          cmdManager.execute(context);
          self.assert(uriHasTags(testURI, ["foo", "bar", "bom", "la bamba"]));
          cleanup();
        }
      )
    );
    
  }
}

exportTests(this);
