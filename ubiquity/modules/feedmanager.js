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

EXPORTED_SYMBOLS = ["FeedManager",
                    "LinkRelCodeCollection"];

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/codesource.js");
Components.utils.import("resource://ubiquity-modules/eventhub.js");

const FEED_SRC_ANNO = "ubiquity/source";
const FEED_AUTOUPDATE_ANNO = "ubiquity/autoupdate";
const FEED_SUBSCRIBED_ANNO = "ubiquity/confirmed";
const FEED_UNSUBSCRIBED_ANNO = "ubiquity/removed";
const FEED_SRC_URL_ANNO = "ubiquity/commands";
const FEED_TITLE_ANNO = "ubiquity/title";

const CONFIRM_URL = "chrome://ubiquity/content/confirm-add-command.html";

function FeedManager(annSvc) {
  this._annSvc = annSvc;

  let hub = new EventHub();
  hub.attachMethods(this);

  function onAnnChanged(aURI, aName) {
    if (aName == FEED_AUTOUPDATE_ANNO ||
        aName == FEED_SUBSCRIBED_ANNO ||
        aName == FEED_UNSUBSCRIBED_ANNO ||
        aName == FEED_SRC_ANNO)
      hub.notifyListeners("change", null);
  }

  var annObserver = {
    onPageAnnotationSet : onAnnChanged,
    onItemAnnotationSet : function(aItemId, aName) { },
    onPageAnnotationRemoved : onAnnChanged,
    onItemAnnotationRemoved: function(aItemId, aName) { }
  };

  annSvc.addObserver(annObserver);
}

FeedManager.prototype = FMgrProto = {};

FMgrProto.__makeFeed = function FMgr___makeFeed(uri) {
  let annSvc = this._annSvc;

  let title = uri.spec;
  if (annSvc.pageHasAnnotation(uri, FEED_TITLE_ANNO))
    title = annSvc.getPageAnnotation(uri, FEED_TITLE_ANNO);

  let feedInfo = {title: title,
                  uri: uri};

  feedInfo.remove = function feedInfo_remove() {
    if (annSvc.pageHasAnnotation(uri, FEED_SUBSCRIBED_ANNO)) {
      annSvc.removePageAnnotation(uri, FEED_SUBSCRIBED_ANNO);
      annSvc.setPageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO, "true", 0,
                               annSvc.EXPIRE_NEVER);
    }
  };

  feedInfo.unremove = function feedInfo_undelete() {
    if (annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO)) {
      annSvc.removePageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);
      annSvc.setPageAnnotation(uri, FEED_SUBSCRIBED_ANNO, "true", 0,
                               annSvc.EXPIRE_NEVER);
    }
  };

  var val = annSvc.getPageAnnotation(uri, FEED_SRC_URL_ANNO);
  feedInfo.srcUri = Utils.url(val);

  if (LocalUriCodeSource.isValidUri(feedInfo.srcUri)) {
    feedInfo.canAutoUpdate = true;
  } else if (annSvc.pageHasAnnotation(uri, FEED_AUTOUPDATE_ANNO)) {
    // fern: there's no not-hackish way of parsing a string to a boolean.
    feedInfo.canAutoUpdate = (/^true$/i).test(
      annSvc.getPageAnnotation(uri, FEED_AUTOUPDATE_ANNO)
    );
  } else
    feedInfo.canAutoUpdate = false;

  feedInfo.getCode = function feedInfo_getCode() {
    if (annSvc.pageHasAnnotation(uri, FEED_SRC_ANNO))
      return annSvc.getPageAnnotation(uri, FEED_SRC_ANNO);
    else
      return "";
  };

  feedInfo.setCode = function feedInfo_setCode(code) {
    annSvc.setPageAnnotation(uri, FEED_SRC_ANNO, code, 0,
                             annSvc.EXPIRE_NEVER);
  };

  feedInfo.__defineGetter__(
    "viewSourceUri",
    function feedInfo_viewSource() {
      if (feedInfo.canAutoUpdate)
        return feedInfo.srcUri;
      else {
        let uri = ("data:application/x-javascript," +
                   escape(feedInfo.getCode()));
        return Utils.url(uri);
      }
    }
  );

  return feedInfo;
};

FMgrProto.getUnsubscribedFeeds = function FMgr_getUnsubscribedFeeds() {
  let annSvc = this._annSvc;
  let removedUris = annSvc.getPagesWithAnnotation(FEED_UNSUBSCRIBED_ANNO, {});
  let unsubscribedFeeds = [];

  for (let i = 0; i < removedUris.length; i++)
    unsubscribedFeeds.push(this.__makeFeed(removedUris[i]));

  return unsubscribedFeeds;
};

FMgrProto.getSubscribedFeeds = function FMgr_getSubscribedFeeds() {
  let annSvc = this._annSvc;
  let confirmedPages = annSvc.getPagesWithAnnotation(FEED_SUBSCRIBED_ANNO, {});
  let subscribedFeeds = [];

  for (let i = 0; i < confirmedPages.length; i++)
    subscribedFeeds.push(this.__makeFeed(confirmedPages[i]));

  return subscribedFeeds;
};

FMgrProto.addSubscribedFeed = function FMgr_addSubscribedFeed(info) {
  let annSvc = this._annSvc;
  let uri = Utils.url(info.url);

  if (annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO))
    annSvc.removePageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);
  annSvc.setPageAnnotation(uri, FEED_SRC_URL_ANNO, info.sourceUrl, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, FEED_SRC_ANNO, info.sourceCode, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, FEED_AUTOUPDATE_ANNO, info.canAutoUpdate, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, FEED_SUBSCRIBED_ANNO, "true", 0,
                           annSvc.EXPIRE_NEVER);
  if (info.title)
    annSvc.setPageAnnotation(uri, FEED_TITLE_ANNO, info.title, 0,
                             annSvc.EXPIRE_NEVER);
};

FMgrProto.isSubscribedFeed = function FMgr_isSubscribedFeed(uri) {
  let annSvc = this._annSvc;
  uri = Utils.url(uri);
  return annSvc.pageHasAnnotation(uri, FEED_SUBSCRIBED_ANNO);
};

FMgrProto.isUnsubscribedFeed = function FMgr_isSubscribedFeed(uri) {
  let annSvc = this._annSvc;
  uri = Utils.url(uri);
  return annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);
};

FMgrProto.installDefaults = function FMgr_installDefaults(baseUri,
                                                          baseLocalUri,
                                                          infos) {
  for (let i = 0; i < infos.length; i++) {
    let info = infos[i];
    let uri = Utils.url(baseUri + info.page);

    if (!this.isUnsubscribedFeed(uri)) {
      let lcs = new LocalUriCodeSource(baseLocalUri + info.source);
      this.addSubscribedFeed({url: uri,
                              sourceUrl: baseUri + info.source,
                              sourceCode: lcs.getCode(),
                              canAutoUpdate: true,
                              title: info.title});
    }
  }
};

function subscribeResponder(window, fMgr, targetDoc,
                            commandsUrl, mimetype) {
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
      fMgr.addSubscribedFeed({url: targetDoc.location.href,
                              sourceUrl: commandsUrl,
                              canAutoUpdate: true,
                              sourceCode: data});
      Utils.openUrlInBrowser(confirmUrl);
    }

    if (RemoteUriCodeSource.isValidUri(commandsUrl)) {
      window.jQuery.ajax({url: commandsUrl,
                          dataType: "text",
                          success: onSuccess});
    } else
      onSuccess("");
  } else
    Utils.openUrlInBrowser(confirmUrl);
}

FMgrProto.installToWindow = function FMgr_installToWindow(window) {
  var self = this;

  function showNotification(targetDoc, commandsUrl, mimetype) {
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    // Find the <browser> which contains notifyWindow, by looking
    // through all the open windows and all the <browsers> in each.
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    var tabbrowser = null;
    var foundBrowser = null;

    while (!foundBrowser && enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      tabbrowser = win.getBrowser();
      foundBrowser = tabbrowser.getBrowserForDocument(targetDoc);
    }

    // Return the notificationBox associated with the browser.
    if (foundBrowser) {
      var box = tabbrowser.getNotificationBox(foundBrowser);
      var BOX_NAME = "ubiquity_notify_commands_available";
      var oldNotification = box.getNotificationWithValue(BOX_NAME);
      if (oldNotification)
        box.removeNotification(oldNotification);

      function onSubscribeClick(notification, button) {
        subscribeResponder(window, self, targetDoc, commandsUrl, mimetype);
      }

      var buttons = [
        {accessKey: null,
         callback: onSubscribeClick,
         label: "Subscribe...",
         popup: null}
      ];
      box.appendNotification(
        ("This page contains Ubiquity commands.  " +
         "If you'd like to subscribe to them, please " +
         "click the button to the right."),
        BOX_NAME,
        "http://www.mozilla.com/favicon.ico",
        box.PRIORITY_INFO_MEDIUM,
        buttons
      );
    } else {
      Components.utils.reportError("Couldn't find tab for document");
    }
  }

  function onPageWithCommands(pageUrl, commandsUrl, document, mimetype) {
    if (!self.isSubscribedFeed(pageUrl))
      showNotification(document, commandsUrl, mimetype);
  }

  // Watch for any tags of the form <link rel="commands">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (event.target.rel != "commands")
      return;

    onPageWithCommands(event.target.baseURI,
                       event.target.href,
                       event.target.ownerDocument,
                       event.target.type);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);
};

// This class is a collection that yields a code source for every
// currently-subscribed feed.
function LinkRelCodeCollection(fMgr) {
  this._sources = {};

  this._updateSourceList = function LRCC_updateSourceList() {
    let subscribedFeeds = fMgr.getSubscribedFeeds();
    let newSources = {};
    for (let i = 0; i < subscribedFeeds.length; i++) {
      let feedInfo = subscribedFeeds[i];
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
