function reloadGoogleCalendarTabs() {
  try {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator(Utils.appWindowType);
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      var index = 0, numTabs = win.getBrowser().mPanelContainer.childNodes.length;
      while (index < numTabs) {
        var currentTab = win.getBrowser().getBrowserAtIndex(index);
        if(currentTab.currentURI.spec.indexOf("google.com/calendar") > -1) {
          currentTab.reload();
        }
        index++;
      }
    }
  } catch(e) {
    displayMessage("Error reloading calendar tabs: " + e);
  }
}


function addToGoogleCalendar(eventString) {

  var quickAddEntry = "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gCal='http://schemas.google.com/gCal/2005'>";
  quickAddEntry += "    <content type=\"html\">" + eventString + "</content>";
  quickAddEntry += "    <gCal:quickadd value=\"true\"/>";
  quickAddEntry += "</entry>";

  var authKey = Utils.getCookie(".www.google.com", "CAL");
  if (authKey == "") {
    displayMessage("Please make sure you are logged in to Google Calendar");
    return;
  }

  var currentCalendar = "http://www.google.com/calendar/feeds/default/private/full";

  var req = new XMLHttpRequest();
  req.open('POST', currentCalendar, false);
  req.setRequestHeader('Authorization', 'GoogleLogin auth=' + authKey);
  req.setRequestHeader('Content-type', 'application/atom+xml');
  req.send(quickAddEntry);
  if (req.status == 401) {
    displayMessage("Please make sure you are logged in to Google Calendar");
    return;
  } else if (req.status != 201) {
    displayMessage("Error creating the event. Error code: " + req.status + " " + req.statusText);
    return;
  }

}

/* TODO this command just takes unstructured text right now and relies on
 Google Calendar to figure it out.  So we're not using the DateNounType
 here.  Should we be; is there a better name for this command? */
CmdUtils.CreateCommand({
  name: "add-to-calendar",
  takes: {"event": noun_arb_text}, // TODO: use DateNounType or EventNounType?
  icon : "chrome://ubiquity/skin/icons/calendar_add.png",
  preview: "Adds the event to Google Calendar.<br/> Enter the event naturally e.g., \"3pm Lunch with Myk and Thunder\", or \"Jono's Birthday on Friday\".",
  description: "Adds an event to your calendar.",
  help: "Currently, only works with <a href=\"http://calendar.google.com\">Google Calendar</a>, so you'll need a " +
        "Google account to use it.  Try issuing &quot;add lunch with dan tomorrow&quot;.",
  execute: function( eventString ) {
    addToGoogleCalendar( eventString.text );
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
  help: ("" + <>
         Currently, only works with
         <a href="http://calendar.google.com">Google Calendar</a>,
         so you&#x27;ll need a Google account to use it.
         Try issuing "check thursday".</>),
  execute: function(directObj) {
    var date = directObj.data;
    var url = "http://www.google.com/calendar/";
    var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

    Utils.openUrlInBrowser( url + params );
  },
  preview: function preview(pblock, {data: date, url}) {
    if (!date) {
      pblock.innerHTML = "Checks Google Calendar for the date you specify.";
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
            <>Please <a href={this.url} accesskey="L">login</a>.</>;
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
