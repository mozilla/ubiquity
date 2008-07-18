function RemoteUriCodeSource(uri) {
  this.uri = uri;
  this._code = "";

  var self = this;

  // TODO: Retrieve the code on a timer.

  var req = new XMLHttpRequest();
  req.open('GET', this.uri, true);
  req.overrideMimeType("text/javascript");
  req.onreadystatechange =   function RemoteUriCodeSource_onXhrChange() {
    if (req.readyState == 4)
      if (req.status == 200)
        self._code = req.responseText;
      else {
        // TODO: What should we do? Display a message?
      }
  };

  req.send(null);
};

RemoteUriCodeSource.prototype = {
  getCode : function() {
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
      // TODO: Throw an exception instead.
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
