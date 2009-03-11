
var gmailAppsDomain="";

CmdUtils.CreateCommand({
  name: "detect-gmail-apps-domain",
  execute: function (){
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
  
  for( domain in domains){
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
  var window = Application.activeWindow;

  var gmailURL = "://mail.google.com";
  var currentLocation = String(Application.activeWindow.activeTab.document.location);
  if(currentLocation.indexOf(gmailURL) != -1) {
    return Application.activeWindow.activeTab;
  }

  for (var i = 0; i < window.tabs.length; i++) {
    var tab = window.tabs[i];
    var location = String(tab.document.location);
    if (location.indexOf(gmailURL) != -1) {
      return tab;
    }
  }
  return null;
}

CmdUtils.CreateCommand({
  name: "email",
  synonyms: ["mail.yahoo.com", "gmail.com", "hotmail.com", "email.comcast"],
  takes: {"message": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/email.png",
  modifiers: {to: noun_type_contact},
  description:"Begins composing an email to a person from your contact list.",
  help:"Currently only works with <a href=\"http://mail.google.com\">Google Mail</a>, so you'll need a Gmail account to use it." +
       " Try selecting part of a web page (including links, images, etc) and then issuing &quot;email this&quot;.  You can" +
       " also specify the recipient of the email using the word &quot;to&quot; and the name of someone from your contact list." +
       " For example, try issuing &quot;email hello to jono&quot; (assuming you have a friend named &quot;jono&quot;).",
  preview: function(pblock, directObj, modifiers) {
    var html = "Creates an email message ";
    if (modifiers.to) {
      html += "to " + modifiers.to.text + " ";
    }
    if (directObj.html) {
      html += "with these contents:" + directObj.html;
    } else {
      html += "with a link to the current page.";
    }
    pblock.innerHTML = html;
  },

  execute: function(directObj, headers) {
    var html = directObj.html;
    var document = context.focusedWindow.document;
    var title;
    var toAddress = "";
    if (document.title)
      title = document.title;
    else
      title = html;
    var location = document.location;
    var gmailTab = findGmailTab();
    var pageLink = "<a href=\"" + location + "\">" + title + "</a>";
    if (html) {
      html = ("<p>From the page " + pageLink + ":</p>" + html);
    } else {
      // If there's no selection, just send the current page.
      html = "<p>You might be interested in " + pageLink + ".</p>";
    }

    title = "'" + title + "'";
    if (headers.to)
      if (headers.to.text)
	toAddress = headers.to.text;

    if (gmailTab) {
      // Note that this is technically insecure because we're
      // accessing wrappedJSObject, but we're only executing this
      // in a Gmail tab, and Gmail is trusted code.
      var console = gmailTab.document.defaultView.wrappedJSObject.console;
      var gmonkey = gmailTab.document.defaultView.wrappedJSObject.gmonkey;

      var continuer = function() {
        // For some reason continuer.apply() won't work--we get
        // a security violation on Function.__parent__--so we'll
        // manually safety-wrap this.
	try {
          var gmail = gmonkey.get("1.0");
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
          displayMessage({text: "A gmonkey exception occurred.",
                          exception: e});
        }
      };

      gmonkey.load("1.0", continuer);
    } else {
      // No Gmail tab open?  Open a new one:
      var params = {fs:1, tf:1, view:"cm", su:title, to:toAddress, body:html};
      Utils.openUrlInBrowser("http://mail.google.com/mail/?" +
			     Utils.paramsToString(params));
    }
  }
});

function gmailChecker(callback, service) {
  
  var url = "http://mail.google.com/mail/feed/atom";
  if(service == "googleapps"){
    url = "http://mail.google.com/a/" + getGmailAppsDomain() + "/feed/atom";
  }
      
  Utils.ajaxGet(url, function(rss) {
    CmdUtils.loadJQuery(function(jQuery) {
      var emailDetails = {
        account: jQuery(rss).children("title").text().split(" ").pop()
      };

      var firstEntry = jQuery(rss).find("entry").get(0);
      if (firstEntry) {
        emailDetails.lastEmail = {
          author: jQuery(firstEntry).find("author > name").text(),
          subject: subject = jQuery(firstEntry).find("title").text(),
          summary: jQuery(firstEntry).find("summary").text(),
          href: jQuery(firstEntry).find("link").attr("href")
        };
      }
      callback(emailDetails);
    });
  });
}

CmdUtils.CreateCommand({
  name: "last-email-from",
  takes: {"email service": noun_type_emailservice},
  icon: "chrome://ubiquity/skin/icons/email_open.png",
  description: "Displays your most recent incoming email.  Requires a <a href=\"http://mail.google.com\">Google Mail</a> account.",
  preview: function( pBlock , arg) {
    pBlock.innerHTML = "Displays your most recent incoming email...";
    // Checks if user is authenticated first - if not, do not ajaxGet, as this triggers authentication prompt
    if (Utils.getCookie("mail.google.com", "S") != undefined) {
      gmailChecker(function(emailDetails) {
        var previewTemplate = "<b>You (${account}) have no new mail</b>";
        if (emailDetails.lastEmail) {
          var previewTemplate = "Last unread e-mail for ${account}:" +
            "<a href=\"${lastEmail.href}\">" +
            "<p><b>${lastEmail.author}</b> says: <b>${lastEmail.subject}</b></p>" +
            "<p>${lastEmail.summary}</p>" +
            "</a>";
        }
        pBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, emailDetails);
      }, arg.text);
    } else {
      pBlock.innerHTML = "You are not logged in!<br />Press enter to log in.";
    }
  },
  execute: function(arg) {
    gmailChecker(function(emailDetails) {
      var msgTemplate = "You (${account}) have no new mail.";
      if (emailDetails.lastEmail) {
        msgTemplate = "You (${account}) have new email! ${lastEmail.author} says: ${lastEmail.subject}";
      }
      displayMessage(CmdUtils.renderTemplate(msgTemplate, emailDetails));
    }, arg.text);
  }
});

CmdUtils.CreateCommand({
  name: "get-email-address",
  icon: "chrome://ubiquity/skin/icons/email.png",
  description: "Looks up the email address of a person from your contacts list given their name.",
  takes: {name: noun_type_contact},
  preview: function( pBlock, name ) {
    if (name.text)
      pBlock.innerHTML = name.text;
    else
      pBlock.innerHTML = "Looks up an email address from your contacts list.";
  },
  execute: function( name ) {
    displayMessage(name.text);
  }
});