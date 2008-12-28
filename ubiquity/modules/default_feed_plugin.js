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

let EXPORTED_SYMBOLS = ["DefaultFeedPlugin"];

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/codesource.js");

const CONFIRM_URL = "chrome://ubiquity/content/confirm-add-command.html";
const DEFAULT_FEED_TYPE = "commands";

function DefaultFeedPlugin(feedManager) {
  this.type = DEFAULT_FEED_TYPE;

  this.installDefaults = function DFP_installDefaults(baseUri,
                                                      baseLocalUri,
                                                      infos) {
    for (let i = 0; i < infos.length; i++) {
      let info = infos[i];
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

  this.onSubscribeClick = function DFP_onSubscribeClick(window,
                                                        targetDoc,
                                                        commandsUrl,
                                                        mimetype) {
    // Clicking on "subscribe" takes them to the warning page:
    var confirmUrl = (CONFIRM_URL + "?url=" +
                      encodeURIComponent(targetDoc.location.href) +
                      "&sourceUrl=" + encodeURIComponent(commandsUrl));

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

      TRUSTED_DOMAINS_PREF = "extensions.ubiquity.trustedDomains";
      let Application = Components.classes["@mozilla.org/fuel/application;1"]
                        .getService(Components.interfaces.fuelIApplication);
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
                                       sourceCode: data});
        Utils.openUrlInBrowser(confirmUrl);
      }

      if (RemoteUriCodeSource.isValidUri(commandsUrl)) {
        // TODO: Use a standard XHR instead of JQuery and we can decouple
        // this function from the window object.
        window.jQuery.ajax({url: commandsUrl,
                            dataType: "text",
                            success: onSuccess});
      } else
        onSuccess("");
    } else
      Utils.openUrlInBrowser(confirmUrl);
  };

  this.makeFeed = function DFP_makeFeed(baseFeedInfo) {
    let feedInfo = {};

    if (LocalUriCodeSource.isValidUri(baseFeedInfo.srcUri))
      feedInfo.canAutoUpdate = true;

    feedInfo.refresh = function refresh() {
      // TODO: Implement this.
      this.commandNames = [];
      this.nounTypes = [];
      this.commands = [];
      this.pageLoadFuncs = [];
    };

    feedInfo.__proto__ = baseFeedInfo;

    return feedInfo;
  };

  this.codeCollection = new DFPSubscribedCodeCollection(feedManager);

  feedManager.registerPlugin(this);
}

// This class is a collection that yields a code source for every
// currently-subscribed feed that uses the DFP.
function DFPSubscribedCodeCollection(fMgr) {
  this._sources = {};

  this._updateSourceList = function LRCC_updateSourceList() {
    let subscribedFeeds = fMgr.getSubscribedFeeds();
    let newSources = {};
    for (let i = 0; i < subscribedFeeds.length; i++) {
      let feedInfo = subscribedFeeds[i];
      if (feedInfo.type != DEFAULT_FEED_TYPE)
        continue;
      let href = feedInfo.srcUri.spec;
      let source;
      if (RemoteUriCodeSource.isValidUri(feedInfo.srcUri)) {
        if (feedInfo.canAutoUpdate) {
          source = new RemoteUriCodeSource(feedInfo);
        } else
          source = new StringCodeSource(feedInfo.getCode(),
                                        feedInfo.srcUri.spec);
      } else if (LocalUriCodeSource.isValidUri(feedInfo.srcUri)) {
        source = new LocalUriCodeSource(href);
      } else {
        throw new Error("Don't know how to make code source for " + href);
      }

      newSources[href] = new XhtmlCodeSource(source);
    }
    this._sources = newSources;
  };

  var subscriptionsChanged = true;

  function listener(eventName, data) {
    subscriptionsChanged = true;
  }

  fMgr.addListener("change", listener);

  // TODO: When to remove listener?

  this.__iterator__ = function LRCC_iterator() {
    if (subscriptionsChanged) {
      this._updateSourceList();
      subscriptionsChanged = false;
    }

    for each (source in this._sources) {
      yield source;
    }
  };
}
