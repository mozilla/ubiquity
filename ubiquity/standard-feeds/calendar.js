const Apology = ("<p>" +
                 "Currently, only works with " +
                 "Google Calendar".link("http://calendar.google.com") +
                 " so you'll need a Google account to use it." +
                 "</p>");

CmdUtils.CreateCommand({
  names: ["add to google calendar", "quick add"],
  argument: {object_event: noun_arb_text},
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
  execute: function (args) {
    function needLogin() {
      this._say(_("Authorization error"),
              _("Please make sure you are logged in to Google Calendar"));
    }
  
    var event = args.object.text;
    var authKey = Utils.getCookie(".www.google.com", "CAL");
    if (!authKey) {
      needLogin();
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
  preview: function (pb, {object: {html}}) {
    pb.innerHTML = (html && "<b>" + html + "</b><br/><br/>") + this.help;
  },
  _say: function(title, text) {
    displayMessage({
      icon: this.icon,
      title: this.name + ": " +  title,
      text: text,
    });
  }
});

function linkToButton() {
  var txt = this.textContent;
  jQuery(this).replaceWith(
    <button value={this.href} accesskey={txt[0]}>{txt}</button>.toXMLString());
}

// TODO this should take a plugin argument specifying the calendar provider.
CmdUtils.CreateCommand({
  names: ["check google calendar"],
  argument: {object: noun_type_date},
  icon : "chrome://ubiquity/skin/icons/calendar.png",
  description: "Checks what events are on your calendar for a given date.",
  help: 'Try issuing "check on thursday"' + Apology,
  execute: function({object: {data}}) {
    Utils.openUrlInBrowser("http://www.google.com/calendar/" +
                           Utils.paramsToString(this._param(data)));
  },
  // url is for recursing pagination
  preview: function preview(pblock, args, url) {
    var date = args.object.data, me = this;
    if (!date) {
      pblock.innerHTML = this.description;
      return;
    }
    pblock.innerHTML = (_("Checking Google Calendar for events on ${date}.",
                          {date: date.toString("dddd, dS MMMM, yyyy")}));
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
          me.preview(pblock, args, this.value);
          return false;
        });
        pblock.innerHTML = "";
        $c.appendTo(pblock);
      },
      "text");
  },
  _param: function(date)({as_sdt: date.toString("yyyyMMdd")}),
});
