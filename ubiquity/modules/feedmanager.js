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

// = FeedManager =
//
// The {{{FeedManager}}} class is used to manage Ubiquity's subscribed
// and unsubscribed feeds. It's responsible for communicating with
// feed plugins to reload feeds when they change and expose the
// functionality of all feeds to client code as {{{Feed}}} objects.

var EXPORTED_SYMBOLS = ["FeedManager"];

const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/eventhub.js");

const FEED_SRC_ANNO = "ubiquity/source";
const FEED_TYPE_ANNO = "ubiquity/type";
const FEED_AUTOUPDATE_ANNO = "ubiquity/autoupdate";
const FEED_BUILTIN_ANNO = "ubiquity/builtin";
const FEED_SUBSCRIBED_ANNO = "ubiquity/confirmed";
const FEED_UNSUBSCRIBED_ANNO = "ubiquity/removed";
const FEED_SRC_URL_ANNO = "ubiquity/commands";
const FEED_TITLE_ANNO = "ubiquity/title";
const FEED_DATE_ANNO = "ubiquity/date";
const FEED_BIN_ANNO = "ubiquity/bin";

const FEED_ANNOS = [this[v] for (v in this) if (/^FEED_/.test(v))];

const DEFAULT_FEED_TYPE = "commands";

// == The FeedManager Class =
//
// The constructor for this class takes an instance of an annotation
// service, which has an interface that's virtually identical to
// {{{nsIAnnotationService}}}. For an example implementation, see
// {{{AnnotationService}}}.

function FeedManager(annSvc) {
  this._annSvc = annSvc;
  this._plugins = {};
  this._feeds = {};
  this._hub = new EventHub();
  this._hub.attachMethods(this);
}

var FMgrProto = FeedManager.prototype = {};

// === {{{FeedManager#registerPlugin()}}} ===
//
// Registers a feed plugin with the feed manager. For an example feed
// plugin, see {{{LockedDownFeedPlugin}}}.

FMgrProto.registerPlugin = function FMgr_registerPlugin(plugin) {
  if (plugin.type in this._plugins)
    throw new Error("Feed plugin for type '" + plugin.type +
                    "' already registered.");

  this._plugins[plugin.type] = plugin;
};

// === {{{FeedManager#getUnsubscribedFeeds()}}} ===
//
// Returns an Array of {{{Feed}}} objects that represent all feeds
// that were once subscribed, but are currently unsubscribed.

FMgrProto.getUnsubscribedFeeds = function FMgr_getUnsubscribedFeeds() {
  let annSvc = this._annSvc;
  let removedUris = annSvc.getPagesWithAnnotation(FEED_UNSUBSCRIBED_ANNO, {});
  let unsubscribedFeeds = [];

  for (let i = 0; i < removedUris.length; i++)
    unsubscribedFeeds.push(this.__getFeed(removedUris[i]));

  return unsubscribedFeeds;
};

// === {{{FeedManager#getSubscribedFeeds()}}} ===
//
// Returns an Array of {{{Feed}}} objects that represent all feeds
// that are currently subscribed.

FMgrProto.getSubscribedFeeds = function FMgr_getSubscribedFeeds() {
  let annSvc = this._annSvc;
  let confirmedPages = annSvc.getPagesWithAnnotation(FEED_SUBSCRIBED_ANNO, {});
  let subscribedFeeds = [];

  for (let i = 0; i < confirmedPages.length; i++) {
    try {
      subscribedFeeds.push(this.__getFeed(confirmedPages[i]));
    } catch (e) {
      Cu.reportError(
        ("An error occurred when retrieving the feed for " +
         confirmedPages[i].spec + ": " + e)
      );
    }
  }

  return subscribedFeeds;
};

// === {{{FeedManager#getFeedForUrl()}}} ===
//
//
// Returns the feed for the given URL, if it exists. If it doesn't,
// this function returns null.

FMgrProto.getFeedForUrl = function FMgr_getFeedForUrl(url) {
  // TODO: This function is implemented terribly inefficiently.
  var {spec} = Utils.url(url);
  var feedLists = [this.getSubscribedFeeds(),
                   this.getUnsubscribedFeeds()];

  for each (let feeds in feedLists)
    for each (let feed in feeds)
      if (feed.uri.spec === spec)
        return feed;
  return null;
};

// === {{{FeedManager#addSubscribedFeed()}}} ===
//
// Adds a feed with the given information to the {{{FeedManager}}}. The
// information should be passed as a single Object with keys that
// correspond to values:
//
//   * {{{isBuiltIn}}} is a boolean that indicates whether the feed is
//     to be treated as a built-in feed. A built-in feed should not be
//     able to be unsubscribed-from by the user, and the lifetime of
//     its subscription does not persist across application restarts.
//   * {{{type}}} is the type of the feed; this is usually specified by
//     the {{{rel}}} attribute contained in a HTML page's {{{<link>}}}
//     tag, and determines what feed plugin is used to load and process
//     the feed.
//   * {{{url}}} is the URL of the feed.
//   * {{{sourceUrl}}} is the URL of the source code of the feed.
//   * {{{sourceCode}}} is the actual source code for the feed, which
//     which is cached.
//   * {{{canAutoUpdate}}} specifies whether or not the latest version
//     of the feed's source code should be fetched from the
//     network. If this is {{{false}}}, then the feed manager will
//     only ever use the cached version of the source code.
//   * {{{title}}} is the human-readable name for the feed.

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
  else
    annSvc.setPageAnnotation(uri, FEED_DATE_ANNO, new Date().toUTCString(), 0,
                             expiration);

  this._hub.notifyListeners("subscribe", uri);
};

// === {{{FeedManager#isSubscribedFeed()}}} ===
//
// Returns whether or not the given feed URL is currently being
// subscribed to.

FMgrProto.isSubscribedFeed = function FMgr_isSubscribedFeed(uri) {
  let annSvc = this._annSvc;
  uri = Utils.url(uri);
  return annSvc.pageHasAnnotation(uri, FEED_SUBSCRIBED_ANNO);
};

// === {{{FeedManager#isSubscribedFeed()}}} ===
//
// Returns whether or not the given feed URL was once subscribed
// to, but is no longer.

FMgrProto.isUnsubscribedFeed = function FMgr_isSubscribedFeed(uri) {
  let annSvc = this._annSvc;
  uri = Utils.url(uri);
  return annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);
};

// === {{{FeedManager#installToWindow()}}} ===
//
// This function installs the feed manager user interface to the
// given chrome window that represents a web browser.
//
// Whenever the window loads a web page containing a {{{<link>}}} tag
// that identifies it as a feed that can be loaded by one of the feed
// manager's registered plugins, the feed manager displays a
// notification box informing the user that they can subscribe to the
// feed.
//
// If the user clicks on the notification box's "Subscribe..." button,
// the feed manager passes control to the feed plugin responsible for
// loading the feed.

FMgrProto.installToWindow = function FMgr_installToWindow(window) {
  var self = this;

  function onPageWithCommands(plugin, pageUrl, commandsUrl, document,
                              mimetype) {
    if (!self.isSubscribedFeed(pageUrl))
      self.showNotification(plugin, document, commandsUrl, mimetype);
  }

  // Watch for any tags of the form <link rel="commands">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (!(event.target.rel in self._plugins) || !event.target.href)
      return;

    var pageUrl = event.target.baseURI;
    var hashIndex = pageUrl.indexOf("#");
    if (hashIndex != -1)
      pageUrl = pageUrl.slice(0, hashIndex);

    onPageWithCommands(self._plugins[event.target.rel],
                       pageUrl,
                       event.target.href,
                       event.target.ownerDocument,
                       event.target.type);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);

  for (var name in this._plugins) {
    var plugin = this._plugins[name];
    if (plugin.installToWindow)
      plugin.installToWindow(window);
  }
};

// TODO: Add Documentation for this
FMgrProto.showNotification = function showNotification(plugin,
                                                       targetDoc,
                                                       commandsUrl,
                                                       mimetype,
                                                       notify_message) {

  var Cc = Components.classes;
  var Ci = Components.interfaces;

  // Find the <browser> which contains notifyWindow, by looking
  // through all the open windows and all the <browsers> in each.
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
           getService(Ci.nsIWindowMediator);
  var enumerator = wm.getEnumerator(Utils.appWindowType);
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

    if(!notify_message){
      var notify_message = ("This page contains Ubiquity commands.  " +
       "If you'd like to subscribe to them, please " +
       "click the button to the right.");
    }

    var buttons = [
      {accessKey: "S",
       callback: onSubscribeClick,
       label: "Subscribe...",
       popup: null}
    ];
    box.appendNotification(
      notify_message,
      BOX_NAME,
      "http://www.mozilla.com/favicon.ico",
      box.PRIORITY_INFO_MEDIUM,
      buttons
    );
  } else {
    Cu.reportError("Couldn't find tab for document");
  }
};

// === {{{FeedManager#finalize()}}} ===
//
// Performs any necessary cleanup on the feed manager. Should be
// called when the feed manager no longer needs to be used.

FMgrProto.finalize = function FMgr_finalize() {
  for (var url in this._feeds)
    this._feeds[url].finalize();
};

FMgrProto.__getFeed = function FMgr___getFeed(uri) {
  if (!(uri.spec in this._feeds)) {
    var self = this;
    var feed = self.__makeFeed(uri);
    self._feeds[uri.spec] = feed;

    function onPurge(eventName, aUri) {
      if (aUri == uri) {
        delete self._feeds[uri.spec];
        self.removeListener("purge", onPurge);
      }
    }
    self.addListener("purge", onPurge);
  }

  return this._feeds[uri.spec];
};

// == The Feed Class ==
//
// Instances of {{{Feed}}} classes are generated by the feed manager
// as necessary; there's no public constructor for them.

FMgrProto.__makeFeed = function FMgr___makeFeed(uri) {
  let annSvc = this._annSvc;
  let hub = this._hub;

  // === {{{Feed#title}}} ===
  //
  // The human-readable name for the feed. Read-only.

  let title = uri.spec;
  if (annSvc.pageHasAnnotation(uri, FEED_TITLE_ANNO))
    title = annSvc.getPageAnnotation(uri, FEED_TITLE_ANNO);

  // === {{{Feed#type}}} ===
  //
  // A string identifying the type of the feed. This is usually the
  // same as the {{{rel}}} attribute contained in a HTML page's
  // {{{<link>}}} tag, and determines what feed plugin is used to load
  // and process the feed. Read-only.

  let type = annSvc.getPageAnnotation(uri, FEED_TYPE_ANNO, DEFAULT_FEED_TYPE);

  // === {{{Feed#uri}}} ===
  //
  // A {{{nsIURI}}} corresponding to the feed's URL. This is the
  // human-readable page that the end-user clicked the "Subscribe..."
  // button on; it is not necessarily the same page that contains the
  // feed's actual source code. Read-only.

  let feedInfo = {title: title,
                  uri: uri,
                  type: type};

  // === {{{Feed#isBuiltIn}}} ===
  //
  // This is a boolean that indicates whether the feed is to be treated
  // as a built-in feed. See the documentation for
  // {{{FeedManager#addSubscribedFeed()}}} for more
  // information. Read-only.

  feedInfo.__defineGetter__(
    "isBuiltIn",
    function() {
      return (annSvc.pageHasAnnotation(uri, FEED_BUILTIN_ANNO));
    }
  );

  // === {{{Feed#isSubscribed}}} ===
  //
  // Whether the feed is currently being subscribed to or not. Read-only.

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

  // === {{{Feed#purge()}}} ===
  //
  // Permanently deletes the feed.

  feedInfo.purge = function feedInfo_purge() {
    FEED_ANNOS.forEach(
      function(ann) {
        if (annSvc.pageHasAnnotation(uri, ann))
          annSvc.removePageAnnotation(uri, ann);
      });
    hub.notifyListeners("purge", uri);
  };

  // === {{{Feed#remove()}}} ===
  //
  // If the feed is currently being subscribed to, unsubscribes
  // it. This isn't permanent; the feed can be resubscribed-to later
  // with {{{Feed#unremove()}}}.

  feedInfo.remove = function feedInfo_remove() {
    if (annSvc.pageHasAnnotation(uri, FEED_SUBSCRIBED_ANNO)) {
      annSvc.removePageAnnotation(uri, FEED_SUBSCRIBED_ANNO);
      annSvc.setPageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO, "true", 0,
                               expiration);
      hub.notifyListeners("unsubscribe", uri);
    }
  };

  // === {{{Feed#unremove()}}} ===
  //
  // If the feed is currently unsubscribed, re-subscribes it.

  feedInfo.unremove = function feedInfo_undelete() {
    if (annSvc.pageHasAnnotation(uri, FEED_UNSUBSCRIBED_ANNO)) {
      annSvc.removePageAnnotation(uri, FEED_UNSUBSCRIBED_ANNO);
      annSvc.setPageAnnotation(uri, FEED_SUBSCRIBED_ANNO, "true", 0,
                               expiration);
      hub.notifyListeners("subscribe", uri);
    }
  };

  // === {{{Feed#srcUri}}} ===
  //
  // An {{{nsIURI}}} corresponding to the URL for the feed's source code.
  // Read-only.

  var val = annSvc.getPageAnnotation(uri, FEED_SRC_URL_ANNO);
  feedInfo.srcUri = Utils.url(val, "data:text/plain,");

  // === {{{Feed#date}}} ===
  //
  // Subscribed {{{Date}}} of the feed. {{{new Date(0)}}} for builtin feeds.
  // Read-only.

  var val = annSvc.getPageAnnotation(uri, FEED_DATE_ANNO, 0);
  feedInfo.date = new Date(val);

  // === {{{Feed#canAutoUpdate}}} ===
  //
  // Whether or not the latest version of the feed's source code should
  // be fetched from the network. See
  // {{{FeedManager#addSubscribedFeed()}}} for more
  // information. Read-only.

  if (annSvc.pageHasAnnotation(uri, FEED_AUTOUPDATE_ANNO))
    // fern: there's no not-hackish way of parsing a string to a boolean.
    feedInfo.canAutoUpdate = (/^true$/i).test(
      annSvc.getPageAnnotation(uri, FEED_AUTOUPDATE_ANNO)
    );
  else
    feedInfo.canAutoUpdate = false;

  // === {{{Feed#getCode()}}} ===
  //
  // Returns the cached source code for the feed, if any.

  feedInfo.getCode = function feedInfo_getCode() {
    if (annSvc.pageHasAnnotation(uri, FEED_SRC_ANNO))
      return annSvc.getPageAnnotation(uri, FEED_SRC_ANNO);
    else
      return "";
  };

  // === {{{Feed#setCode()}}} ===
  //
  // Sets the cached source code for the feed.

  feedInfo.setCode = function feedInfo_setCode(code) {
    annSvc.setPageAnnotation(uri, FEED_SRC_ANNO, code, 0,
                             expiration);
  };

  // === {{{Feed#getBin}}} ===
  //
  // Gets the persistent json storage for the feed.

  // === {{{Feed#setBin}}} ===
  //
  // Sets the persistent json storage for the feed and
  // returns the stored result as a new object.
  //
  // {bin} should be a json-encodable object.

  var {json} = Utils;
  feedInfo.getBin = function feedInfo_getBin() {
    return (annSvc.pageHasAnnotation(uri, FEED_BIN_ANNO)
            ? json.decode(annSvc.getPageAnnotation(uri, FEED_BIN_ANNO))
            : {});
  };
  feedInfo.setBin = function feedInfo_setBin(bin) {
    var data = json.encode(bin);
    annSvc.setPageAnnotation(uri, FEED_BIN_ANNO, data, 0, expiration);
    return json.decode(data);
  };

  // === {{{Feed#checkForManualUpdate()}}} ===
  //
  // Checks to see whether an update for the feed is available; if it
  // is, then the given callback is called and passed {{{true}}} as an
  // argument. Otherwise, the given callback is called and passed
  // {{{false}}} as an argument.

  feedInfo.checkForManualUpdate = function feedInfo_checkForManualUpdate(cb) {
    cb(false);
  };

  // === {{{Feed#viewSourceUri}}} ===
  //
  // Returns the {{{nsIURI}}} for the feed's source code. If the source
  // code only exists as cached data, this may be a data URI.

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

  // === {{{Feed#finalize()}}} ===
  //
  // Performs any needed cleanup on the feed before it's destroyed.
  feedInfo.finalize = function feedInfo_finalize() {
  };

  // == Subclassing Feed ==
  //
  // The {{{Feed}}} object created by {{{FeedManager}}} instances is
  // only used as a base class; the appropriate feed plugin
  // dynamically subclasses it and adds more functionality when its
  // {{{makeFeed()}}} method is called. For an example of this, see
  // {{{LockedDownFeedPlugin}}}.

  let plugin = this._plugins[feedInfo.type];
  if (!plugin)
    throw new Error("No feed plugin registered for type '" +
                    feedInfo.type + "'.");

  return plugin.makeFeed(feedInfo, hub);
};
