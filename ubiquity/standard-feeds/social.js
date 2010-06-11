Cu.import("resource://ubiquity/modules/oauth.js");

/* TODO
From Abi:
	I think the ones I most often use would be to check the current status
	of a specific friend (or maybe, the last 3 statuses). The ability to
	check your friends timeline as a whole would also be nice.
*/

// http://apiwiki.twitter.com/Twitter-REST-API-Method%3A-statuses%C2%A0update
// "Statuses over 140 characters will cause a 403 error from the API"
const TWITTER_STATUS_MAXLEN = 140;

// TODO should there also be a "share" overlord verb with
// providers "using twitter", "using digg", etc.

CmdUtils.CreateCommand({
  names: ["twitter", "tweet", "share using twitter"],
  description: (
    "Sets your Twitter status to a message of at most " +
    TWITTER_STATUS_MAXLEN + " characters."),
  help: ("You'll need a <a href=\"http://twitter.com\">Twitter account</a>," +
         " obviously.  If the account isn't already authorized," +
         " you'll be asked for password."),
  icon: "chrome://ubiquity/skin/icons/twitter.ico",
  arguments: [
    {role: "object", label: _("status"), nountype: noun_arb_text},
    {role: "alias",  label: _("user"),   nountype: noun_type_twitter_user}],
  preview: function twitter_preview(previewBlock, args) {
    var statusText = args.object.text;
    if (!statusText) return void this.previewDefault(previewBlock);

    var username = args.alias.text || (Bin.twitterLastLogin() || 0).username;
    var remaining = TWITTER_STATUS_MAXLEN - statusText.length;
    var previewTemplate = (
      _("Updates Twitter status of ${username} to:") +
        "<p><strong class='status'>${status}</strong></p>" +
      _("Characters remaining: ${chars}") +
      (remaining >= 0 ? "" :
       "<br/><strong class='warning'>" +
       _("The last ${truncate} characters will be truncated!",
         {truncate: "<b class='truncate'>" + -remaining + "</b>"}) +
       "</strong>") +
      "<p><small>" +
      _("tip: tweet @mozillaubiquity for help") +
      "</small></p>");

    previewBlock.innerHTML = (
      "<div class='twitter'>" +
      CmdUtils.renderTemplate(previewTemplate, {
        status: Utils.escapeHtml(statusText),
        username: ("<b class='username'>" +
                   (username ? Utils.escapeHtml(username) : "??") + "</b>"),
        chars: "<b class='remaining'>" + remaining + "</b>",
      }) +
      "</div>");
  },
  execute: function twitter_execute({object: {text}, alias}) {
    var me = this;
    if (!text) return me._show(_("requires a status to be entered"));

    var login = alias.data || Bin.twitterLastLogin() || {};
    me._auth(login, function twitter_tweet(username, key, secret) {
      me._post({
        url: "https://twitter.com/statuses/update.json",
        data: {status: text = text.slice(0, TWITTER_STATUS_MAXLEN)},
        dataType: "json",
        success: function twitter_success(res) {
          me._show(
            text, username, text === res.text && function twitter_onclick() {
              Utils.openUrlInBrowser(
                "http://twitter.com/" + username + "/status/" + res.id);
            });
        },
        error: function twitter_error(xhr) {
          me._show(_("error - status not updated") + " / " +
                   xhr.status + " " + xhr.statusText,
                   username);
        },
      }, {token: key, tokenSecret: secret});
      Bin.twitterLastLogin({username: username, password: "dummy"});
    });
  },
  _show: function twitter_show(text, user, cb) {
    var title = this.name;
    if (user) title += " \u2013 " + user;
    displayMessage({icon: this.icon, title: title, text: text, onclick: cb});
  },
  _post: function twitter_post(settings, accessor) {
    settings.type = "POST";
    accessor.consumerKey    = "C6h2HUUjmOcqXTtPRYqAVg";
    accessor.consumerSecret = "AYNHPfkpm5lL3uPKXRCuzGFYItA8EOWlrkajyEBOd6s";
    return $.ajax(OAuth.completeAjaxSettings(settings, accessor));
  },
  _auth: function twitter_auth({username, password}, cb) {
    username = username && username.toLowerCase();
    for each (let saved in CmdUtils.retrieveLogins("TwitterOAuth")) {
      if (saved.username !== username) continue;
      let [key, secret] = saved.password.split(" ");
      return cb.call(this, username, key, secret);
    }
    const APIURL = "https://api.twitter.com/oauth/access_token";
    if (!username || !password) {
      let un = {value: username || ""};
      let pw = {value: password || ""};
      let ok = Utils.PromptService.promptUsernameAndPassword(
        context.chromeWindow, this.name, APIURL, un, pw, null, {});
      if (!ok || !un.value || !pw.value) return;
      username = un.value.toLowerCase();
      password = pw.value;
    }
    var me = this;
    this._post({
      url: APIURL,
      data: {
        x_auth_mode: "client_auth",
        x_auth_username: username,
        x_auth_password: password,
      },
      success: function twitter_xAuth_success(res) {
        var {oauth_token, oauth_token_secret} = Utils.urlToParams(res);
        CmdUtils.savePassword({
          name: "TwitterOAuth",
          username: username,
          password: oauth_token + " " + oauth_token_secret,
        });
        cb.call(me, username, oauth_token, oauth_token_secret);
      },
      error: function twitter_xAuth_error(xhr) {
        var status = xhr.status + " " + xhr.statusText;
        Cu.reportError("Twitter xAuth for " + username + ": " + status);
        me._show(status, username);
      },
    }, {});
  },
});

// TODO this should take arguments -- url (defaulting to current page)
// optional commentary, and alias?
CmdUtils.CreateCommand({
  names: ["digg","share using digg"],
  icon: "chrome://ubiquity/skin/icons/digg.ico",
  homepage: "http://www.gialloporpora.netsons.org",
  description: "If not yet submitted, submits the page to Digg. Otherwise, it takes you to the story's Digg page.",
  author: { name: "Sandro Della Giustina", email: "sandrodll@yahoo.it"},
  license: "MPL,GPL",
  execute: function() {
    var win = CmdUtils.getWindow();
    var sel = win.getSelection().toString().slice(0, 375);
    Utils.openUrlInBrowser("http://digg.com/submit" +
                           Utils.paramsToString({
                             phase: "2",
                             url: win.location.href,
                             title: win.document.title,
                             bodytext: sel,
                           }));
  },
  preview: function(pblock) {
    var win = CmdUtils.getWindow();
    var selected_text = win.getSelection() + "";
    var api_url='http://services.digg.com/stories';

    var params = Utils.paramsToString({
      appkey: "http://www.gialloporpora.netsons.org",
      link: win.location.href,
    });

    var html= _('Submit or digg this page. Checking if this page has already been submitted...');
    pblock.innerHTML = html;

    CmdUtils.previewAjax(pblock, {
      type: "GET",
      url: api_url+params,
      error: function(){
        //pblock.innerHTML= 'Digg API seems to be unavailable or the URI is incorrect.<br/>';
      },
      success: function(xml){
        var el = jQuery(xml).find("story");
        var diggs = el.attr("diggs");

        if (diggs == null){
          html = _('Submit this page to Digg');
          if (selected_text.length > 0) {
            html = _("Submit this page to Digg with the description:")+"<br/> <i style='padding:10px;color: #CCC;display:block;'>" + selected_text + "</i>";
            if (selected_text.length > 375){
              html +='<br/> '+_('Description can only be 375 characters. The last <b>${chars}</b> characters will be truncated.',{chars:(selected_text.length - 375)});
            }
          }
        } else {
          html = _('Digg this page. This page already has <b>${diggs}</b> diggs.',{diggs:diggs});
        }
        pblock.innerHTML = html;
      }
    });
  }
});

CmdUtils.CreateCommand({
  names: ["tinyurl"],
  arguments: noun_type_url,
  icon: "chrome://ubiquity/skin/icons/tinyurl.ico",
  description: ("Replaces the selected URL with a " +
                "<a href=\"http://www.tinyurl.com\">TinyURL</a>."),
  preview: function(pblock, {object: {text}}){
    if (!text) {
      pblock.innerHTML = this.description;
      return;
    }
    var me = this;
    pblock.innerHTML = _("Replaces the selected URL with...");
    CmdUtils.previewGet(pblock, this._api(text), function(tinyUrl) {
      if(tinyUrl !== "Error")
        pblock.innerHTML = _("Replaces the selected URL with <b>${tinyurl}</b>.",
                             {tinyurl:me._link(tinyUrl)});
    });
  },
  execute: function(args) {
    var me = this;
    jQuery.get(this._api(args.object.text), function(tinyUrl) {
      CmdUtils.setSelection(me._link(tinyUrl), {text: tinyUrl});
      Utils.clipboard.text = tinyUrl;
    });
  },
  _api: function(url)("http://tinyurl.com/api-create.php?url=" +
                      encodeURIComponent(url)),
  _link: function(url) {
    var eu = Utils.escapeHtml(url);
    return eu.link(eu);
  },
});

/**
 * share-on-delicious - an Ubiquity command for sharing bookmarks on
 * delicious.com
 *
 * l.m.orchard@pobox.com
 * http://decafbad.com/
 * Share and Enjoy!
 *
 * TODO: convert to use xhtml templates
 * TODO: work out how to use suggested tags in the UI
 * TODO: enforce the 1000 character notes limit with a counter
 * TODO: wrap selected text in quotes, typed notes without
 * TODO: implement modifier to support private posting
 * TODO: handle error codes from delicious, not just HTTP itself
 */
var cookie_mgr = (
  Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager));

CmdUtils.CreateCommand({
  names: ["share on delicious", "delicious"],
  icon: "chrome://ubiquity/skin/icons/delicious.ico",
  description: 'Share the current page as a bookmark on delicious.com',
  help: (
    'Select text on the page to use as notes, or enter your own ' +
    'text after the command word.  You can also assign tags to the '+
    'bookmark with the "tagged" modifier, and alter the bookmark ' +
    'default page title with the "entitled" modifier.  Note that ' +
    'you must also already be logged in at delicious.com to use ' +
    'this command.'),
  homepage: 'http://decafbad.com',
  author: {
    name: 'Leslie Michael Orchard',
    email: 'l.m.orchard@pobox.com',
  },
  license: 'MPL/GPL/LGPL',
  arguments: {
    object_notes: noun_arb_text,
    alias_title: noun_arb_text,
    instrument_tags: noun_arb_text,
  },

  /**
   * Command configuration settings.
   */
  _config: {
    // Base URL for the delicious v1 API
    api_base:      'https://api.del.icio.us',
    // Domain and name of the delicious login session cookie.
    cookie_domain: '.delicious.com',
    cookie_name:   '_user',
  },

  /**
   * Present a preview of the bookmark under construction during the course
   * of composing the command.
   */
  preview: function(pblock, args) {
    var bm          = this._extractBookmarkData(args);
    var user_cookie = this._getUserCookie();
    var user_name   = (user_cookie) ? user_cookie.split(' ')[0] : '';

    var ns = { user_name: user_name, bm: bm };

    var tmpl;

    var delicious = '<img src="http://delicious.com/favicon.ico"> '
      +'<b><a style="color: #3774D0" href="http://delicious.com">delicious.com</a></b>';

    if (!bm.bookmarkable) {
      tmpl = '<p class="error">'
        + _('This URL cannot be shared on ${delicious}.',{delicious:delicious})
          + '</p>';
    } else if (!user_name) {

      // If there's no user name, there's no login, so this command won't work.
      tmpl = '<p class="error">' +
        _("No active user found - log in at ${delicious} to use this command.",
          {delicious:delicious})
          + '</p>';

    } else if (!bm.description) {

      // If there's no title, somehow, then this is an error too.
      tmpl = '<p style="color: #d44">'
        + _("A title is required for bookmarks on ${delicious}",
            {delicious:'<b><a style="color: #3774D0" href="http://delicious.com">delicious.com</a></b>'})
          + '</p>';

    } else {

      delicious = '<img src="http://delicious.com/favicon.ico"> '
        +'<b><a href="http://delicious.com/${user_name}">delicious.com/${user_name}</a></b>';

      // Attempt to construct a vaguely delicious-esque preview of a bookmark.
      tmpl = [
        '<style type="text/css">',
        '.preview a { color: #3774D0 }',
        '.del-bookmark { font: 12px arial; color: #ddd; background: #eee; line-height: 1.25em }',
        '.del-bookmark a.title { color: #1259C7 }',
        '.del-bookmark .full-url { color: #396C9B; font-size: 12px; display: block; padding: 0.25em 0 }',
        '.del-bookmark .notes { color: #4D4D4D }',
        '.del-bookmark .tags { color: #787878; padding-top: 0.25em; text-align: right }',
        '</style>',
        '<div class="preview">',
        '<p>'+_('Share a bookmark at ${delicious}:', {delicious:delicious})+'</p>',
        '<div class="del-bookmark">',
        '<div style="padding: 1em;">',
        '<a class="title" href="${bm.url}">${bm.description}</a>',
        '<a class="full-url" href="${bm.url}">${bm.url}</a>',
        bm.extended ?
        '<div class="notes">${bm.extended}</div>' : '',
        bm.tags ?
        '<div class="tags"><span>tags:</span> ${bm.tags}</div>' : '',
        '</div>',
        '</div>'
        ].join("\n");

    }

    pblock.innerHTML = CmdUtils.renderTemplate(tmpl, ns);
  },

  /**
   * Attempt to use the delicious v1 API to post a bookmark using the
   * command input
   */
  execute: function(args) {
    var bm          = this._extractBookmarkData(args);
    var user_cookie = this._getUserCookie();
    var user_name   = (user_cookie) ? user_cookie.split(' ')[0] : '';

    if (!bm.bookmarkable) {
      displayMessage(_('This URL cannot be shared on delicious.'));
      return false;
    }

    if (!user_name) {
      // If there's no user name, there's no login, so this command won't work.
      displayMessage(_('No active user found - log in at delicious.com to use this command.'));
      return false;
    }

    if (!bm.description) {
      // If there's no title, somehow, then this is an error too.
      displayMessage(_("A title is required for bookmarks at delicious.com"));
      return false;
    }

    var path = '/v1/posts/add';
    var url  = this._config.api_base + path;
    var req = XMLHttpRequest();

    req.open('POST', url, true);

    var _this = this;
    var onload, onerror;

    req.onload = onload = function(ev) {
      displayMessage(
        _('Bookmark "${description}" shared at delicious.com/${user_name}',
          {description: bm.description, user_name: user_name}));
    }

    req.onerror = onerror = function(ev) {
      // TODO: more informative reporting on errors
      displayMessage(_('ERROR: Bookmark "${description}" NOT shared on delicious.com/${user_name}',{description:bm.description,user_name:user_name}));
    }

    // TODO: implement timeout here, in case requests take too long.

    req.setRequestHeader('Authorization', 'Basic Y29va2llOmNvb2tpZQ=='); // btoa('cookie:cookie')
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    var mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].
      getService(Components.interfaces.nsIWindowMediator);
    var win = mediator.getMostRecentWindow(null);
    var user_agent = win.navigator.userAgent + ";Ubiquity-share-on-delicious";

    req.setRequestHeader("User-Agent", user_agent);
    req.send($.param(bm));
  },

  /**
   * Given input data and modifiers, attempt to assemble data necessary to
   * post a bookmark.
   */
  _checkBookmarkable: new RegExp('^https?://'),
  _extractBookmarkData: function(args) {
    return {
      _user:
      this._getUserCookie(),
      url:
      context.focusedWindow.location,
      bookmarkable:
      this._checkBookmarkable.test(context.focusedWindow.location),
      description:
      args.alias.text || context.focusedWindow.document.title,
      extended:
      args.object.text ? '"' + args.object.text + '"' : '',
      tags:
      args.instrument.text
      };
  },

  /**
   * Dig up the Delicious login session cookie.
   */
  _getUserCookie: function() {
    var iter = cookie_mgr.enumerator;
    while (iter.hasMoreElements()) {
      var cookie = iter.getNext();
      if (cookie instanceof Ci.nsICookie &&
          cookie.host.indexOf(this._config.cookie_domain) !== -1 &&
          cookie.name === this._config.cookie_name) {
        return decodeURIComponent(cookie.value);
      }
    }
  },
});
