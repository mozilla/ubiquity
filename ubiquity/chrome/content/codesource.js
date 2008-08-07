function RemoteUriCodeSource(uri) {
  this.uri = uri;
  this._code = "";
  this._req = null;
};

RemoteUriCodeSource.prototype = {
  getCode : function() {
    if (!this._req) {
      // Queue another XMLHttpRequest to fetch the latest code.

      var self = this;
      self._req = new XMLHttpRequest();
      self._req.open('GET', this.uri, true);
      self._req.overrideMimeType("text/javascript");

      function isJsType(type) {
        var validTypes = ["text/javascript",
                          "text/ecmascript",
                          "text/plain",
                          "application/x-javascript"];
        for (var i = 0; i < validTypes.length; i++) {
          // We only want to see if the string starts with the
          // type, since it might contain extra information, e.g.
          // 'text/html;charset=utf-8'.
          if (type.indexOf(validTypes[i]) == 0)
            return true;
        }
        return false;
      }

      self._req.onreadystatechange = function RUCS__onXhrChange() {
        if (self._req.readyState == 4) {
          if (self._req.status == 200) {
            // Update our cache.
            if (isJsType(self._req.getResponseHeader("Content-Type")))
              self._code = self._req.responseText;
          } else {
            // TODO: What should we do? Display a message?
          }
          self._req = null;
        }
      };

      this._req.send(null);
    }

    // Return whatever we've got cached for now.
    return this._code;
  }
};

function LocalUriCodeSource(uri) {
  this.uri = uri;
}

LocalUriCodeSource.prototype = {
  getCode : function() {
    var req = new XMLHttpRequest();
    req.open('GET', this.uri, false);
    req.overrideMimeType("text/javascript");
    req.send(null);
    if (req.status == 0)
      return req.responseText;
    else
      // TODO: Throw an exception or display a message.
      return "";
  }
};

function BookmarksCodeSource(tagName) {
  BookmarksCodeSource.__install(window);

  this._sources = {};

  this._updateSourceList = function BCS__updateSourceList() {
    var tags = Application.bookmarks.tags.children;
    tags = [tag for each (tag in tags)
                if (tag.title == tagName)];
    var newSources = {};

    if (tags.length == 1) {
      var tag = tags[0];

      var children = [child for each (child in tag.children)
                            if (child.type == "bookmark")];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var uri = child.uri;

        // See if there's any annotations for this page that tell us
        // about the existence of a <link rel="commands"> tag
        // that points to a JS file.  Note that we want to use the
        // annotation service directly (as opposed to FUEL) because
        // we want to see the annotations for the page, not the bookmark.
        var annSvc = BookmarksCodeSource.__getAnnSvc();
        if (annSvc.pageHasAnnotation(uri, "ubiquity/commands")) {
          var val = annSvc.getPageAnnotation(uri, "ubiquity/commands");
          uri = Utils.url(val);
        }

        var href = uri.spec;

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

        // TODO: What about data URIs? FTP?
      }
    }

    this._sources = newSources;
  },

  this.getCode = function BCS_getCode() {
    this._updateSourceList();

    var code = "";
    for each (source in this._sources)
      code += source.getCode() + "\n";

    return code;
  };
}

BookmarksCodeSource.__getAnnSvc = function BCS_getAnnSvc() {
  var Cc = Components.classes;
  var annSvc = Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Components.interfaces.nsIAnnotationService);
  return annSvc;
}

BookmarksCodeSource.__install = function BCS_install(window) {
  if (BookmarksCodeSource.__isInstalled)
    return;

  // Watch for any tags of the form <link rel="commands">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (event.target.rel != "commands")
      return;

    var annSvc = BookmarksCodeSource.__getAnnSvc();
    var url = Utils.url(event.target.baseURI);
    var commandsUrl = event.target.href;
    annSvc.setPageAnnotation(url, "ubiquity/commands",
                             commandsUrl, 0, annSvc.EXPIRE_WITH_HISTORY);
    Components.utils.reportError("Link added at " + url.spec);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);
  BookmarksCodeSource.__isInstalled = true;
};

BookmarksCodeSource.__isInstalled = false;
