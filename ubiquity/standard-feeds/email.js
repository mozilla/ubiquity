var gmailAppsDomain = "";

CmdUtils.CreateCommand({
  name: "detect-gmail-apps-domain",
  execute: function() {
    if (gmailAppsDomain.length == 0) {
      getGmailAppsDomain();
    }
    if (gmailAppsDomain.secure) {
      displayMessage( "secure " + gmailAppsDomain );
    } else {
      displayMessage( "insecure " + gmailAppsDomain );
    }
  }
});

function getGmailAppsDomain() {
  // looks for and returns the gmail-for-apps domain
  // as well as caches it for next time

  var gmailAppsURL = "://mail.google.com/a/";
  // return from cache
  if (gmailAppsDomain.length > 0) {
    return gmailAppsDomain;
  }

  // look in cookie
  var secure = false;
  var secCookie = Utils.getCookie("mail.google.com", "GXAS");
  if (secCookie == undefined) {
    secCookie = Utils.getCookie("mail.google.com", "GXAS_SEC");
    secure = true;
  }

  if (secCookie != undefined) {
    // cookie is of the form hosted-domain.com=DQAAAH4AA....
    var domain = secCookie.split("=")[0];
    if (domain != undefined && domain.length > 0) {
      gmailAppsDomain = domain;
      gmailAppsDomain.secure = secure;
      return gmailAppsDomain;
    }
  } else {
    // no cookie but look in open tabs
    var tab = findGmailTab();
    if (tab != undefined) {
      var location = String(tab.document.location);
      if (location.indexOf(gmailAppsURL) != -1) {
        gmailAppsDomain = extractGmailAppsDomain(location);
        gmailAppsDomain.secure = (location.indexOf("https://") == 0);
      }
    }
  }

  return gmailAppsDomain;
}

function extractGmailAppsDomain(URL) {
  // given a URL, will find the gmail apps domain part of it
  if (gmailAppsDomain.length > 0) {
    return gmailAppsDomain;
  }
  var gmailAppsURL = "://mail.google.com/a/";
  var index = URL.indexOf(gmailAppsURL);
  if (index != -1) {
    var domain = URL.slice(index+gmailAppsURL.length);
    domain = domain.slice(0,domain.indexOf("/"));
    if (domain != null && domain.length > 0) {
      return domain;
    }
  }
  return "none";
}


// TODO: Should also use the mailto application mapping.
// TODO: support Google Apps
function detectEmailProvider() {
  var domains = {
    "mail.google.com":0,
    "mail.yahoo.com":0,
    "mail.aol.com":0,
    "hotmail.com":0,
  }

  var max = { domain: "", hits: 0 };
  totalHits = 0;

  for(var domain in domains){
    hits = Utils.History.visitsToDomain( domain );
    domains[domain] = hits;
    totalHits += hits;

    if( max.hits <= hits ) {
      max.domain = domain;
      max.hits = hits;
    }

  }

  max.ratio = max.hits / totalHits;

  if( max.ratio > .75 )
    return max.domain;
  return null;
}

CmdUtils.CreateCommand({
  name: "detect-email-provider",
  execute: function (){
    displayMessage( detectEmailProvider() );
  }
});


function findGmailTab() {
  var win = Application.activeWindow;
  for each (var tab in [win.activeTab].concat(win.tabs))
    if (/^https?:\/\/mail\.google\.com\/mail\/(?:[?#]|$)/
        .test(tab.document.URL))
      return tab;
  return null;
}

CmdUtils.CreateCommand({
  names: {
    en: ["email", "mail"], 
    ja: ["メールする", "メールして", "メールしろ",
         "送信する", "送信して", "送信しろ",
         "そうしんして", "そうしんして", "そうしんしろ"],
  },
  arguments: [
    {role: "object", label: "message", nountype: noun_arb_text},
    {role: "goal", nountype: noun_type_contact}
  ],
  icon: "chrome://ubiquity/skin/icons/email.png",
  description: "Begins composing an email to a person from your contact list.",
  help: "" + (
    <>Currently only works with <a href="http://mail.google.com">Google Mail</a>,
    so you&#39;ll need a Gmail account to use it.<br/>
    Try selecting part of a web page (including links, images, etc)
    and then issuing "email this".<br/>
    You can also specify the recipient of the email using the word "to"
    and the name of someone from your contact list.
    For example, try issuing "email hello to jono"
    (assuming you have a friend named "jono").</>),
  preview: function(pblock, args) {
    var html = "Creates an email message ";
    var goal = args.goal || args.to;
    if (goal) {
      html += "to " + goal.text + " ";
    }
    if (args.object) {
      html += "with these contents:" + args.object.html;
    } else {
      html += "with a link to the current page.";
    }
    pblock.innerHTML = html;
  },

  execute: function(args) {
    var {title, URL} = context.focusedWindow.document;
    // #574: no one I tested liked the stock "You might be interested in"
    //       just offer a link and the selected text.
    var html = ((<p><a href={URL}>{title}</a></p> + "\n") +
                ((args.object || 0).html || ""));
    title = "'" + title + "'";

    var goal = args.goal || args.to;
    var toAddress = goal ? goal.text : "";

    var gmailTab = findGmailTab() || 0;
    // Note that this is technically insecure because we're
    // accessing wrappedJSObject, but we're only executing this
    // in a Gmail tab, and Gmail is trusted code.
    var {gmonkey} = gmailTab && gmailTab.document.defaultView.wrappedJSObject;
    if (!gmonkey) {
      // No Gmail  tab open?  Open a new one:
      var params = {fs:1, tf:1, view:"cm", su:title, to:toAddress, body:html};
      Utils.openUrlInBrowser("http://mail.google.com/mail/" +
                             Utils.paramsToString(params));
      return;
    }
    gmonkey.load("1.0", function continuer(gmail) {
      // For some reason continuer.apply() won't work--we get
      // a security violation on Function.__parent__--so we'll
      // manually safety-wrap this.
      try {
        var sidebar = gmail.getNavPaneElement();
        var composeMail = sidebar.getElementsByTagName("span")[0];
        //var composeMail = sidebar.getElementById(":qw");
        var event = composeMail.ownerDocument.createEvent("Events");
        event.initEvent("click", true, false);
        composeMail.dispatchEvent(event);
        var active = gmail.getActiveViewElement();
        var toField = composeMail.ownerDocument.getElementsByName("to")[0];
        toField.value = toAddress;
        var subject = active.getElementsByTagName("input")[0];
        if (subject) subject.value = title;
        var iframe = active.getElementsByTagName("iframe")[0];
        if (iframe)
          iframe.contentDocument.execCommand("insertHTML", false, html);
        else {
          var body = composeMail.ownerDocument.getElementsByName("body")[0];
          html = ("Note: the following probably looks strange because " +
                  "you don't have rich formatting enabled.  Please " +
                  "click the 'Rich formatting' link above, discard " +
                  "this message, and try " +
                  "the email command again.\n\n" + html);
          body.value = html;
        }
        gmailTab.focus();
      } catch (e) {
        displayMessage({
          text: "A gmonkey exception occurred.",
          exception: e});
      }
    });
  }
});

function gmailChecker(callback, service) {
  var url = "https://mail.google.com/mail/feed/atom";
  if(service == "googleapps"){
    url = "https://mail.google.com/a/" + getGmailAppsDomain() + "/feed/atom";
  }
  jQuery.get(url, null, function(atom) {
    var emailDetails = {};
    var firstEntry = jQuery("entry:first", atom);
    if (firstEntry.length)
      emailDetails.lastEmail = {
        author: firstEntry.find("author > name").text(),
        subject: firstEntry.find("title").text(),
        summary: firstEntry.find("summary").text(),
        href: firstEntry.find("link").attr("href"),
      };
    callback(emailDetails);
  }, "xml");
}

CmdUtils.CreateCommand({
  name: "last-email-from",
  takes: {"email service": noun_type_emailservice},
  icon: "chrome://ubiquity/skin/icons/email_open.png",
  description: ("Displays your most recent incoming email. Requires a " +
                '<a href="http://mail.google.com">Gmail</a> account.'),
  preview: function(pBlock, arg) {
    pBlock.innerHTML = "Displays your most recent incoming email...";
    // Checks if user is authenticated first
    // if not, do not ajaxGet, as this triggers authentication prompt
    if (Utils.getCookie(".mail.google.com", "GX")) {
      gmailChecker(function(emailDetails) {
        var previewTemplate = (
          emailDetails.lastEmail
          ? ("Last unread e-mail: <a href=\"${lastEmail.href}\">" +
             "<p><b>${lastEmail.author}</b> says: " +
             "<b>${lastEmail.subject}</b></p>" +
             "<p>${lastEmail.summary}</p>" +
             "</a>")
          : "<b>You have no new mail!</b>");
        pBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate,
                                                   emailDetails);
      }, arg.text);
    } else {
      pBlock.innerHTML = "You are not logged in!<br />Press enter to log in.";
    }
  },
  execute: function(arg) {
    gmailChecker(function(emailDetails) {
      var msgTemplate = "You have no new mail.";
      if (emailDetails.lastEmail) {
        msgTemplate = ("You have new email! ${lastEmail.author} says: " +
                       "${lastEmail.subject}");
      }
      displayMessage(CmdUtils.renderTemplate(msgTemplate, emailDetails));
    }, arg.text);
  }
});

CmdUtils.CreateCommand({
  name: "get-email-address",
  icon: "chrome://ubiquity/skin/icons/email.png",
  description: ("Looks up the email address of a person " +
                "from your contacts list given their name. " +
                "Execute to copy the address."),
  takes: {name: noun_type_contact},
  execute: function({text}) {
    CmdUtils.copyToClipboard(text);
    displayMessage({icon: this.icon, title: this.name, text: text});
  },
  preview: function(pbl, {html}) {
    pbl.innerHTML = html || this.description;
  },
});
