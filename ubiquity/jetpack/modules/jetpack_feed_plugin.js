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

let EXPORTED_SYMBOLS = ["JetpackFeedPlugin", "JetpackFeeds",
                        "JetpackFeedManager"];

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/codesource.js");
Components.utils.import("resource://ubiquity/modules/collection.js");

const CONFIRM_URL = "chrome://jetpack/content/confirm-add-jetpack.html";
const TYPE = "jetpack";
const TRUSTED_DOMAINS_PREF = "extensions.ubiquity.trustedDomains";
const REMOTE_URI_TIMEOUT_PREF = "extensions.ubiquity.remoteUriTimeout";

var JetpackFeeds = {};

var JetpackFeedManager = null;

function JetpackFeedPlugin(feedManager, messageService) {
  if (!JetpackFeedManager)
    JetpackFeedManager = feedManager;
  else
    Components.utils.reportError("JetpackFeedManager already defined.");

  this.type = TYPE;

  let Application = Components.classes["@mozilla.org/fuel/application;1"]
                    .getService(Components.interfaces.fuelIApplication);

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
      // mime-type is application/x-javascript-untrusted, the host
      // itself doesn't trust it (perhaps because it's mirroring code
      // from somewhere else).

      if (mimetype == "application/x-javascript-untrusted")
        return false;

      var url = Utils.url(commandsUrl);

      if (url.scheme != "https")
        return false;

      var domains = Application.prefs.getValue(TRUSTED_DOMAINS_PREF, "");
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
                                       sourceCode: data,
                                       type: TYPE});
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
    var timeout = Application.prefs.getValue(REMOTE_URI_TIMEOUT_PREF, 10);
    return new JetpackFeed(baseFeedInfo, hub, messageService, timeout);
  };

  feedManager.registerPlugin(this);
}

function makeCodeSource(feedInfo, timeoutInterval) {
  var codeSource;

  if (RemoteUriCodeSource.isValidUri(feedInfo.srcUri)) {
    if (feedInfo.canAutoUpdate) {
      codeSource = new RemoteUriCodeSource(feedInfo, timeoutInterval);
    } else
      codeSource = new StringCodeSource(feedInfo.getCode(),
                                        feedInfo.srcUri.spec);
  } else if (LocalUriCodeSource.isValidUri(feedInfo.srcUri)) {
    codeSource = new LocalUriCodeSource(feedInfo.srcUri.spec);
  } else {
    throw new Error("Don't know how to make code source for " +
                    feedInfo.srcUri.spec);
  }

  return codeSource;
}

function JetpackFeed(feedInfo, hub, messageService, timeoutInterval) {
  JetpackFeeds[feedInfo.uri.spec] = this;

  if (LocalUriCodeSource.isValidUri(feedInfo.srcUri))
    this.canAutoUpdate = true;

  let codeSource = makeCodeSource(feedInfo, timeoutInterval);

  var codeCache = null;

  let self = this;

  self.nounTypes = [];
  self.commands = [];
  self.pageLoadFuncs = [];

  this.getCodeSource = function getCodeSource() {
    return codeSource;
  };

  this.refresh = function refresh() {
    let code = codeSource.getCode();
    if (code != codeCache) {
      codeCache = code;
      hub.notifyListeners("feed-change", feedInfo.uri);
    }
  };

  this.checkForManualUpdate = function checkForManualUpdate(cb) {
    if (LocalUriCodeSource.isValidUri(this.srcUri))
      cb(false);
    else {
      function onSuccess(data) {
        if (data != self.getCode()) {
          var confirmUrl = (CONFIRM_URL +
                            "?url=" +
                            encodeURIComponent(self.uri.spec) +
                            "&sourceUrl=" +
                            encodeURIComponent(self.srcUri.spec) +
                            "&updateCode=" +
                            encodeURIComponent(data));
          cb(true, confirmUrl);
        } else
          cb(false);
      };
      // TODO: We should call the callback w/ a false value or some kind
      // of error value if the Ajax request fails.
      jQuery.ajax({url: this.srcUri.spec,
                   dataType: "text",
                   success: onSuccess});
    }
  };

  this.finalize = function finalize() {
    var url = feedInfo.uri.spec;
    if (url in JetpackFeeds)
      delete JetpackFeeds[url];
  };

  this.__proto__ = feedInfo;
}
