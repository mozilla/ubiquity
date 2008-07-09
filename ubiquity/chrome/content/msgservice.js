function ConsoleMessageService() {
  this.displayMessage = function(msg) {
    var text = msg;
    var title = "Ubiquity Message";

    if (typeof(msg) == "object") {
      text = msg.text;
      if (msg.title)
        title = msg.title;
    }

    dump(title+": "+text+"\n");
  };
}

function AlertMessageService() {
  this.ALERT_IMG = "http://www.mozilla.com/favicon.ico";

  this.displayMessage = function(msg) {
    var Ci = Components.interfaces;
    var classObj = Components.classes["@mozilla.org/alerts-service;1"];
    var alertService = classObj.getService(Ci.nsIAlertsService);

    var text = msg;
    var title = "Ubiquity Notification";
    var icon = this.ALERT_IMG;

    if (typeof(msg) == "object") {
      text = msg.text;

      if (msg.title)
        title = msg.title;

      if (msg.icon)
        icon = msg.icon;
    }

    alertService.showAlertNotification(icon, title, text);
  };
}
