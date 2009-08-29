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
 *   Blair McBride <unfocused@gmail.com>
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

var EXPORTED_SYMBOLS = ["DefaultFeedPlugin"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/codesource.js");
Cu.import("resource://ubiquity/modules/sandboxfactory.js");
Cu.import("resource://ubiquity/modules/collection.js");
Cu.import("resource://ubiquity/modules/feed_plugin_utils.js");

const CONFIRM_URL = "chrome://ubiquity/content/confirm-add-command.xhtml";
const DEFAULT_FEED_TYPE = "commands";
const TRUSTED_DOMAINS_PREF = "extensions.ubiquity.trustedDomains";
const REMOTE_URI_TIMEOUT_PREF = "extensions.ubiquity.remoteUriTimeout";

function DefaultFeedPlugin(feedManager, messageService, webJsm,
                           languageCode, baseUri, parserVersion) {
  this.type = DEFAULT_FEED_TYPE;

  let {prefs} = Utils.Application;

  let builtins = makeBuiltins(languageCode, baseUri, parserVersion);
  let builtinGlobalsMaker = makeBuiltinGlobalsMaker(messageService,
                                                    webJsm);
  let sandboxFactory = new SandboxFactory(builtinGlobalsMaker);

  for (let [title, url] in Iterator(builtins.feeds))
    feedManager.addSubscribedFeed({
      url: url,
      sourceUrl: url,
      canAutoUpdate: true,
      isBuiltIn: true,
      title: title,
    });

  this.installDefaults = function DFP_installDefaults(baseUri,
                                                      baseLocalUri,
                                                      infos) {
    for each (let info in infos) {
      let uri = Utils.url(baseUri + info.page);

      if (!feedManager.isUnsubscribedFeed(uri)) {
        let lcs = new LocalUriCodeSource(baseLocalUri + info.source);
        feedManager.addSubscribedFeed({url: uri,
                                       sourceUrl: baseUri + info.source,
                                       sourceCode: lcs.getCode(),
                                       canAutoUpdate: true,
                                       title: info.title});
      }
    }
  };

  this.onSubscribeClick = function DFP_onSubscribeClick(targetDoc,
                                                        commandsUrl,
                                                        mimetype) {
    // Clicking on "subscribe" takes them to the warning page:
    var confirmUrl = (CONFIRM_URL + "?url=" +
                      encodeURIComponent(targetDoc.location.href) +
                      "&sourceUrl=" + encodeURIComponent(commandsUrl) +
                      "&title=" + encodeURIComponent(targetDoc.title));

    function isTrustedUrl(commandsUrl, mimetype) {
      // Even if the command feed resides on a trusted host, if the
      // mime-type is application/x-javascript-untrusted or
      // application/xhtml+xml-untrusted, the host itself doesn't
      // trust it (perhaps because it's mirroring code from
      // somewhere else).
      if (mimetype == "application/x-javascript-untrusted" ||
          mimetype == "application/xhtml+xml-untrusted")
        return false;

      var url = Utils.url(commandsUrl);

      if (url.scheme != "https")
        return false;

      var domains = prefs.getValue(TRUSTED_DOMAINS_PREF, "");
      domains = domains.split(",");

      for (var i = 0; i < domains.length; i++) {
        if (domains[i] == url.host)
          return true;
      }

      return false;
    }

    if (isTrustedUrl(commandsUrl, mimetype)) {
      function onSuccess(data) {
        feedManager.addSubscribedFeed({url: targetDoc.location.href,
                                       sourceUrl: commandsUrl,
                                       canAutoUpdate: true,
                                       sourceCode: data});
        Utils.openUrlInBrowser(confirmUrl);
      }

      if (RemoteUriCodeSource.isValidUri(commandsUrl)) {
        webJsm.jQuery.ajax({url: commandsUrl,
                            dataType: "text",
                            success: onSuccess});
      } else
        onSuccess("");
    } else
      Utils.openUrlInBrowser(confirmUrl);
  };

  this.makeFeed = function DFP_makeFeed(baseFeedInfo, hub) {
    var timeout = prefs.getValue(REMOTE_URI_TIMEOUT_PREF, 10);
    return new DFPFeed(baseFeedInfo, hub, messageService, sandboxFactory,
                       builtins.headers, builtins.footers,
                       webJsm.jQuery, timeout);
  };

  feedManager.registerPlugin(this);
}

DefaultFeedPlugin.makeCmdForObj = makeCmdForObj;

function makeCmdForObj(sandbox, commandObject, feedUri) {
  // referenceName is set by CreateCommand, so this command must have
  // bypassed CreateCommand. Let's set the referenceName here.
  if (!("referenceName" in commandObject))
    commandObject.referenceName = commandObject.name;

  var cmd = {
    __proto__: commandObject,
    id: feedUri.spec + "#" + commandObject.referenceName,
    feedUri: feedUri,
    toString: function CS_toString() {
      return "[object UbiquityCommand " + this.name + "]";
    },
    execute: function CS_execute(context) {
      if (context) {
        context.l10n = commandObject.referenceName + ".execute";
        sandbox.context = context;
      }
      return commandObject.execute.apply(cmd, Array.slice(arguments, 1));
    },
    preview: function CS_preview(context) {
      if (context) {
        context.l10n = commandObject.referenceName + ".preview";
        sandbox.context = context;
      }
      return commandObject.preview.apply(cmd, Array.slice(arguments, 1));
    },
  };

  if (!("serviceDomain" in commandObject)) {
    let domainRE = /\bhttps?:\/\/([\w.-]+)/;
    cmd.serviceDomain = ((domainRE.test(commandObject.url) ||
                          domainRE.test(commandObject.execute) ||
                          domainRE.test(commandObject.preview))
                         ? RegExp.$1
                         : null);
    // TODO: also check for serviceDomain in Utils.getCookie type code
  }

  return finishCommand(cmd);
}

function makeCodeSource(feedInfo, headerSources, footerSources,
                        timeoutInterval) {
  var codeSource;

  if (RemoteUriCodeSource.isValidUri(feedInfo.srcUri)) {
    if (feedInfo.canAutoUpdate)
      codeSource = new RemoteUriCodeSource(feedInfo, timeoutInterval);
    else
      codeSource = new StringCodeSource(feedInfo.getCode(),
                                        feedInfo.srcUri.spec);
  }
  else if (LocalUriCodeSource.isValidUri(feedInfo.srcUri)) {
    codeSource = new LocalUriCodeSource(feedInfo.srcUri.spec);
  }
  else {
    //errorToLocalize
    throw new Error("Don't know how to make code source for " +
                    feedInfo.srcUri.spec);
  }

  codeSource = new XhtmlCodeSource(codeSource);

  codeSource = new MixedCodeSource(codeSource,
                                   headerSources,
                                   footerSources);

  return codeSource;
}

function DFPFeed(feedInfo, hub, messageService, sandboxFactory,
                 headerSources, footerSources, jQuery, timeoutInterval) {
  if (LocalUriCodeSource.isValidUri(feedInfo.srcUri))
    this.canAutoUpdate = true;

  var codeSource = makeCodeSource(feedInfo, headerSources, footerSources,
                                  timeoutInterval);
  var bin = feedInfo.makeBin();
  var codeCache = null;
  var sandbox = null;
  var self = this;

  function reset() {
    self.commands = {};
    self.pageLoadFuncs = [];
    self.ubiquityLoadFuncs = [];
  }

  reset();

  this.refresh = function refresh() {
    var code = codeSource.getCode();
    if (code !== codeCache) {
      reset();
      codeCache = code;
      sandbox = sandboxFactory.makeSandbox(codeSource);
      sandbox.Bin = bin;
      try {
        sandboxFactory.evalInSandbox(code,
                                     sandbox,
                                     codeSource.codeSections);
      } catch (e) {
        //errorToLocalize
        messageService.displayMessage(
          {text:  "An exception occurred while loading code.",
           exception: e}
        );
      }

      for each (let cmd in sandbox.commands) {
        let newCmd = makeCmdForObj(sandbox, cmd, feedInfo.uri);
        this.commands[newCmd.id] = newCmd;
      }

      for each (let p in ["pageLoadFuncs", "ubiquityLoadFuncs"])
        this[p] = sandbox[p];

      hub.notifyListeners("feed-change", feedInfo.uri);
    }
  };

  this.checkForManualUpdate = function checkForManualUpdate(cb) {
    if (LocalUriCodeSource.isValidUri(this.srcUri))
      cb(false);
    else {
      function onSuccess(data) {
        if (data !== self.getCode()) {
          var confirmUrl = (CONFIRM_URL +
                            "?url=" +
                            encodeURIComponent(self.uri.spec) +
                            "&sourceUrl=" +
                            encodeURIComponent(self.srcUri.spec) +
                            "&updateCode=" +
                            encodeURIComponent(data));
          cb(true, confirmUrl);
        }
        else
          cb(false);
      };
      jQuery.ajax({
        url: this.srcUri.spec,
        dataType: "text",
        success: onSuccess,
        error: function onError() { cb(false) },
      });
    }
  };

  this.finalize = function finalize() {
    // Not sure exactly why, but we get memory leaks if we don't
    // manually remove these.
    jQuery = null;
    sandbox.jQuery = null;
  };

  this.__proto__ = feedInfo;
}

function makeBuiltinGlobalsMaker(msgService, webJsm) {
  webJsm.importScript("resource://ubiquity/scripts/jquery.js");
  webJsm.importScript("resource://ubiquity/scripts/jquery_setup.js");
  webJsm.importScript("resource://ubiquity/scripts/template.js");
  webJsm.importScript("resource://ubiquity/scripts/date.js");

  var globalObjects = {};

  return function makeGlobals(codeSource) {
    var id = codeSource.id;

    if (!(id in globalObjects))
      globalObjects[id] = {};

    return {
      XPathResult: webJsm.XPathResult,
      XMLHttpRequest: webJsm.XMLHttpRequest,
      jQuery: webJsm.jQuery,
      $: webJsm.jQuery,
      Template: webJsm.TrimPath,
      Application: webJsm.Application,
      Date: webJsm.Date,
      Components: Components,
      feed: {id: codeSource.id,
             dom: codeSource.dom},
      context: {},
      commands: [],
      pageLoadFuncs: [],
      ubiquityLoadFuncs: [],
      globals: globalObjects[id],
      displayMessage: function displayMessage(msg, cmd) {
        if (cmd) {
          if (typeof msg === "string") msg = {text: msg};
          msg.icon  = cmd.icon;
          msg.title = cmd.name;
        }
        msgService.displayMessage(msg);
      }
    };
  }
}

function makeBuiltins(languageCode, baseUri, parserVersion) {
  var basePartsUri = baseUri + "feed-parts/";
  var baseFeedsUri = baseUri + "builtin-feeds/";
  var baseScriptsUri = baseUri + "scripts/";

  var feeds = {
    "Builtin Commands": baseFeedsUri + "builtincmds.js",
  };
  var headerCodeSources = [
    new LocalUriCodeSource(basePartsUri + "header/initial.js"),
  ];
  var footerCodeSources = [
    new LocalUriCodeSource(basePartsUri + "footer/final.js"),
  ];

  return {
    feeds: feeds,
    headers: new IterableCollection(headerCodeSources),
    footers: new IterableCollection(footerCodeSources)
  };
}
