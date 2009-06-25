/* TODO
From Abi:
	I think the ones I most often use would be to check the current status
	of a specific friend (or maybe, the last 3 statuses). The ability to
	check your friends timeline as a whole would also be nice.
*/

// max of 140 chars is recommended, but it really allows 160...
// but that gets truncated on some displays? grr
const TWITTER_STATUS_MAXLEN = 140;

// TODO should there also be a "share" overlord verb with
// providers "using twitter", "using digg", etc.

CmdUtils.CreateCommand({
  names: ["twitter", "tweet", "share using twitter"],
  //ja: ["呟く","呟け","呟いて","つぶやく","つぶやけ","つぶやいて"]
  arguments: [
    {role: "object", label: 'status', nountype: noun_arb_text},
    {role: "alias", nountype: noun_type_twitter_user}
  ],
  icon: "http://twitter.com/favicon.ico",
  description:
  "Sets your Twitter status to a message of at most 160 characters.",
  help: ("You'll need a <a href=\"http://twitter.com\">Twitter account</a>," +
         " obviously.  If you're not already logged in" +
         " you'll be asked to log in."),
  preview: function(previewBlock, args) {
    var statusText = (args.object ? args.object.text : '');
    var usernameText = "";
    if (args.alias) {
      usernameText = args.alias.text;
    } else if (args.as) {
      usernameText = args.as.text;
    }
    var previewTemplate = (
      "<div class='twitter'>"+_("Updates your Twitter status ${username} to:")+"<br/>" +
      "<b class='status'>${status}</b><br/><br/>" +
      _("Characters remaining: <b>${chars}</b>") +
      "<p><small>"+_("tip: tweet @mozillaubiquity for help")+"</small></p></div>");
    var truncateTemplate = (
      "<strong>"+_("The last <b>${truncate}</b> characters will be truncated!")+"</strong>");
    var previewData = {
      status: <>{statusText}</>.toXMLString(),
      username: usernameText && _("(For user <b>${usernameText}</b>)"),
      chars: TWITTER_STATUS_MAXLEN - statusText.length
    };

    var previewHTML = CmdUtils.renderTemplate(
                        CmdUtils.renderTemplate(previewTemplate, previewData),
                        {usernameText:usernameText});

    if (previewData.chars < 0) {
      var truncateData = {
        truncate: 0 - previewData.chars
      };

      previewHTML += CmdUtils.renderTemplate(truncateTemplate, truncateData);
    }

    previewBlock.innerHTML = previewHTML;
  },
  execute: function(args) {
    var statusText = args.object.text;
    if(statusText.length < 1) {
      this._show(_("requires a status to be entered"));
      return;
    }

    var updateUrl = "https://twitter.com/statuses/update.json";
    var updateParams = {
      source: "ubiquity",
      status: statusText
      //dont cut the input since sometimes, the user selects a big url,
      //and the total lenght is more than 140, but tinyurl takes care of that
    };
    var me = this;

    function sendMessage() {
      jQuery.ajax({
        type: "POST",
        url: updateUrl,
        data: updateParams,
        dataType: "json",
        error: function() {
          me._show(_("error - status not updated"));
        },
        success: function() {
          me._show(/^d /.test(statusText)
                   ? _("direct message sent")
                   : _("status updated"));
        },
        username: login.username,
        password: login.password
      });
    }

    var login;
    var alias = args.alias;
    if (alias && alias.text && alias.data) {
      login = alias.data;
      sendMessage();
    } else {
      login = {username: null,
               password: null};
      if (alias && alias.text)
        login.username = alias.text;
      sendMessage();
    }
  },
  _show: function(txt){
    displayMessage({icon: this.icon, title: this.name, text: txt});
  }
});

// TODO this should take arguments -- url (defaulting to current page)
// optional commentary, and alias?
CmdUtils.CreateCommand({
  names: ["digg","share using digg"],
  icon: "http://digg.com/favicon.ico",
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
  icon: "http://tinyurl.com/favicon.ico",
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
var uext = Application.extensions.get('ubiquity@labs.mozilla.com');

var cookie_mgr = Components.classes["@mozilla.org/cookiemanager;1"]
    .getService(Components.interfaces.nsICookieManager);

CmdUtils.CreateCommand(
  {
    names: ["share (on delicious)", "delicious"],
    icon:
        'http://delicious.com/favicon.ico',
    description:
        'Share the current page as a bookmark on delicious.com',
    help:
        'Select text on the page to use as notes, or enter your own ' +
        'text after the command word.  You can also assign tags to the '+
        'bookmark with the "tagged" modifier, and alter the bookmark ' +
        'default page title with the "entitled" modifier.  Note that ' +
        'you must also already be logged in at delicious.com to use ' +
        'this command.',

    homepage:
        'http://decafbad.com',
    author: {
        name: 'Leslie Michael Orchard',
        email: 'l.m.orchard@pobox.com'
    },
    license:
        'MPL/GPL/LGPL',
    arguments: [{role: "object",
                 nountype: noun_arb_text,
                 label: "notes"},
                {role: "alias",
                 nountype: noun_arb_text,
                 label: "title"},
                {role: "instrument",
                 nountype: noun_arb_text,
                 label: "tags"}],

    /**
     * Command configuration settings.
     */
    _config: {
        // Base URL for the delicious v1 API
        api_base:      'https://api.del.icio.us',

        // Domain and name of the delicious login session cookie.
        cookie_domain: '.delicious.com',
        cookie_name:   '_user'
    },

    /**
     * Present a preview of the bookmark under construction during the course
     * of composing the command.
     */
    preview: function(pblock, arguments) {

        var bm          = this._extractBookmarkData(arguments);
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
    execute: function(arguments) {
        var bm          = this._extractBookmarkData(arguments);
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

        var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].
                   createInstance();

        req.open('POST', url, true);

        var _this = this;
        var onload, onerror;

        req.onload  = onload  = function(ev) {
          displayMessage(_('Bookmark "${description}" shared at delicious.com/${user_name}',{description:bm.description,user_name:user_name}));
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

        req.send(this._buildQueryString(bm));
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
            if( cookie instanceof Components.interfaces.nsICookie &&
                cookie.host.indexOf(this._config.cookie_domain) != -1 &&
                cookie.name == this._config.cookie_name) {
                return decodeURIComponent(cookie.value);
            }
        }
    },

    /**
     * Given an object, build a URL query string
     */
    _buildQueryString: function(data) {
        var qs = [];
        for (k in data) if (data[k])
            qs.push( encodeURIComponent(k) + '=' +
                encodeURIComponent(data[k]) );
        return qs.join('&');
    },

    EOF:null // I hate trailing commas

});

