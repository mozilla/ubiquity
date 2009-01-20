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


// TODO: Don't do a whole-sale copy of the page ;)
function checkCalendar(pblock, date) {
  var url = "http://www.google.com/calendar/m";
  var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

  Utils.ajaxGet(url + params, function(html) {
    pblock.innerHTML = html;
  });
}

CmdUtils.CreateCommand({
  name: "check-calendar",
  takes: {"date to check": noun_type_date},
  icon : "chrome://ubiquity/skin/icons/calendar.png",
  description: "Checks what events are on your calendar for a given date.",
  help: "Currently, only works with <a href=\"http://calendar.google.com\">Google Calendar</a>, so you'll need a " +
        "Google account to use it.  Try issuing &quot;check thursday&quot;.",
  execute: function( directObj ) {
    var date = directObj.data;
    var url = "http://www.google.com/calendar/m";
    var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

    Utils.openUrlInBrowser( url + params );
  },
  preview: function( pblock, directObj ) {
    var date = directObj.data;
    if (date) {
      pblock.innerHTML = "Checks Google Calendar for events on " +
                         date.toString("dddd, dS MMMM, yyyy") + ".";
      checkCalendar( pblock, date );
    } else
      pblock.innerHTML = "Checks Google Calendar for the date you specify.";
  }
});
