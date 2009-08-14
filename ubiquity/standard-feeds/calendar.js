const GCalendar = "https://www.google.com/calendar/";
const Apology = ("<p>" +
                 "Currently, only works with " +
                 "Google Calendar".link("http://calendar.google.com") +
                 " so you'll need a Google account to use it." +
                 "</p>");

CmdUtils.CreateCommand({
  names: ["add to google calendar", "quick add"],
  argument: {object_event: noun_arb_text},
  serviceDomain: "calendar.google.com",
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
  execute: function qa_execute(args) {
    var event = args.object.text;
    var authKey = Utils.getCookie(".www.google.com", "CAL");
    var me = this;
    function needLogin() {
      me._say(_("Authorization error"),
              _("Please make sure you are logged in to Google Calendar"));
    }
    if (!authKey) {
      needLogin();
      return;
    }
    var req = new XMLHttpRequest;
    req.open("POST", GCalendar + "feeds/default/private/full", false);
    req.setRequestHeader("Authorization", "GoogleLogin auth=" + authKey);
    req.setRequestHeader("Content-type", "application/atom+xml");
    req.send(<entry xmlns="http://www.w3.org/2005/Atom"
                    xmlns:gCal="http://schemas.google.com/gCal/2005">
               <content type="text">{event}</content>
               <gCal:quickadd value="true"/>
             </entry>.toXMLString());
    switch (req.status) {
      case 201:
      this._say(_("Event created"),
                req.responseXML.getElementsByTagName("title")[0].textContent);
      Utils.tabs.reload(/^https?:\/\/www\.google\.com\/calendar\b/);
      break;

      case 401:
      needLogin();
      break;

      default:
      this._say(_("Error creating the event"),
                req.status + " " + req.statusText);
    }
  },
  preview: function qa_preview(pb, {object: {html}}) {
    pb.innerHTML = html || this.previewDefault();
  },
  _say: function qa__say(title, text) {
    displayMessage({
      icon: this.icon,
      title: this.name + ": " +  title,
      text: text,
    });
  }
});

function linksToButtons($links) {
  var keys = ["P", "N"];
  if ($links.length > 2) keys.splice(1, 0, "T");
  $links.each(function eachLink(i) {
    var txt = this.textContent, key = keys[i];
    if (txt[0] !== key) txt += " (" + key + ")";
    jQuery(this).replaceWith(<button value={this.href} accesskey={key}
                             >{txt}</button>.toXMLString());
  });
}

function dateParam(date) ({as_sdt: date.toString("yyyyMMdd")});

// TODO this should take a plugin argument specifying the calendar provider.
CmdUtils.CreateCommand({
  names: ["check google calendar"],
  argument: {object: noun_type_date},
  serviceDomain: "calendar.google.com",
  icon : "chrome://ubiquity/skin/icons/calendar.png",
  description: "Checks what events are on your calendar for a given date.",
  help: 'Try issuing "check on thursday"' + Apology,
  execute: function gcale_execute({object: {data}}) {
    Utils.openUrlInBrowser(GCalendar + Utils.paramsToString(dateParam(data)));
  },
  // url is for recursing pagination
  preview: function gcale_preview(pblock, args, url) {
    var date = args.object.data, me = this;
    if (!date) {
      pblock.innerHTML = this.description;
      return;
    }
    pblock.innerHTML = _("Checking Google Calendar for events on ${date}.",
                         {date: date.toString("dddd, dS MMMM, yyyy")});
    CmdUtils.previewGet(
      pblock,
      url || GCalendar + "m",
      dateParam(date),
      function getCalendar(htm) {
        var [cal] = /<div class[^]+$/(htm) || 0;
        if (!cal) {
          pblock.innerHTML = _(
            'Please <a href="${url}" accesskey="L">Login</a>.', this);
          return;
        }
        var $c = $('<div class="calendar">' + cal).eq(0);
        $c.find(".c1:nth(1)").remove();
        $c.find("form").parent().remove();
        $c.find("div[class] > span:first-child").css({
          fontWeight: "bold",
          display: "inline-block",
          margin: "1ex 0 0.5ex",
        });
        CmdUtils.absUrl($c, this.url);
        linksToButtons($c.find(".c1 > a"));
        $c.find("button").focus(function btn() {
          this.blur();
          this.disabled = true;
          gcale_preview.call(me, pblock, args, this.value);
          return false;
        });
        pblock.innerHTML = "";
        $c.appendTo(pblock);
      },
      "text");
  },
});
