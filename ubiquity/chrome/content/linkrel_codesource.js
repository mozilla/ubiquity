const CMD_SRC_ANNO = "ubiquity/source";
const CMD_AUTOUPDATE_ANNO = "ubiquity/autoupdate";
const CMD_CONFIRMED_ANNO = "ubiquity/confirmed";
const CMD_URL_ANNO = "ubiquity/commands";
const CONFIRM_URL = "chrome://ubiquity/content/confirm-add-command.html";

function LinkRelCodeSource() {
  if (LinkRelCodeSource.__singleton)
    return LinkRelCodeSource.__singleton;

  LinkRelCodeSource.__install(window);

  this._sources = {};

  this._updateSourceList = function LRCS_updateSourceList() {
    let markedPages = LinkRelCodeSource.getMarkedPages();
    let newSources = {};
    for (let i = 0; i < markedPages.length; i++) {
      let pageInfo = markedPages[i];
      let href = pageInfo.jsUri.spec;
      let source;
      if (RemoteUriCodeSource.isValidUri(pageInfo.jsUri)) {
        if (pageInfo.canUpdate) {
          source = new RemoteUriCodeSource(pageInfo);
        } else
          // TODO: What about 0.1 feeds?  Just make users
          // resubscribe to all their stuff?  Or implement
          // manual updating?
          source = new StringCodeSource(pageInfo.getCode());
      } else if (LocalUriCodeSource.isValidUri(pageInfo.jsUri)) {
        source = new LocalUriCodeSource(href);
      } else {
        throw new Error("Don't know how to make code source for " + href);
      }

      newSources[href] = source;
    }
    this._sources = newSources;
  };

  this.getCode = function LRCS_getCode() {
    this._updateSourceList();

    var code = "";
    for each (source in this._sources)
      code += source.getCode() + "\n";

    return code;
  };

  LinkRelCodeSource.__singleton = this;
}

LinkRelCodeSource.getMarkedPages = function LRCS_getMarkedPages() {
  let annSvc = this.__getAnnSvc();
  let confirmedPages = annSvc.getPagesWithAnnotation(CMD_CONFIRMED_ANNO, {});
  let markedPages = [];

  for (let i = 0; i < confirmedPages.length; i++) {
    let uri = confirmedPages[i];

    // TODO: Get the real title of the page.
    let pageInfo = {title: uri.spec,
                    htmlUri: uri};

    // See if there's any annotations for this page that tell us
    // about the existence of a <link rel="commands"> tag
    // that points to a JS file.
    if (annSvc.pageHasAnnotation(uri, CMD_URL_ANNO)) {
      var val = annSvc.getPageAnnotation(uri, CMD_URL_ANNO);
      pageInfo.jsUri = Utils.url(val);
    } else {
      // There's no <link rel="commands"> tag;, so we'll assume this
      // is a raw JS file.
      pageInfo.jsUri = uri;
    }

    if (annSvc.pageHasAnnotation(uri, CMD_AUTOUPDATE_ANNO))
      pageInfo.canUpdate = annSvc.getPageAnnotation(uri, CMD_AUTOUPDATE_ANNO);
    else
      pageInfo.canUpdate = false;

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

    markedPages.push(pageInfo);
  }

  return markedPages;
};

LinkRelCodeSource.addMarkedPage = function LRCS_addMarkedPage(info) {
  let annSvc = this.__getAnnSvc();
  let uri = Utils.url(info.url);
  annSvc.setPageAnnotation(uri, CMD_SRC_ANNO, info.sourceCode, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, CMD_AUTOUPDATE_ANNO, info.canUpdate, 0,
                           annSvc.EXPIRE_NEVER);
  annSvc.setPageAnnotation(uri, CMD_CONFIRMED_ANNO, "true", 0,
                           annSvc.EXPIRE_NEVER);
};

LinkRelCodeSource.isMarkedPage = function LRCS_isMarkedPage(uri) {
  let annSvc = this.__getAnnSvc();
  uri = Utils.url(uri);
  return annSvc.pageHasAnnotation(uri, CMD_CONFIRMED_ANNO);
};

LinkRelCodeSource.removeMarkedPage = function LRCS_removeMarkedPage(uri) {
  let annSvc = this.__getAnnSvc();
  uri = Utils.url(uri);
  annSvc.removePageAnnotation(uri, CMD_CONFIRMED_ANNO);
  if (annSvc.pageHasAnnotation(uri, CMD_AUTOUPDATE_ANNO))
    annSvc.removePageAnnotation(uri, CMD_AUTOUPDATE_ANNO);
  if (annSvc.pageHasAnnotation(uri, CMD_SRC_ANNO))
    annSvc.removePageAnnotation(uri, CMD_SRC_ANNO);
};

LinkRelCodeSource.__getAnnSvc = function LRCS_getAnnSvc() {
  var Cc = Components.classes;
  var annSvc = Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Components.interfaces.nsIAnnotationService);
  return annSvc;
};

LinkRelCodeSource.__install = function LRCS_install(window) {
  function showNotification(targetDoc, commandsUrl) {
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

      // Clicking on "subscribe" takes them to the warning page:
      var confirmUrl = CONFIRM_URL + "?url=" + encodeURIComponent(targetDoc.URL) + "&sourceUrl="
			 + encodeURIComponent(commandsUrl);

      function isTrustedUrl(commandsUrl) {
        // TODO: Really implement this. If the domain is trusted and the
        // protocol is https, then return true, otherwise return false.
        // also potentially take the link's 'class' attribute into
        // account and see if it's 'untrusted', for the case where a
        // trusted host is mirroring an untrusted command feed.
        return false;
      }

      function onSubscribeClick(notification, button) {
        if (isTrustedUrl(commandsUrl)) {
          function onSuccess(data) {
            LinkRelCodeSource.addMarkedPage({url: targetDoc.URL,
                                             canUpdate: true,
                                             sourceCode: data});
            Utils.openUrlInBrowser(confirmUrl);
          }

          if (RemoteUriCodeSource.isValidUri(commandsUrl)) {
            jQuery.ajax({url: commandsUrl,
                         dataType: "text",
                         success: onSuccess});
          } else
            onSuccess("");
        } else
          Utils.openUrlInBrowser(confirmUrl);
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

  // Watch for any tags of the form <link rel="commands">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (event.target.rel != "commands")
      return;

    var annSvc = LinkRelCodeSource.__getAnnSvc();
    var url = Utils.url(event.target.baseURI);
    var commandsUrl = event.target.href;
    annSvc.setPageAnnotation(url, CMD_URL_ANNO,
                             commandsUrl, 0, annSvc.EXPIRE_WITH_HISTORY);
    if (!LinkRelCodeSource.isMarkedPage(url))
      showNotification(event.target.ownerDocument, commandsUrl);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);
};
