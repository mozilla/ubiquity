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

EXPORTED_SYMBOLS = ["UbiquitySetup"];

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/msgservice.js");
Components.utils.import("resource://ubiquity/modules/feedmanager.js");
Components.utils.import("resource://ubiquity/modules/default_feed_plugin.js");
Components.utils.import("resource://ubiquity/modules/locked_down_feed_plugin.js");
Components.utils.import("resource://ubiquity/modules/annotation_memory.js");
Components.utils.import("resource://ubiquity/modules/feedaggregator.js");

let Application = Components.classes["@mozilla.org/fuel/application;1"]
                  .getService(Components.interfaces.fuelIApplication);

let gServices;

let gIframe;

const RESET_SCHEDULED_PREF = "extensions.ubiquity.isResetScheduled";
const VERSION_PREF ="extensions.ubiquity.lastversion";
const ANN_DB_FILENAME = "ubiquity_ann.sqlite";

let UbiquitySetup = {
  isNewlyInstalledOrUpgraded: false,

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
                    title: "Mozilla Web Search Commands"},

                   {page: "image.html",
                    source: "image.xhtml",
                    title: "Mozilla Image-Related Commands"}],

  __getExtDir: function __getExtDir() {
    let Cc = Components.classes;
    let extMgr = Cc["@mozilla.org/extensions/manager;1"]
                 .getService(Components.interfaces.nsIExtensionManager);
    let loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");
    let extDir = loc.getItemLocation("ubiquity@labs.mozilla.com");

    return extDir;
  },

  __modifyUserAgent: function __modifyUserAgent() {
    // This is temporary code to fix old versions of Ubiquity that
    // modified the User-Agent string without uninstalling cleanly.
    // See #471 for more information.
    const USERAGENT_PREF = "general.useragent.extra.ubiquity";
    Application.prefs.setValue(USERAGENT_PREF, "");

    // If we're talking to ubiquity.mozilla.com, pass extra information
    // in the User-Agent string so it knows what version of the
    // standard feeds to give us.
    var userAgentExtra = "Ubiquity/" + this.version;
    var Cc = Components.classes;
    var Ci = Components.interfaces;

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

    var observerSvc = Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService);
    observerSvc.addObserver(observer, "http-on-modify-request", false);
  },

  __maybeReset: function __maybeReset() {
    if (this.isResetScheduled) {
      // Reset all feed subscriptions.
      let annDb = AnnotationService.getProfileFile(ANN_DB_FILENAME);
      if (annDb.exists())
        annDb.remove(false);

      // Reset all skins.
      let jsm = {};
      Components.utils.import("resource://ubiquity/modules/skinsvc.js",
                              jsm);
      jsm.SkinSvc.reset();

      // We'll reset the preferences for our extension here.  Unfortunately,
      // there doesn't seem to be an easy way to get this from FUEL, so
      // we'll have to use XPCOM directly.
      var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService);
      prefs = prefs.getBranch("extensions.ubiquity.");

      // Ideally we'd call prefs.resetBranch() here, but according to MDC
      // the function isn't implemented yet, so we'll have to do it
      // manually.
      var children = prefs.getChildList("", {});
      children.forEach(
        function(name) {
          if (prefs.prefHasUserValue(name))
            prefs.clearUserPref(name);
        });

      // This is likely redundant since we just reset all prefs, but we'll
      // do it for completeness...
      this.isResetScheduled = false;
    }
  },

  getBaseUri: function getBaseUri() {
    let ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
    let extDir = this.__getExtDir();
    let baseUri = ioSvc.newFileURI(extDir).spec;

    return baseUri;
  },

  isInstalledAsXpi: function isInstalledAsXpi() {
    let Cc = Components.classes;
    let profileDir = Cc["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
    let extDir = this.__getExtDir();
    if (profileDir.contains(extDir, false))
      return true;
    return false;
  },

  preload: function preload(callback) {
    if (gIframe) {
      callback();
      return;
    }

    this.__maybeReset();

    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var hiddenWindow = Cc["@mozilla.org/appshell/appShellService;1"]
                       .getService(Ci.nsIAppShellService)
                       .hiddenDOMWindow;

    gIframe = hiddenWindow.document.createElement("iframe");
    gIframe.setAttribute("id", "ubiquityFrame");
    gIframe.setAttribute("src", "chrome://ubiquity/content/hiddenframe.html");
    gIframe.addEventListener(
      "pageshow",
      function onPageShow() {
        gIframe.removeEventListener("pageshow", onPageShow, false);
        callback();
      },
      false
    );
    hiddenWindow.document.documentElement.appendChild(gIframe);
  },

  get isResetScheduled() {
    return Application.prefs.getValue(RESET_SCHEDULED_PREF, false);
  },

  set isResetScheduled(value) {
    Application.prefs.setValue(RESET_SCHEDULED_PREF, value);
  },

  createServices: function createServices() {
    if (!gServices) {
      // Compare the version in our preferences from our version in the
      // install.rdf.
      var currVersion = Application.prefs.getValue(VERSION_PREF, "firstrun");
      if (currVersion != this.version) {
        Application.prefs.setValue(VERSION_PREF, this.version);
        this.isNewlyInstalledOrUpgraded = true;
      }

      this.__modifyUserAgent();

      var Cc = Components.classes;

      var annDbFile = AnnotationService.getProfileFile(ANN_DB_FILENAME);
      var annDbConn = AnnotationService.openDatabase(annDbFile);
      var annSvc = new AnnotationService(annDbConn);

      var feedManager = new FeedManager(annSvc);
      var msgService = new CompositeMessageService();

      msgService.add(new AlertMessageService());
      msgService.add(new ErrorConsoleMessageService());

      var disabledStorage = new DisabledCmdStorage(
        'extensions.ubiquity.disabledCommands'
      );

      var importedScripts = {};
      gIframe.contentWindow.importScripts = function importScripts(urls) {
        var wind = this;
        urls.forEach(
          function(url) {
            if (!(url in importedScripts)) {
              wind.Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                  .getService(Components.interfaces.mozIJSSubScriptLoader)
                  .loadSubScript(url);
              importedScripts[url] = true;
            }
          });
      };

      var defaultFeedPlugin = new DefaultFeedPlugin(feedManager,
                                                    msgService,
                                                    gIframe.contentWindow,
                                                    this.languageCode,
                                                    this.getBaseUri());

      var ldfPlugin = new LockedDownFeedPlugin(feedManager,
                                               msgService,
                                               gIframe.contentWindow);

      var cmdSource = new FeedAggregator(
        feedManager,
        msgService,
        disabledStorage.getDisabledCommands()
      );
      disabledStorage.attach(cmdSource);

      gServices = {commandSource: cmdSource,
                   feedManager: feedManager,
                   messageService: msgService};

      if (this.isNewlyInstalledOrUpgraded)
        // For some reason, the following function isn't executed
        // atomically by Javascript; perhaps something being called is
        // getting the '@mozilla.org/thread-manager;1' service and
        // spinning via a call to processNextEvent() until some kind of
        // I/O is finished?
        defaultFeedPlugin.installDefaults(
          this.standardFeedsUri,
          this.getBaseUri() + "standard-feeds/",
          this.STANDARD_FEEDS
        );

      cmdSource.refresh();
    }

    return gServices;
  },

  setupWindow: function setupWindow(window) {
    gServices.feedManager.installToWindow(window);

    var PAGE_LOAD_PREF = "extensions.ubiquity.enablePageLoadHandlers";

    function onPageLoad(aEvent) {
      var isEnabled = Application.prefs.getValue(PAGE_LOAD_PREF, true);
      if (!isEnabled)
        return;

      if (aEvent.originalTarget.location)
        gServices.commandSource.onPageLoad(aEvent.originalTarget);
    }

    var appcontent = window.document.getElementById("appcontent");
    appcontent.addEventListener("DOMContentLoaded", onPageLoad, true);
  },

  get languageCode() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
    var lang = prefs.getCharPref("extensions.ubiquity.language");
    return lang;
  },

  get version() {
    return Application.extensions.get("ubiquity@labs.mozilla.com").version;
  },

  get standardFeedsUri() {
    if (this.isInstalledAsXpi()) {
      var STANDARD_FEEDS_PREF = "extensions.ubiquity.standardFeedsUri";
      return Application.prefs.getValue(STANDARD_FEEDS_PREF, "");
    } else
      return this.getBaseUri() + "standard-feeds/";
  }
};

function DisabledCmdStorage(prefName) {
  let str = Application.prefs.getValue(prefName, '{}');
  let disabledCommands = Utils.decodeJson(str);

  this.getDisabledCommands = function getDisabledCommands() {
    return disabledCommands;
  };

  function onDisableChange(eventName, value) {
    disabledCommands[value.name] = value.value;
    Application.prefs.setValue(prefName,
                               Utils.encodeJson(disabledCommands));
  };

  this.attach = function attach(cmdSource) {
    cmdSource.addListener('disabled-command-change', onDisableChange);
  };
}
