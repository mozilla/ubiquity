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

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/sandboxfactory.js");
Components.utils.import("resource://ubiquity-modules/msgservice.js");
Components.utils.import("resource://ubiquity-modules/linkrel_codesvc.js");
Components.utils.import("resource://ubiquity-modules/codesource.js");
Components.utils.import("resource://ubiquity-modules/prefcommands.js");
Components.utils.import("resource://ubiquity-modules/collection.js");
Components.utils.import("resource://ubiquity-modules/cmdsource.js");
Components.utils.import("resource://ubiquity-modules/annotation_memory.js");
Components.utils.import("resource://ubiquity-modules/parser/parser.js");
Components.utils.import("resource://ubiquity-modules/parser/locale_en.js");
Components.utils.import("resource://ubiquity-modules/parser/locale_jp.js");
Components.utils.import("resource://ubiquity-modules/cmdmanager.js");

let Application = Components.classes["@mozilla.org/fuel/application;1"]
                  .getService(Components.interfaces.fuelIApplication);

let gServices;

let gIframeWrapper;
let gIframe;

let UbiquitySetup = {
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

    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var hiddenWindow = Cc["@mozilla.org/appshell/appShellService;1"]
                       .getService(Ci.nsIAppShellService)
                       .hiddenDOMWindow;

    gIframeWrapper = hiddenWindow.document.createElement("iframe");
    gIframeWrapper.setAttribute("id", "ubiquityFrameWrapper");
    gIframeWrapper.setAttribute("src",
                                "chrome://ubiquity/content/hiddenframe.xul");
    function onWrapperPageShow() {
      gIframeWrapper.removeEventListener("pageshow", onWrapperPageShow,
                                         false);
      let innerHiddenWindow = gIframeWrapper.contentWindow;
      gIframe = innerHiddenWindow.document.createElement("iframe");
      gIframe.setAttribute("id", "ubiquityFrame");
      gIframe.setAttribute("src",
                           "chrome://ubiquity/content/hiddenframe.html");
      gIframe.addEventListener(
        "pageshow",
        function onPageShow() {
          gIframe.removeEventListener("pageshow", onPageShow, false);
          callback();
        },
        false
      );
      innerHiddenWindow.document.documentElement.appendChild(gIframe);
    }

    gIframeWrapper.addEventListener("pageshow", onWrapperPageShow, false);
    hiddenWindow.document.documentElement.appendChild(gIframeWrapper);
  },

  createServices: function createServices() {
    if (!gServices) {
      var Cc = Components.classes;

      var annDbFile = AnnotationService.getProfileFile("ubiquity_ann.sqlite");
      var annDbConn = AnnotationService.openDatabase(annDbFile);
      var annSvc = new AnnotationService(annDbConn);

      var linkRelCodeService = new LinkRelCodeService(annSvc);
      var msgService = new CompositeMessageService();

      msgService.add(new AlertMessageService());
      msgService.add(new ErrorConsoleMessageService());

      var makeGlobals = makeBuiltinGlobalsMaker(msgService);
      var sandboxFactory = new SandboxFactory(makeGlobals);
      var codeSources = makeBuiltinCodeSources(this.languageCode,
                                               linkRelCodeService);

      var disabledStorage = new DisabledCmdStorage(
        'extensions.ubiquity.disabledCommands'
      );

      var cmdSource = new CommandSource(
        codeSources,
        msgService,
        sandboxFactory,
        disabledStorage.getDisabledCommands()
      );

      disabledStorage.attach(cmdSource);

      var parser = NLParser.makeParserForLanguage(
        this.languageCode,
        [],
        []
      );

      var cmdMan = new CommandManager(cmdSource,
                                      msgService,
                                      parser);

      gServices = {commandManager: cmdMan,
                   commandSource: cmdSource,
                   linkRelCodeService: linkRelCodeService,
                   messageService: msgService};

      // For some reason, the following function isn't executed
      // atomically by Javascript; perhaps something being called is
      // getting the '@mozilla.org/thread-manager;1' service and
      // spinning via a call to processNextEvent() until some kind of
      // I/O is finished?
      this.__installDefaults(linkRelCodeService);
      cmdSource.refresh();
    }

    return gServices;
  },

  setupWindow: function setupWindow(window) {
    gServices.linkRelCodeService.installToWindow(window);

    var PAGE_LOAD_PREF = "extensions.ubiquity.enablePageLoadHandlers";

    function onPageLoad(aEvent) {
      var isEnabled = Application.prefs.getValue(PAGE_LOAD_PREF, true);
      if (!isEnabled)
        return;

      var isValidPage = false;
      try {
        // See if we can get the current document;
        // if we get an exception, then the page that's
        // been loaded is probably XUL or something,
        // and we won't want to deal with it.

        // TODO: This probably won't be accurate if it's the case that
        // the user has navigated to a different tab by the time the
        // load event occurs.
        var doc = Application.activeWindow
                             .activeTab
                             .document;
        isValidPage = true;
      } catch (e) {}
      if (isValidPage)
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

  __installDefaults: function installDefaults(linkRelCodeService) {
    let baseLocalUri = this.getBaseUri() + "standard-feeds/";
    let baseUri;

    if (this.isInstalledAsXpi()) {
      var STANDARD_FEEDS_PREF = "extensions.ubiquity.standardFeedsUri";
      baseUri = Application.prefs.getValue(STANDARD_FEEDS_PREF, "");
    } else
      baseUri = baseLocalUri;

    linkRelCodeService.installDefaults(baseUri,
                                       baseLocalUri,
                                       this.STANDARD_FEEDS);
  }
};

function makeBuiltinGlobalsMaker(msgService) {
  var Cc = Components.classes;
  var Ci = Components.interfaces;
  var hiddenWindow = gIframe.contentWindow;

  var uris = ["resource://ubiquity-scripts/jquery.js",
              "resource://ubiquity-scripts/template.js"];

  for (var i = 0; i < uris.length; i++) {
    hiddenWindow.Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                .getService(Components.interfaces.mozIJSSubScriptLoader)
                .loadSubScript(uris[i]);
  }

  var globalObjects = {};

  function makeGlobals(codeSource) {
    var id = codeSource.id;

    if (!(id in globalObjects))
      globalObjects[id] = {};

    return {
      XPathResult: hiddenWindow.XPathResult,
      XMLHttpRequest: hiddenWindow.XMLHttpRequest,
      jQuery: hiddenWindow.jQuery,
      Template: hiddenWindow.TrimPath,
      Application: Application,
      Components: Components,
      feed: {id: codeSource.id,
             dom: codeSource.dom},
      pageLoadFuncs: [],
      globals: globalObjects[id],
      displayMessage: function() {
        msgService.displayMessage.apply(msgService, arguments);
      }
    };
  }

  return makeGlobals;
}

function makeBuiltinCodeSources(languageCode, linkRelCodeService) {
  var baseUri = UbiquitySetup.getBaseUri();
  var basePartsUri = baseUri + "feed-parts/";
  var baseScriptsUri = baseUri + "scripts/";

  var headerCodeSources = [
    new LocalUriCodeSource(basePartsUri + "header/utils.js"),
    new LocalUriCodeSource(basePartsUri + "header/cmdutils.js"),
    new LocalUriCodeSource(basePartsUri + "header/deprecated.js")
  ];
  var bodyCodeSources = [
    new LocalUriCodeSource(basePartsUri + "body/onstartup.js"),
    new XhtmlCodeSource(PrefCommands)
  ];
  var footerCodeSources = [
    new LocalUriCodeSource(basePartsUri + "footer/final.js")
  ];

  if (languageCode == "jp") {
    headerCodeSources = headerCodeSources.concat([
      new LocalUriCodeSource(basePartsUri + "header/jp/nountypes.js")
    ]);
    bodyCodeSources = bodyCodeSources.concat([
      new LocalUriCodeSource(basePartsUri + "body/jp/builtincmds.js")
    ]);
  } else if (languageCode == "en") {
    headerCodeSources = headerCodeSources.concat([
      new LocalUriCodeSource(baseScriptsUri + "date.js"),
      new LocalUriCodeSource(basePartsUri + "header/en/nountypes.js")
    ]);
    bodyCodeSources = bodyCodeSources.concat([
      new LocalUriCodeSource(basePartsUri + "body/en/builtincmds.js")
    ]);
  }

  bodyCodeSources = new CompositeCollection([
    new IterableCollection(bodyCodeSources),
    linkRelCodeService
  ]);

  return new MixedCodeSourceCollection(
    new IterableCollection(headerCodeSources),
    bodyCodeSources,
    new IterableCollection(footerCodeSources)
  );
}

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
