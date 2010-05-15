/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Satoshi Murakami <murky.satyr@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["UbiquitySetup"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/msgservice.js");
Cu.import("resource://ubiquity/modules/feedmanager.js");
Cu.import("resource://ubiquity/modules/default_feed_plugin.js");
//Cu.import("resource://ubiquity/modules/webpage_feed_plugin.js");
//Cu.import("resource://ubiquity/modules/python_feed_plugin.js");
Cu.import("resource://ubiquity/modules/locked_down_feed_plugin.js");
Cu.import("resource://ubiquity/modules/annotation_memory.js");
Cu.import("resource://ubiquity/modules/suggestion_memory.js");
Cu.import("resource://ubiquity/modules/feedaggregator.js");
Cu.import("resource://ubiquity/modules/webjsm.js");
Cu.import("resource://ubiquity/modules/prefcommands.js");
Cu.import("resource://ubiquity/modules/skin_feed_plugin.js");

var gServices, gWebJsModule, gPrefs = Utils.prefs;

const RESET_SCHEDULED_PREF = "extensions.ubiquity.isResetScheduled";
const VERSION_PREF ="extensions.ubiquity.lastversion";
const ANN_DB_FILENAME = "ubiquity_ann.sqlite";

var UbiquitySetup = {
  isNewlyInstalledOrUpgraded: false,

  STANDARD_FEEDS_URI: "resource://ubiquity/standard-feeds/",
  STANDARD_FEEDS: [{page: "firefox.html",
                    source: "firefox.js",
                    title: "Mozilla Browser Commands"},

                   {page: "social.html",
                    source: "social.js",
                    title: "Mozilla Social Networking Commands"},

                   {page: "developer.html",
                    source: "developer.js",
                    title: "Mozilla Developer Commands"},

                   {page: "pageedit.html",
                    source: "pageedit.js",
                    title: "Mozilla Page Editing Commands"},

                   {page: "general.html",
                    source: "general.js",
                    title: "Mozilla General Utility Commands"},

                   {page: "email.html",
                    source: "email.js",
                    title: "Mozilla Email Commands"},

                   {page: "calendar.html",
                    source: "calendar.js",
                    title: "Mozilla Calendar Commands"},

                   {page: "map.html",
                    source: "map.js",
                    title: "Mozilla Map Commands"},

                   {page: "search.html",
                    source: "search.xhtml",
                    title: "Mozilla Web Search Commands"}],

  __modifyUserAgent: function __modifyUserAgent() {
    // This is temporary code to fix old versions of Ubiquity that
    // modified the User-Agent string without uninstalling cleanly.
    // See #471 for more information.
    const USERAGENT_PREF = "general.useragent.extra.ubiquity";
    gPrefs.setValue(USERAGENT_PREF, "");

    // If we're talking to ubiquity.mozilla.com, pass extra information
    // in the User-Agent string so it knows what version of the
    // standard feeds to give us.
    var userAgentExtra = "Ubiquity/" + this.version;

    var observer = {
      observe: function(subject, topic, data) {
        subject = subject.QueryInterface(Ci.nsIHttpChannel);
        if (subject.URI.host == "ubiquity.mozilla.com") {
          var userAgent = subject.getRequestHeader("User-Agent");
          userAgent += " " + userAgentExtra;
          subject.setRequestHeader("User-Agent", userAgent, false);
        }
      }
    };

    var observerSvc = (Cc["@mozilla.org/observer-service;1"]
                       .getService(Ci.nsIObserverService));
    observerSvc.addObserver(observer, "http-on-modify-request", false);
  },

  __setupFinalizer: function __setupFinalizer() {
    var observer = {
      observe: function(subject, topic, data) {
        gServices.feedManager.finalize();
      }
    };

    var observerSvc = (Cc["@mozilla.org/observer-service;1"]
                       .getService(Ci.nsIObserverService));
    observerSvc.addObserver(observer, "quit-application", false);
  },

  __maybeReset: function __maybeReset() {
    if (this.isResetScheduled) {
      // Reset all feed subscriptions.
      let annDb = AnnotationService.getProfileFile(ANN_DB_FILENAME);
      if (annDb.exists())
        annDb.remove(false);

      // We'll reset the preferences for our extension here.  Unfortunately,
      // there doesn't seem to be an easy way to get this from FUEL, so
      // we'll have to use XPCOM directly.
      var prefs = (Cc["@mozilla.org/preferences-service;1"]
                   .getService(Ci.nsIPrefService));
      prefs = prefs.getBranch("extensions.ubiquity.");

      // Ideally we'd call prefs.resetBranch() here, but according to MDC
      // the function isn't implemented yet, so we'll have to do it
      // manually.
      var children = prefs.getChildList("", {});
      children.forEach(
        function eachChild(name) {
          if (prefs.prefHasUserValue(name))
            prefs.clearUserPref(name);
        });

      // Reset suggestion memory:
      new SuggestionMemory("main_parser").wipe();

      // This is likely redundant since we just reset all prefs, but we'll
      // do it for completeness...
      this.isResetScheduled = false;
    }
  },

  getBaseUri: function getBaseUri() this.baseUrl,

  isInstalledAsXpi: function isInstalledAsXpi() {
    let profileDir = Utils.DirectoryService.get("ProfD", Ci.nsIFile);
    let profileUrl = Utils.IOService.newFileURI(profileDir).spec;
    return !this.baseUrl.lastIndexOf(profileUrl, 0);
  },

  preload: function preload(callback) {
    if (gWebJsModule) {
      callback();
      return;
    }

    this.__maybeReset();

    const ID = "ubiquity@labs.mozilla.com", ME = this;
    ("AddonManager" in Utils
     ? Utils.AddonManager.getAddonByID(ID, setAddonInfo)
     : setAddonInfo(Utils.ExtensionManager.getItemForID(ID)));
    function setAddonInfo(addon) {
      ME.version = addon.version;
      ME.baseUrl = (
        "getResourceURL" in addon
        ? addon.getResourceURL("")
        : Utils.IOService.newFileURI(Utils.ExtensionManager
                                     .getInstallLocation(ID)
                                     .getItemLocation(ID)).spec);
      gWebJsModule = new WebJsModule(callback);
    }
  },

  get isResetScheduled()
    gPrefs.get(RESET_SCHEDULED_PREF, false),
  set isResetScheduled(value)
    gPrefs.set(RESET_SCHEDULED_PREF, value),

  __removeExtinctStandardFeeds: function __rmExtinctStdFeeds(feedManager) {
    var OLD_STD_FEED_URIS = [
      "https://ubiquity.mozilla.com/standard-feeds/",
      this.getBaseUri() + "standard-feeds/"];

    feedManager.getAllFeeds().forEach(function removeExtinct(feed) {
      var {spec} = feed.uri;
      if (OLD_STD_FEED_URIS.some(function (u) spec.indexOf(u) === 0) ||
          feed.title === "Mozilla Image-Related Commands")
        feed.purge();
    });
  },

  createServices: function createServices() {
    if (!gServices) {
      // Compare the version in our preferences from our version in the
      // install.rdf.
      var currVersion = gPrefs.getValue(VERSION_PREF, "firstrun");
      if (currVersion != this.version) {
        gPrefs.setValue(VERSION_PREF, this.version);
        this.isNewlyInstalledOrUpgraded = true;
      }

      this.__modifyUserAgent();

      var annDbFile = AnnotationService.getProfileFile(ANN_DB_FILENAME);
      var annDbConn = AnnotationService.openDatabase(annDbFile);
      var annSvc = new AnnotationService(annDbConn);

      var feedManager = new FeedManager(annSvc);
      var msgService = new CompositeMessageService();

      msgService.add(new AlertMessageService());
      msgService.add(new ErrorConsoleMessageService());

      var disabledStorage =
        new DisabledCmdStorage("extensions.ubiquity.disabledCommands");

      var defaultFeedPlugin = new DefaultFeedPlugin(feedManager,
                                                    msgService,
                                                    gWebJsModule,
                                                    this.languageCode,
                                                    "resource://ubiquity/",
                                                    this.parserVersion);

      var ldfPlugin = new LockedDownFeedPlugin(feedManager,
                                               msgService,
                                               gWebJsModule);
      /*
      var wpfp = new WebPageFeedPlugin(feedManager, msgService,
                                       gWebJsModule);

      var pfp = new PythonFeedPlugin(feedManager,
                                     msgService,
                                     gWebJsModule);
       */
      var cmdSource = new FeedAggregator(
        feedManager,
        msgService,
        disabledStorage.getDisabledCommands()
      );
      disabledStorage.attach(cmdSource);

      gServices = {
        commandSource: cmdSource,
        feedManager: feedManager,
        messageService: msgService,
        skinService: SkinFeedPlugin(feedManager, msgService, gWebJsModule),
      };

      this.__setupFinalizer();

      PrefCommands.init(feedManager);

      if (this.isNewlyInstalledOrUpgraded) {
        this.__removeExtinctStandardFeeds(feedManager);

        // For some reason, the following function isn't executed
        // atomically by Javascript; perhaps something being called is
        // getting the '@mozilla.org/thread-manager;1' service and
        // spinning via a call to processNextEvent() until some kind of
        // I/O is finished?
        defaultFeedPlugin.installDefaults(this.STANDARD_FEEDS_URI,
                                          this.STANDARD_FEEDS_URI,
                                          this.STANDARD_FEEDS);
      }

      cmdSource.refresh();
    }

    return gServices;
  },

  setupWindow: function setupWindow(window) {
    gServices.feedManager.installToWindow(window);

    function onPageLoad(event) {
      if (gPrefs.get("extensions.ubiquity.enablePageLoadHandlers", true) &&
          event.originalTarget.location)
        gServices.commandSource.onPageLoad(event.originalTarget);
    }

    for each (let id in ["appcontent", "sidebar"]) {
      let browser = window.document.getElementById(id);
      if (browser)
        browser.addEventListener("DOMContentLoaded", onPageLoad, true);
    }
  },

  get languageCode()
    gPrefs.getValue("extensions.ubiquity.language", "en"),

  get parserVersion()
    gPrefs.getValue("extensions.ubiquity.parserVersion", 2),
};
function DisabledCmdStorage(prefName) {
  var disabledCommands = JSON.parse(gPrefs.getValue(prefName, "{}"));

  this.getDisabledCommands = function getDisabledCommands() {
    return disabledCommands;
  };

  function onDisableChange(eventName) {
    gPrefs.setValue(prefName, JSON.stringify(disabledCommands));
  }

  this.attach = function attach(cmdSource) {
    cmdSource.addListener("disabled-command-change", onDisableChange);
  };
}
