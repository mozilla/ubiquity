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

let EXPORTED_SYMBOLS = ["FeedManager"];

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/eventhub.js");

const FEED_SRC_ANNO = "ubiquity/source";
const FEED_TYPE_ANNO = "ubiquity/type";
const FEED_AUTOUPDATE_ANNO = "ubiquity/autoupdate";
const FEED_BUILTIN_ANNO = "ubiquity/builtin";
const FEED_SUBSCRIBED_ANNO = "ubiquity/confirmed";
const FEED_UNSUBSCRIBED_ANNO = "ubiquity/removed";
const FEED_SRC_URL_ANNO = "ubiquity/commands";
const FEED_TITLE_ANNO = "ubiquity/title";

const DEFAULT_FEED_TYPE = "commands";

function FeedManager(annSvc) {
  this._annSvc = annSvc;
  this._plugins = {};
  this._feeds = {};
  this._hub = new EventHub();
  this._hub.attachMethods(this);
}

FeedManager.prototype = FMgrProto = {};

FMgrProto.registerPlugin = function FMgr_registerPlugin(plugin) {
  if (plugin.type in this._plugins)
    throw new Error("Feed plugin for type '" + plugin.type +
                    "' already registered.");

  this._plugins[plugin.type] = plugin;
};

FMgrProto.__getFeed = function FMgr___getFeed(uri) {
  if (!(uri.spec in this._feeds))
    this._feeds[uri.spec] = this.__makeFeed(uri);

  return this._feeds[uri.spec];
};

FMgrProto.__makeFeed = function FMgr___makeFeed(uri) {
  let annSvc = this._annSvc;
  let hub = this._hub;

  let title = uri.spec;
  if (annSvc.pageHasAnnotation(uri, FEED_TITLE_ANNO))
    title = annSvc.getPageAnnotation(uri, FEED_TITLE_ANNO);

  let type = annSvc.getPageAnnotation(uri, FEED_TYPE_ANNO);

  let feedInfo = {title: title,
                  uri: uri,
                  type: type};

  feedInfo.__defineGetter__(
    "isBuiltIn",
    function() {
      return (annSvc.pageHasAnnotation(uri, FEED_BUILTIN_ANNO));
    }
  );

  feedInfo.__defineGetter__(
    "isSubscribed",
    function() {
      return (annSvc.pageHasAnnotation(uri, FEED_SUBSCRIBED_ANNO));
    }
  );

  let expiration;

  if (feedInfo.isBuiltIn)
    expiration = annSvc.EXPIRE_SESSION;
  else
    expiration = annSvc.EXPIRE_NEVER;

  feedInfo.remove = function feedInfo_remove() {
    if (annSvc.pageHasAnnotation(uri, FEED_SUBSCRIBED_ANNO)) {
      annSvc.removePageAnnotation(uri, FEED_SUBSCRIBED_ANNO);
      annSvc.setPageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO, "true", 0,
                               expiration);
      hub.notifyListeners("unsubscribe", uri);
    }
  };

  feedInfo.unremove = function feedInfo_undelete() {
    if (annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO)) {
      annSvc.removePageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);
      annSvc.setPageAnnotation(uri, FEED_SUBSCRIBED_ANNO, "true", 0,
                               expiration);
      hub.notifyListeners("subscribe", uri);
    }
  };

  var val = annSvc.getPageAnnotation(uri, FEED_SRC_URL_ANNO);
  feedInfo.srcUri = Utils.url(val);

  if (annSvc.pageHasAnnotation(uri, FEED_AUTOUPDATE_ANNO))
    // fern: there's no not-hackish way of parsing a string to a boolean.
    feedInfo.canAutoUpdate = (/^true$/i).test(
      annSvc.getPageAnnotation(uri, FEED_AUTOUPDATE_ANNO)
    );
  else
    feedInfo.canAutoUpdate = false;

  feedInfo.getCode = function feedInfo_getCode() {
    if (annSvc.pageHasAnnotation(uri, FEED_SRC_ANNO))
      return annSvc.getPageAnnotation(uri, FEED_SRC_ANNO);
    else
      return "";
  };

  feedInfo.setCode = function feedInfo_setCode(code) {
    annSvc.setPageAnnotation(uri, FEED_SRC_ANNO, code, 0,
                             expiration);
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

  let plugin = this._plugins[feedInfo.type];
  if (!plugin)
    throw new Error("No feed plugin registered for type '" +
                    feedInfo.type + "'.");

  return plugin.makeFeed(feedInfo, hub);
};

FMgrProto.getUnsubscribedFeeds = function FMgr_getUnsubscribedFeeds() {
  let annSvc = this._annSvc;
  let removedUris = annSvc.getPagesWithAnnotation(FEED_UNSUBSCRIBED_ANNO, {});
  let unsubscribedFeeds = [];

  for (let i = 0; i < removedUris.length; i++)
    unsubscribedFeeds.push(this.__getFeed(removedUris[i]));

  return unsubscribedFeeds;
};

FMgrProto.getSubscribedFeeds = function FMgr_getSubscribedFeeds() {
  let annSvc = this._annSvc;
  let confirmedPages = annSvc.getPagesWithAnnotation(FEED_SUBSCRIBED_ANNO, {});
  let subscribedFeeds = [];

  for (let i = 0; i < confirmedPages.length; i++)
    subscribedFeeds.push(this.__getFeed(confirmedPages[i]));

  return subscribedFeeds;
};

FMgrProto.addSubscribedFeed = function FMgr_addSubscribedFeed(baseInfo) {
  // Overlay defaults atop the passed-in information without destructively
  // modifying our arguments.
  let info = new Object();

  if (!baseInfo.type)
    info.type = DEFAULT_FEED_TYPE;

  info.__proto__ = baseInfo;

  // Now add the feed.
  let annSvc = this._annSvc;
  let uri = Utils.url(info.url);
  let expiration;

  if (info.isBuiltIn)
    expiration = annSvc.EXPIRE_SESSION;
  else
    expiration = annSvc.EXPIRE_NEVER;

  if (annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO))
    annSvc.removePageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);

  annSvc.setPageAnnotation(uri, FEED_TYPE_ANNO, info.type, 0,
                           expiration);
  annSvc.setPageAnnotation(uri, FEED_SRC_URL_ANNO, info.sourceUrl, 0,
                           expiration);
  annSvc.setPageAnnotation(uri, FEED_SRC_ANNO, info.sourceCode, 0,
                           expiration);
  annSvc.setPageAnnotation(uri, FEED_AUTOUPDATE_ANNO, info.canAutoUpdate, 0,
                           expiration);
  annSvc.setPageAnnotation(uri, FEED_SUBSCRIBED_ANNO, "true", 0,
                           expiration);
  if (info.title)
    annSvc.setPageAnnotation(uri, FEED_TITLE_ANNO, info.title, 0,
                             expiration);
  if (info.isBuiltIn)
    annSvc.setPageAnnotation(uri, FEED_BUILTIN_ANNO, "true", 0,
                             expiration);

  this._hub.notifyListeners("subscribe", uri);
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

FMgrProto.installToWindow = function FMgr_installToWindow(window) {
  var self = this;

  function showNotification(plugin, targetDoc, commandsUrl, mimetype) {
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
        plugin.onSubscribeClick(targetDoc, commandsUrl, mimetype);
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

  function onPageWithCommands(plugin, pageUrl, commandsUrl, document,
                              mimetype) {
    if (!self.isSubscribedFeed(pageUrl))
      showNotification(plugin, document, commandsUrl, mimetype);
  }

  // Watch for any tags of the form <link rel="commands">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (!(event.target.rel in self._plugins))
      return;

    onPageWithCommands(self._plugins[event.target.rel],
                       event.target.baseURI,
                       event.target.href,
                       event.target.ownerDocument,
                       event.target.type);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);
};
