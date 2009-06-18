const Apology = ("<p>" +
                 "Currently, only works with " +
                 "Google Calendar".link("http://calendar.google.com") +
                 " so you'll need a Google account to use it." +
                 "</p>");

/* TODO this command just takes unstructured text right now and relies on
 * Google Calendar to figure it out.  So we're not using the DateNounType
 * here.  Should we be?
 *
 * Also, the goal argument, which is currently a dummy argument, should
 * become a plugin argument so that this can use different calendars --
 * "add to google calendar", "add to zimbra calendar", etc etc.*/
CmdUtils.CreateCommand({
  names: ["add (to calendar)"],
  arguments: [{ role: "object",
                nountype: noun_arb_text,
                label: "event"},
              { role: "goal",
                nountype: ["calendar"],
                label: "calendar"} ],
  icon: "chrome://ubiquity/skin/icons/calendar_add.png",
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
  execute: function( args ) {
    var event = args.object;
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
               <content type="text">{event.text}</content>
               <gCal:quickadd value="true"/>
             </entry>.toXMLString());
    switch (req.status) {
      case 201:
      this._say(_("Event created"),
                req.responseXML.getElementsByTagName("title")[0].textContent);
      Utils.tabs.reload(/^https?:\/\/www\.google\.com\/calendar\b/);
      break;

      case 401:
      this._needLogin();
      break;

      default:
      this._say(_("Error creating the event"),
                req.status + " " + req.statusText);
    }
  },
  _say: function(title, text) {
    displayMessage({icon: this.icon, title: title, text: text});
  },
  _needLogin: function() {
    this._say(_("Authorization error"),
              _("Please make sure you are logged in to Google Calendar"));
  }
});

function linkToButton() {
  var txt = this.textContent;
  jQuery(this).replaceWith(
    <button value={this.href} accesskey={txt[0]}>{txt}</button>.toXMLString());
}

/* TODO this should take a plugin argument specifying the calendar provider.
 */
CmdUtils.CreateCommand({
  names: ["check google calendar", "check gcalendar"],
  arguments: [{role: "date",
               nountype: noun_type_date,
               label: "date"}],
  icon : "chrome://ubiquity/skin/icons/calendar.png",
  description: "Checks what events are on your calendar for a given date.",
  help: 'Try issuing "check on thursday"' + Apology,
  execute: function({date: {data: date}}) {
    Utils.openUrlInBrowser("http://www.google.com/calendar/" +
                           Utils.paramsToString(this._param(date)));
  },
  // todo what is this url argument?
  preview: function preview(pblock, args, url) {
    var date = args.date.data;
    if (!date) {
      pblock.innerHTML = this.description;
      return;
    }
    pblock.innerHTML = (_("Checking Google Calendar for events on ") +
                        date.toString("dddd, dS MMMM, yyyy") + _("."));
    CmdUtils.previewGet(
      pblock,
      url || "http://www.google.com/calendar/m",
      this._param(date),
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
          preview(pblock, args, url);
          return false;
        });
        pblock.innerHTML = "";
        $c.appendTo(pblock);
      },
      "text");
  },
  _param: function(date)({as_sdt: date.toString("yyyyMMdd")}),
});
