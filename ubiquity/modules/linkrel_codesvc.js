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

EXPORTED_SYMBOLS = ["LinkRelCodeService",
                    "LinkRelCodeCollection"];

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/codesource.js");
Components.utils.import("resource://ubiquity-modules/eventhub.js");

const CMD_SRC_ANNO = "ubiquity/source";
const CMD_AUTOUPDATE_ANNO = "ubiquity/autoupdate";
const CMD_CONFIRMED_ANNO = "ubiquity/confirmed";
const CMD_REMOVED_ANNO = "ubiquity/removed";
const CMD_URL_ANNO = "ubiquity/commands";
const CMD_TITLE_ANNO = "ubiquity/title";

const CONFIRM_URL = "chrome://ubiquity/content/confirm-add-command.html";

function LinkRelCodeService(annSvc) {
  this._annSvc = annSvc;

  let hub = new EventHub();
  hub.attachMethods(this);

  function onAnnChanged(aURI, aName) {
    if (aName == CMD_AUTOUPDATE_ANNO ||
        aName == CMD_CONFIRMED_ANNO ||
        aName == CMD_REMOVED_ANNO ||
        aName == CMD_SRC_ANNO)
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

LinkRelCodeService.prototype = LRCSProto = {};

LRCSProto.__makePage = function LRCS___makePage(uri) {
  let annSvc = this._annSvc;

  let title = uri.spec;
  if (annSvc.pageHasAnnotation(uri, CMD_TITLE_ANNO))
    title = annSvc.getPageAnnotation(uri, CMD_TITLE_ANNO);

  let pageInfo = {title: title,
                  uri: uri,
                  htmlUri: uri};

  pageInfo.remove = function pageInfo_remove() {
    if (annSvc.pageHasAnnotation(uri, CMD_CONFIRMED_ANNO)) {
      annSvc.removePageAnnotation(uri, CMD_CONFIRMED_ANNO);
      annSvc.setPageAnnotation(uri, CMD_REMOVED_ANNO, "true", 0,
                               annSvc.EXPIRE_NEVER);
    }
  };

  pageInfo.unremove = function pageInfo_undelete() {
    if (annSvc.pageHasAnnotation(uri, CMD_REMOVED_ANNO)) {
      annSvc.removePageAnnotation(uri, CMD_REMOVED_ANNO);
      annSvc.setPageAnnotation(uri, CMD_CONFIRMED_ANNO, "true", 0,
                               annSvc.EXPIRE_NEVER);
    }
  };

  // See if there's any annotations for this page that tell us
  // about the existence of a <link rel="commands"> tag
  // that points to a JS file.
  if (annSvc.pageHasAnnotation(uri, CMD_URL_ANNO)) {
    var val = annSvc.getPageAnnotation(uri, CMD_URL_ANNO);
    pageInfo.jsUri = Utils.url(val);
  } else {
    // There's no <link rel="commands"> tag, so we'll assume this
    // is a raw JS file.
    pageInfo.jsUri = uri;
  }

  if (LocalUriCodeSource.isValidUri(pageInfo.jsUri)) {
    pageInfo.canAutoUpdate = true;
  } else if (annSvc.pageHasAnnotation(uri, CMD_AUTOUPDATE_ANNO)) {
    // fern: there's no not-hackish way of parsing a string to a boolean.
    pageInfo.canAutoUpdate = (/^true$/i).test(
      annSvc.getPageAnnotation(uri, CMD_AUTOUPDATE_ANNO)
    );
  } else
    pageInfo.canAutoUpdate = false;

  pageInfo.getCode = function pageInfo_getCode() {
    if (annSvc.pageHasAnnotation(uri, CMD_SRC_ANNO))
      return annSvc.getPageAnnotation(uri, CMD_SRC_ANNO);
    else
      return "";
  };

  pageInfo.setCode = function pageInfo_setCode(code) {
    annSvc.setPageAnnotation(uri, CMD_SRC_ANNO, code, 0,
                             annSvc.EXPIRE_NEVER);
  };

  pageInfo.__defineGetter__(
    "viewSourceUri",
    function pageInfo_viewSource() {
      if (pageInfo.canAutoUpdate)
        return pageInfo.jsUri;
      else {
        let uri = ("data:application/x-javascript," +
                   escape(pageInfo.getCode()));
        return Utils.url(uri);
      }
    }
  );

  return pageInfo;
};

LRCSProto.getRemovedPages = function LRCS_getRemovedPages() {
  let annSvc = this._annSvc;
  let removedUris = annSvc.getPagesWithAnnotation(CMD_REMOVED_ANNO, {});
  let removedPages = [];

  for (let i = 0; i < removedUris.length; i++)
    removedPages.push(this.__makePage(removedUris[i]));

  return removedPages;
};

LRCSProto.getMarkedPages = function LRCS_getMarkedPages() {
  let annSvc = this._annSvc;
  let confirmedPages = annSvc.getPagesWithAnnotation(CMD_CONFIRMED_ANNO, {});
  let markedPages = [];

  for (let i = 0; i < confirmedPages.length; i++)
    markedPages.push(this.__makePage(confirmedPages[i]));

  return markedPages;
};

LRCSProto.addMarkedPage = function LRCS_addMarkedPage(info) {
  let annSvc = this._annSvc;
  let uri = Utils.url(info.url);

  if (annSvc.pageHasAnnotation(uri, CMD_REMOVED_ANNO))
      annSvc.removePageAnnotation(uri, CMD_REMOVED_ANNO);
  annSvc.setPageAnnotation(uri, CMD_SRC_ANNO, info.sourceCode, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, CMD_AUTOUPDATE_ANNO, info.canAutoUpdate, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, CMD_CONFIRMED_ANNO, "true", 0,
                           annSvc.EXPIRE_NEVER);
  if (info.title)
    annSvc.setPageAnnotation(uri, CMD_TITLE_ANNO, info.title, 0,
                             annSvc.EXPIRE_NEVER);
};

LRCSProto.isMarkedPage = function LRCS_isMarkedPage(uri) {
  let annSvc = this._annSvc;
  uri = Utils.url(uri);
  return annSvc.pageHasAnnotation(uri, CMD_CONFIRMED_ANNO);
};

LRCSProto.installDefaults = function LRCS_installDefaults(baseUri,
                                                          baseLocalUri,
                                                          infos) {
  let annSvc = this._annSvc;

  for (let i = 0; i < infos.length; i++) {
    let info = infos[i];
    let uri = Utils.url(baseUri + info.page);

    if (!annSvc.pageHasAnnotation(uri, CMD_REMOVED_ANNO)) {
      annSvc.setPageAnnotation(uri, CMD_URL_ANNO,
                               baseUri + info.source,
                               0, annSvc.EXPIRE_WITH_HISTORY);
      let lcs = new LocalUriCodeSource(baseLocalUri + info.source);
      this.addMarkedPage({url: uri,
                          sourceCode: lcs.getCode(),
                          canAutoUpdate: true,
                          title: info.title});
    }
  }
};

function subscribeResponder(window, lrcs, targetDoc,
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
      lrcs.addMarkedPage({url: targetDoc.location.href,
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

LRCSProto.installToWindow = function LRCS_installToWindow(window) {
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
    var annSvc = self._annSvc;

    pageUrl = Utils.url(pageUrl);
    annSvc.setPageAnnotation(pageUrl, CMD_URL_ANNO,
                             commandsUrl, 0, annSvc.EXPIRE_WITH_HISTORY);
    if (!self.isMarkedPage(pageUrl))
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
function LinkRelCodeCollection(lrcs) {
  this._sources = {};

  this._updateSourceList = function LRCC_updateSourceList() {
    let markedPages = lrcs.getMarkedPages();
    let newSources = {};
    for (let i = 0; i < markedPages.length; i++) {
      let pageInfo = markedPages[i];
      let href = pageInfo.jsUri.spec;
      let source;
      if (RemoteUriCodeSource.isValidUri(pageInfo.jsUri)) {
        if (pageInfo.canAutoUpdate) {
          source = new RemoteUriCodeSource(pageInfo);
        } else
          // TODO: What about 0.1 feeds?  Just make users
          // resubscribe to all their stuff?  Or implement
          // manual updating?
          source = new StringCodeSource(pageInfo.getCode(),
                                        pageInfo.jsUri.spec);
      } else if (LocalUriCodeSource.isValidUri(pageInfo.jsUri)) {
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

  lrcs.addListener("change", listener);

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
