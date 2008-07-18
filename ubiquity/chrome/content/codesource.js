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
