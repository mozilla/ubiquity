const Apology = ("<p>" +
                 "Currently, only works with " +
                 "Google Calendar".link("http://calendar.google.com") +
                 " so you'll need a Google account to use it." +
                 "</p>");

function reloadGoogleCalendarTabs() {
  var wm = (Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator));
  var enumerator = wm.getEnumerator(Utils.appWindowType);
  while(enumerator.hasMoreElements()) {
    var win = enumerator.getNext();
    var numTabs = win.getBrowser().mPanelContainer.childNodes.length;
    for (var i = 0; i < numTabs; ++i) {
      var tab = win.getBrowser().getBrowserAtIndex(i);
      var uri = tab.currentURI;
      if(/\bgoogle\.com$/.test(uri.host) && /^\/calendar/.test(uri.path))
        tab.reload();
    }
  }
}

/* TODO this command just takes unstructured text right now and relies on
 Google Calendar to figure it out.  So we're not using the DateNounType
 here.  Should we be; is there a better name for this command? */
CmdUtils.CreateCommand({
  name: "add-to-calendar",
  takes: {"event": noun_arb_text}, // TODO: use DateNounType or EventNounType?
  icon : "chrome://ubiquity/skin/icons/calendar_add.png",
  description: "Adds an event to your calendar.",
  help: (
    <>
    <a href="http://www.google.com/support/calendar/bin/answer.py?answer=36604"
    title="Quick Add">Enter the event naturally</a>. e.g.:
    <ul>
    <li>3pm Lunch with Myk and Thunder</li>
    <li>Jono&#39;s Birthday on Friday</li>
    </ul>
    </>) + Apology,
  execute: function(eventString) {
    var authKey = Utils.getCookie(".www.google.com", "CAL");
    if (!authKey) {
      this._needLogin();
      return;
    }
    var req = new XMLHttpRequest;
    req.open("POST",
             "http://www.google.com/calendar/feeds/default/private/full",
             false);
    req.setRequestHeader("Authorization", "GoogleLogin auth=" + authKey);
    req.setRequestHeader("Content-type", "application/atom+xml");
    req.send(<entry xmlns="http://www.w3.org/2005/Atom"
                    xmlns:gCal="http://schemas.google.com/gCal/2005">
               <content type="text">{eventString.text}</content>
               <gCal:quickadd value="true"/>
             </entry>.toXMLString());
    switch (req.status) {
      case 201:
      this._say("Event created",
                req.responseXML.getElementsByTagName("title")[0].textContent);
      try { reloadGoogleCalendarTabs() }
      catch (e) { this._say("Error reloading calendar tabs", e + "") }
      break;

      case 401:
      this._needLogin();
      break;

      default:
      this._say("Error creating the event",
                req.status + " " + req.statusText);
    }
  },
  _say: function(title, text) {
    displayMessage({icon: this.icon, title: title, text: text});
  },
  _needLogin: function() {
    this._say("Authorization error",
              "Please make sure you are logged in to Google Calendar");
  }
});

function linkToButton() {
  var txt = this.textContent;
  jQuery(this).replaceWith(
    <button value={this.href} accesskey={txt[0]}>{txt}</button>.toXMLString());
}

CmdUtils.CreateCommand({
  name: "check-calendar",
  takes: {"date to check": noun_type_date},
  icon : "chrome://ubiquity/skin/icons/calendar.png",
  description: "Checks what events are on your calendar for a given date.",
  help: 'Try issuing "check thursday"' + Apology,
  execute: function(directObj) {
    var date = directObj.data;
    var url = "http://www.google.com/calendar/";
    var params = Utils.paramsToString({as_sdt: date.toString("yyyyMMdd")});
    Utils.openUrlInBrowser(url + params);
  },
  preview: function preview(pblock, {data: date, url}) {
    if (!date) {
      pblock.innerHTML = this.description;
      return;
    }
    pblock.innerHTML = ("Checking Google Calendar for events on " +
                        date.toString("dddd, dS MMMM, yyyy") + ".");
    CmdUtils.previewGet(
      pblock,
      url || "http://www.google.com/calendar/m",
      {as_sdt: date.toString("yyyyMMdd")},
      function(htm) {
        var [cal] = /<div class[^]+$/(htm) || 0;
        if (!cal) {
          pblock.innerHTML =
            <>Please <a href={this.url} accesskey="L"><u>l</u>ogin</a>.</>;
          return;
        }
        var $c = CmdUtils.absUrl(
          (jQuery('<div class="calendar">' + cal).eq(0)
           .find(".c1:nth(1), form, span").remove().end()),
          this.url);
        $c.find(".c1 > a").each(linkToButton);
        $c.find("button").focus(function btn() {
          this.blur();
          this.disabled = true;
          preview(pblock, {data: date, url: this.value});
          return false;
        });
        pblock.innerHTML = "";
        $c.appendTo(pblock);
      },
      "text");
  }
});
