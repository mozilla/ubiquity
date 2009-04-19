/* TODO
From Abi:
	I think the ones I most often use would be to check the current status
	of a specific friend (or maybe, the last 3 statuses). The ability to
	check your friends timeline as a whole would also be nice.


*/

// max of 140 chars is recommended, but it really allows 160... but that gets truncated on some displays? grr
const TWITTER_STATUS_MAXLEN = 140;


CmdUtils.CreateCommand({
  name: "twitter",
  names: {
    en: ['twitter','tweet'],
    ja: ['呟く','呟け','呟いて','つぶやく','つぶやけ','つぶやいて']
  },
  arguments: [
    {role: 'object', nountype: noun_arb_text},
    {role: 'alias', nountype: noun_type_twitter_user}
  ],
  synonyms: ["tweet"],
  icon: "http://assets3.twitter.com/images/favicon.ico",
  takes: {status: noun_arb_text},
  modifiers: { "as" : noun_type_twitter_user },
  description: "Sets your Twitter status to a message of at most 160 characters.",
  help: "Sets your Twitter status to a message of at most 160 characters. You'll need a <a href=\"http://twitter.com\">Twitter account</a>, obviously.  If you're not already logged in" +
        " you'll be asked to log in.",
  preview: function(previewBlock, directObj, mods) {
    // these are converted in the Twitter database anyway, and counted as 4 characters
    var statusText = directObj.text
	  .replace("<", "&lt;")
	  .replace(">", "&gt;");
    var usernameText = null;
    if (mods.as) {
      usernameText = mods.as.text;
    }

    var previewTemplate = "Updates your Twitter status ${username} to: <br /><b>${status}</b> <br /><br />Characters remaining: <b>${chars}</b> <p style='font-size:11px'> tip: tweet @mozillaubiquity for help </p>";
    var truncateTemplate = "<span style='color: red;'><br />The last <b>${truncate}</b> characters will be truncated!</span>";
    var previewData = {
      status: statusText,
      username: usernameText ? ("(For user <b>" + usernameText + "</b>)"):"",
      chars: TWITTER_STATUS_MAXLEN - statusText.length
    };

    var previewHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

    if (previewData.chars < 0) {
      var truncateData = {
        truncate: 0 - previewData.chars
      };

      previewHTML += CmdUtils.renderTemplate(truncateTemplate, truncateData);
    }

    previewBlock.innerHTML = previewHTML;
  },
  execute: function(directObj, mods) {
    var statusText = directObj.text;
    if(statusText.length < 1) {
      displayMessage("Twitter requires a status to be entered");
      return;
    }

    var updateUrl = "https://twitter.com/statuses/update.json";
    var updateParams = {
      source: "ubiquity",
      status: statusText
      //dont cut the input since sometimes, the user selects a big url, and the total lenght is more than 140, but
      // tinyurl takes care of that
    };

    function sendMessage() {
      jQuery.ajax({
        type: "POST",
        url: updateUrl,
        data: updateParams,
        dataType: "json",
        error: function() {
          displayMessage("Twitter error - status not updated");
        },
        success: function() {
          var msg = updateParams.status.match(/^d /) ?
                    "Twitter direct message sent" :
                    "Twitter status updated";
          displayMessage(msg);
        },
        username: login.username,
        password: login.password
      });
    }

    var login;
    if (mods.as && mods.as.text && mods.as.data) {
      login = mods.as.data;
      sendMessage();
    } else {
      login = {username: null,
               password: null};
      if (mods.as && mods.as.text)
        login.username = mods.as.text;
      sendMessage();
    }
  }
});

CmdUtils.CreateCommand({
  name: "digg",
  synonyms: ["share-on-digg"],
  icon: "http://digg.com/favicon.ico",
  homepage: "http://www.gialloporpora.netsons.org",
  description: "If not yet submitted, submits the page to Digg. Otherwise, it takes you to the story's Digg page.",
  author: { name: "Sandro Della Giustina", email: "sandrodll@yahoo.it"},
  license: "MPL,GPL",
  execute: function() {
    var doc = CmdUtils.getDocument();
    var sel = doc.getSelection().substring(0,375);


    var params = Utils.paramsToString({
      phase: "2",
      url: doc.location,
      title: doc.title,
      bodytext: sel
    });

    story_url='http://digg.com/submit' + params;
    Utils.openUrlInBrowser(story_url);

  },
  preview: function(pblock) {

    var doc = CmdUtils.getDocument();
    var selected_text= doc.getSelection();
    var api_url='http://services.digg.com/stories';

    var params = Utils.paramsToString({
      appkey: "http://www.gialloporpora.netsons.org",
      link: doc.location
    });

    var html= 'Submit or digg this page. Checking if this page has already been submitted...';
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
          html = 'Submit this page to Digg';
          if (selected_text.length > 0) {
            html += " with the description:<br/> <i style='padding:10px;color: #CCC;display:block;'>" + selected_text + "</i>";
            if (selected_text.length > 375){
              html +='<br/> Description can only be 375 characters. The last <b>'
              + (selected_text.length - 375) + '</b> characters will be truncated.';
            }
          }
        }
        else{
          html = 'Digg this page. This page already has <b>'+diggs+'</b> diggs.';
        }
        pblock.innerHTML = html;
      }
    });
  }
});

CmdUtils.CreateCommand({
  name: "tinyurl",
  takes: {"url to shorten": noun_type_url},
  icon: "http://tinyurl.com/favicon.ico",
  description: "Replaces the selected URL with a <a href=\"http://www.tinyurl.com\">TinyUrl</a>",
  preview: function( pblock, urlToShorten ){
    pblock.innerHTML = "Replaces the selected URL with a TinyUrl.";
    var baseUrl = "http://tinyurl.com/api-create.php?url=";
    pblock.innerHTML = "Replaces the selected URL with ",
    jQuery.get( baseUrl + urlToShorten.text, function( tinyUrl ) {
      if(tinyUrl != "Error") pblock.innerHTML += tinyUrl;
    });
  },
  execute: function( urlToShorten ) {
    //escaping urlToShorten will not create the right tinyurl
    var baseUrl = "http://tinyurl.com/api-create.php?url=";
    jQuery.get( baseUrl + urlToShorten.text, function( tinyUrl ) {
      CmdUtils.setSelection( tinyUrl );
    });
  }
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

CmdUtils.CreateCommand({

    name:
        'share-on-delicious',
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

    takes: { notes: noun_arb_text },
    modifiers: {
        tagged:   noun_arb_text,
        entitled: noun_arb_text
    },

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
    preview: function(pblock, input_obj, mods) {

        var bm          = this._extractBookmarkData(input_obj, mods);
        var user_cookie = this._getUserCookie();
        var user_name   = (user_cookie) ? user_cookie.split(' ')[0] : '';

        var ns = { user_name: user_name, bm: bm };

        var tmpl;

        if (!user_name) {

            // If there's no user name, there's no login, so this command won't work.
            tmpl = [
                '<p style="color: #d44">No active user found - log in at ',
                '<img src="http://delicious.com/favicon.ico"> ',
                '<b><a style="color: #3774D0" href="http://delicious.com">delicious.com</a></b> ',
                'to use this command.</p>'
            ].join('');

        } else if (!bm.description) {

            // If there's no title, somehow, then this is an error too.
            tmpl = [
                '<p style="color: #d44">A title is required for bookmarks on ',
                '<b><a style="color: #3774D0" href="http://delicious.com">delicious.com</a></b> ',
                '</p>'
            ].join('');

        } else {

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
                    '<p>Share a bookmark at <img src="http://delicious.com/favicon.ico"> ',
                        '<b><a href="http://delicious.com/${user_name}">delicious.com/${user_name}</a></b>:</p>',
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
    execute: function(input_obj, mods) {
        var bm          = this._extractBookmarkData(input_obj, mods);
        var user_cookie = this._getUserCookie();
        var user_name   = (user_cookie) ? user_cookie.split(' ')[0] : '';

        if (!user_name) {
            // If there's no user name, there's no login, so this command won't work.
            displayMessage('No active user found - log in at delicious.com ' +
                'to use this command.');
            return false;
        }

        if (!bm.description) {
            // If there's no title, somehow, then this is an error too.
            displayMessage("A title is required for bookmarks at delicious.com");
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
            displayMessage('Bookmark "' + bm.description + '" ' +
                'shared at delicious.com/' + user_name);
        }

        req.onerror = onerror = function(ev) {
            // TODO: more informative reporting on errors
            displayMessage('ERROR: Bookmark "' + bm.description + '" ' +
                ' NOT shared on delicious.com/' + user_name);
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
    _extractBookmarkData: function(input_obj, mods) {
        return {
            _user:
                this._getUserCookie(),
            url:
                context.focusedWindow.location,
            description:
                mods.entitled.text || context.focusedWindow.document.title,
            extended:
                input_obj.text ? '"' + input_obj.text + '"' : '',
            tags:
                mods.tagged.text
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

// max 100 chars for question
const RYPPLE_QUESTION_MAXLEN = 100;
const RYPPLE_ATTRIBUTE_MAX = 3;

CmdUtils.CreateCommand({
  name: "rypple-ask",
  synonym: "ask-rypple",
  takes: {"question": noun_arb_text},
  icon: "https://www.rypple.com/feedback/images/favicon.ico",
  description: "Asks a question on Rypple",
  help: "You'll need a <a href=\"http://rypple.com\">Rypple account</a> and be logged in",
  homepage: "http://www.rypple.com/ubiquity/ask.html",

  _parse: function (character, text) {
    // parse text
    var values = [];
    var startIndex = 0;
    var textLeft = '';
    var lastIndex = startIndex;
    do {
      startIndex = text.indexOf(character, endIndex);
      var endIndex = startIndex;
      if (startIndex >= 0) {
        var endIndex = text.indexOf(' ', startIndex);
        if (endIndex < 0) {
          endIndex = text.length;
        }
        var value = text.substring(startIndex + 1, endIndex);
        if (value.length > 0) {
          values.push(value);
        }

        textLeft += text.substring(lastIndex, startIndex);
        lastIndex = endIndex + 1;
      }
    } while (startIndex >= 0);

    // concat last chunk of text after last found item
    if (lastIndex != text.length) {
      textLeft += text.substring(lastIndex, text.length);
    }

    var parsed = [];
    parsed.values = values;
    parsed.textLeft = textLeft;
    return parsed;
  },

  preview: function( previewBlock, entry ) {
    // parse entry text
    var parsedContacts = this._parse('@', entry.text);
    var parsedAttr = this._parse('#', parsedContacts.textLeft);
    var question = parsedAttr.textLeft;

    // output preview
    var template = '{if errorMsg}<span style="color: red;"><br />${errorMsg}<br/></span>{/if}';
    template +=    '<b>Asks the following question (${charsLeft} characters left):</b><br/>';
    template +=    '{if question != ""}${question}{else}NO QUESTION. PLEASE ENTER A QUESTION.{/if}<br/>';
    template +=    '<br/>';
    template +=    '<b>To:</b><br/>';
    template +=    '{for c in contacts}${c}, {forelse}NO RECIPIENTS. YOU MUST ENTER AT LEAST ONE.{/for}<br/>';
    template +=    '<br/>';
    template +=     '<b>Attributes:</b><br/>';
    template +=    '{for a in attributes}${a}, {forelse}NO ATTRIBUTES. YOU MUST ENTER AT LEAST ONE.{/for}<br/>';
    template +=    '<br/>';
    template +=    '<br/>';
    template +=    '<hr/>';
    template +=    '<b>Usage:</b><br/>';
    template +=    'rypple-ask &lt;question&gt; &lt;recipient(s)&gt; &lt;attribute(s)&gt;<br/>';
    template +=    'Recipients must start with \'@\' and at least one recipient is required.<br/>';
    template +=    'Attributes must start with \'#\' and at least one attribute is required.<br/>';

    var charsLeft = RYPPLE_QUESTION_MAXLEN - question.length;
    var errorMsg = "";
    if (charsLeft < 0) {
        errorMsg += "The last <b>" + charsLeft * -1 + "</b> character(s) of your question will be truncated!<br/>";
    }
    if (parsedAttr.values.length > RYPPLE_ATTRIBUTE_MAX) {
        errorMsg += "The last <b>" + (parsedAttr.values.length - RYPPLE_ATTRIBUTE_MAX) + "</b> attributes(s) will not be used!<br/>";
    }
    var data = {
      question : question,
      contacts : parsedContacts.values,
      attributes : parsedAttr.values,
      charsLeft: charsLeft,
      errorMsg : errorMsg
    };

    previewBlock.innerHTML = CmdUtils.renderTemplate( template, data );
  },

  //TODO email format validation, tags w/ spaces, msg format: @ character, advice/rated
  execute: function(entry) {
    // parse entry text
    var parsedContacts = this._parse('@', entry.text);
    var parsedAttr = this._parse('#', parsedContacts.textLeft);
    var question = parsedAttr.textLeft;

    // validation
    if (parsedContacts.values.length < 1) {
      displayMessage("At least one recipient is required");
      return;
    }
    if (parsedAttr.values.length < 1) {
      displayMessage("At least one attribute is required");
      return;
    }
    if (question.length < 1) {
      displayMessage("No question specified");
      return;
    }

    var updateUrl = "https://www.rypple.com/feedback/api/v1/feedback";

    var updateParams = {
      recipients: parsedContacts.values,
      attributes: parsedAttr.values.slice(0,RYPPLE_ATTRIBUTE_MAX),
      title: question.substring(0, RYPPLE_QUESTION_MAXLEN),
      type: "ADVICE"
    };

    jQuery.ajax({
      type: "POST",
      processData: false,
      contentType: "application/json",
      url: updateUrl,
      data: Utils.encodeJson(updateParams),
      dataType: "json",
      error: function() {
          displayMessage("Rypple error - are you logged in?");
      },
      success: function(returnValue ) {
        if (returnValue.success) {
          displayMessage("Asked Question Successfully on Rypple");
        } else {
          displayMessage("Rypple error - are you logged in?");
        }
      }
    });
  }
});
