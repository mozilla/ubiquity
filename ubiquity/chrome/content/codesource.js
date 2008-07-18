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

      self._req.onreadystatechange = function RUCS__onXhrChange() {
        if (self._req.readyState == 4) {
          if (self._req.status == 200) {
            // Update our cache.
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
        var href = child.uri.spec;

        if (this._sources[href]) {
          newSources[href] = this._sources[href];
        } else if (child.uri.scheme == "http" ||
                   child.uri.scheme == "https") {
          newSources[href] = new RemoteUriCodeSource(href);
        } else if (child.uri.scheme == "file" ||
                   child.uri.scheme == "chrome" ||
                   child.uri.scheme == "resource") {
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
