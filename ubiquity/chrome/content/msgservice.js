function ConsoleMessageService() {
  this.displayMessage = function(msg, title) {
    if (!title)
      title = "Ubiquity Message";

    dump(title+": "+msg+"\n");
  };
}

function AlertMessageService() {
  this.ALERT_IMG = "http://www.mozilla.com/favicon.ico";

  this.displayMessage = function(msg, title, icon) {
    var Ci = Components.interfaces;
    var classObj = Components.classes["@mozilla.org/alerts-service;1"];
    var alertService = classObj.getService(Ci.nsIAlertsService);

    if (!title)
      title = "Ubiquity Notification";

    if (icon == undefined)
      icon = this.ALERT_IMG;

    alertService.showAlertNotification(icon, title, msg);
  };
}
