var ExceptionUtils = {
  stackTraceFromFrame: function stackTraceFromFrame(frame, formatter) {
    if (!formatter)
      formatter = function defaultFormatter(frame) { return frame; };

    var output = "";

    while (frame) {
      output += formatter(frame) + "\n";
      frame = frame.caller;
    }

    return output;
  },

  stackTrace: function stackTrace(e, formatter) {
    var output = "";
    if (e.location) {
      // It's a wrapped nsIException.
      output += this.stackTraceFromFrame(e.location, formatter);
    } else if (e.stack)
      // It's a standard JS exception.

      // TODO: It would be nice if we could parse this string and
      // create a 'fake' nsIStackFrame-like call stack out of it,
      // so that we can do things w/ this stack trace like we do
      // with nsIException traces.
      output += e.stack;
    else
      // It's some other thrown object, e.g. a bare string.
      output += "No traceback available.\n";

    return output;
  }
};

function ErrorConsoleMessageService() {
  this.displayMessage = function(msg) {
    if (typeof(msg) == "object" && msg.exception) {
      var tb = ExceptionUtils.stackTrace(msg.exception);
      Components.utils.reportError(msg.exception);
      Components.utils.reportError("Traceback for last exception:\n" + tb);
    }
  };
}

function AlertMessageService() {
  this.ALERT_IMG = "http://www.mozilla.com/favicon.ico";

  this.displayMessage = function(msg) {
    var text = msg;
    var title = "Ubiquity Notification";
    var icon = this.ALERT_IMG;

    if (typeof(msg) == "object") {
      text = msg.text;

      if (msg.title)
        title = msg.title;

      if (msg.icon)
        icon = msg.icon;

      if (msg.exception)
        text += "\n" + msg.exception;
    }

    try {
      var Ci = Components.interfaces;
      var classObj = Components.classes["@mozilla.org/alerts-service;1"];
      var alertService = classObj.getService(Ci.nsIAlertsService);

      alertService.showAlertNotification(icon, title, text);
    } catch (e) {
      Components.utils.reportError(e);
      Utils.openUrlInBrowser("chrome://ubiquity/content/bug19warning.html");
    }
  };
}

function CompositeMessageService() {
  this._services = [];
}

CompositeMessageService.prototype = {
  add: function CMS_add(service) {
    this._services.push(service);
  },

  displayMessage: function CMS_displayMessage(msg) {
    for (var i = 0; i < this._services.length; i++)
      this._services[i].displayMessage(msg);
  }
}
