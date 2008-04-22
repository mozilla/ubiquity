function ConsoleMessageService()
{
    this.displayMessage = function(msg, title)
    {
        if (!title)
            title = "Friday Message";

        dump(title+": "+msg+"\n");
    };
}

function AlertMessageService()
{
    this.ALERT_IMG = "http://www.mozilla.com/favicon.ico";

    this.displayMessage = function(msg, title)
    {
        var Ci = Components.interfaces;
        var classObj = Components.classes["@mozilla.org/alerts-service;1"];
        var alertService = classObj.getService(Ci.nsIAlertsService);

        if (!title)
            title = "Friday Notification";

        alertService.showAlertNotification(this.ALERT_IMG,
                                           title,
                                           msg);
    };
}
