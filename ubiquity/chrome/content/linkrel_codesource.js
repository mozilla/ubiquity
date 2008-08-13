const CMD_CONFIRMED_ANNO = "ubiquity/confirmed";
const CMD_URL_ANNO = "ubiquity/commands";
const WARNING_URL = "chrome://ubiquity/content/confirm-add-command.html";

function LinkRelCodeSource() {
  LinkRelCodeSource.__install(window);

  this._sources = {};

  this._updateSourceList = function LRCS_updateSourceList() {
    let markedPages = LinkRelCodeSource.getMarkedPages();
    let newSources = {};
    for (let i = 0; i < markedPages.length; i++) {
      let uri = markedPages[i].jsUri;
      let href = uri.spec;
      if (this._sources[href]) {
        newSources[href] = this._sources[href];
      } else if (uri.scheme == "http" ||
                 uri.scheme == "https") {
        newSources[href] = new RemoteUriCodeSource(href);
      } else if (uri.scheme == "file" ||
                 uri.scheme == "chrome" ||
                 uri.scheme == "resource") {
        newSources[href] = new LocalUriCodeSource(href);
      }
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
}

LinkRelCodeSource.__makeNsUri = function LRCS_makeNsUri(uri) {
  if (typeof(uri) == "string") {
    var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
    uri = ioSvc.newURI(uri, null, null);
  }
  return uri;
};

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
      pageInfo.jsUri = this.__makeNsUri(val);
    } else {
      // There's no <link rel="commands"> tag;, so we'll assume this
      // is a raw JS file.
      pageInfo.jsUri = uri;
    }

    markedPages.push(pageInfo);
  }

  return markedPages;
};

LinkRelCodeSource.addMarkedPage = function LRCS_addMarkedPage(uri) {
  let annSvc = this.__getAnnSvc();
  uri = this.__makeNsUri(uri);
  annSvc.setPageAnnotation(uri, CMD_CONFIRMED_ANNO, "true", 0,
                           annSvc.EXPIRE_NEVER);
};

LinkRelCodeSource.isMarkedPage = function LRCS_isMarkedPage(uri) {
  let annSvc = this.__getAnnSvc();
  uri = this.__makeNsUri(uri);
  return annSvc.pageHasAnnotation(uri, CMD_CONFIRMED_ANNO);
};

LinkRelCodeSource.removeMarkedPage = function LRCS_removeMarkedPage(uri) {
  let annSvc = this.__getAnnSvc();
  uri = this.__makeNsUri(uri);
  annSvc.removePageAnnotation(uri, CMD_CONFIRMED_ANNO);
};

LinkRelCodeSource.__getAnnSvc = function LRCS_getAnnSvc() {
  var Cc = Components.classes;
  var annSvc = Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Components.interfaces.nsIAnnotationService);
  return annSvc;
};

LinkRelCodeSource.__install = function LRCS_install(window) {
  if (LinkRelCodeSource.__isInstalled)
    return;

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
      var confirmUrl = WARNING_URL + "?url=" + targetDoc.URL + "&sourceUrl="
			 + commandsUrl;
      var buttons = [
        {accessKey: null,
         callback: function() {
	   //Utils.openUrlInBrowser(confirmUrl);
           targetDoc.defaultView.location = confirmUrl;
	 },
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
  LinkRelCodeSource.__isInstalled = true;
};

LinkRelCodeSource.__isInstalled = false;
