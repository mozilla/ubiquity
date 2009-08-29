/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Satoshi Murakami <murky.satyr@gmail.com>
 *   Brandon Pung <brandonpung@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// = Built-in Noun Types =
//
// **//FIXME//**
// \\Explain:
// * how nouns work.
// * common properties.
// ** {{{suggest}}}
// ** {{{default}}}
// ** {{{noExternalCalls}}}
// ** {{{label}}} (, {{{name}}}, {{{id}}})

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://ubiquity/modules/cmdutils.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://gre/modules/utils.js");

const {Application} = Utils;

// === {{{ noun_arb_text }}} ===
//
// Suggests the input as is.
//
// * {{{text, html}}} : user input

var noun_arb_text = {
  label: "?",
  rankLast: true,
  noExternalCalls: true,
  cacheTime: -1,
  suggest: function nat_suggest(text, html, callback, selectionIndices) {
    return [CmdUtils.makeSugg(text, html, null, 0.3, selectionIndices)];
  },
  // hack to import feed-specific globals into this module
  // see feed-parts/header/initial.js
  loadGlobals: function nat_loadGlobals(source) {
    var target = (function () this)();
    for each (let p in ["Utils", "CmdUtils", "jQuery", "Date"])
      target[p] = source[p];
    this.loadGlobals = function () {};
  }
};

// === {{{ noun_type_email_service }}} ===
//
// **//FIXME//**
//
// * {{{text}}} :
// * {{{html}}} :
// * {{{data}}} :

var noun_type_email_service = CmdUtils.NounType("email service",
                                                "googleapps gmail yahoo",
                                                "gmail");

// === {{{ noun_type_email }}} ===
//
// Suggests an email address (RFC2822 minus domain-lit).
// The regex is taken from:
// http://blog.livedoor.jp/dankogai/archives/51190099.html
//
// * {{{text, html}}} : email address

var email_atom = "[\\w!#$%&'*+/=?^`{}~|-]+";
var noun_type_email = {
  label: "email",
  noExternalCalls: true,
  cacheTime: -1,
  _email: RegExp("^(?:" + email_atom + "(?:\\." + email_atom +
                 ')*|(?:\\"(?:\\\\[^\\r\\n]|[^\\\\\\"])*\\"))@(' +
                 email_atom + "(?:\\." + email_atom + ")*)$"),
  _username: RegExp("^(?:" + email_atom + "(?:\\." + email_atom +
                    ')*|(?:\\"(?:\\\\[^\\r\\n]|[^\\\\\\"])*\\"))$'),
  suggest: function nt_email_suggest(text, html, cb, selectionIndices) {
    if (this._username.test(text))
      return [CmdUtils.makeSugg(text, html, null, 0.3, selectionIndices)];

    var match = text.match(this._email);
    if (!match) return [];

    var domain = match[1];
    // if the domain doesn't have a period or the TLD
    // has less than two letters, penalize
    var score = /\.(?:\d+|[a-z]{2,})$/i.test(domain) ? 1 : 0.8;

    return [CmdUtils.makeSugg(text, html, null, score, selectionIndices)];
  }
};

// === {{{ noun_type_percentage }}} ===
//
// Suggests a percentage value.
//
// * {{{text, html}}} : "?%"
// * {{{data}}} : a float number (1.0 for 100% etc.)

var noun_type_percentage = {
  label: "percentage",
  noExternalCalls: true,
  cacheTime: -1,
  _default: CmdUtils.makeSugg("100%", null, 1, 0.3),
  "default": function nt_percentage_default() this._default,
  suggest: function nt_percentage_suggest(text, html) {
    var number = parseFloat(text);
    if (isNaN(number)) return [];

    var numOfOkayChars = text.replace(/[^\d%.e]/g, "").length;
    var score = numOfOkayChars / text.length;
    var nopercent = text.indexOf("%") < 0;
    if (nopercent) score *= 0.9;

    var returnArr =
      [CmdUtils.makeSugg(number + "%", null, number / 100, score)];
    // if the number's 10 or less and there's no
    // % sign, also try interpreting it as a proportion instead of a
    // percent and offer it as a suggestion as well, but with a lower
    // score.
    if (nopercent && number <= 10) {
      returnArr.push(
        CmdUtils.makeSugg(number * 100 + "%", null, number, score * 0.9));
    }
    return returnArr;
  }
};

// === {{{ noun_type_tab }}} ===
//
// Suggests currently opened tabs.
//
// * {{{text, html}}} : tab title or URL
// * {{{data}}} : one of
//   [[https://developer.mozilla.org/en/FUEL/Window|fuelIWindow]]#{{{tabs}}}

var noun_type_tab = {
  label: "title or URL",
  noExternalCalls: true,
  registerCacheObserver: function nt_tab_observer(flush) {
    function registerListenersForWindow(window) {
      let browser = getBrowser(window);
      if (browser == null)
        return;
      let container = browser.tabContainer;
      container.addEventListener("TabOpen", flush, false);
      container.addEventListener("TabClose", flush, false);
    }
    function unRegisterListenersForWindow(window) {
      let browser = getBrowser(window);
      if (browser == null)
        return;
      let container = browser.tabContainer;
      container.removeEventListener("TabOpen", flush, false);
      container.removeEventListener("TabClose", flush, false);
    }
    function getBrowser(window) {
      // Make sure the window is browser-like
      if (typeof window.getBrowser !== "function")
        return null;
      // Make sure it's a tabbrowser-like window
      let browser = window.getBrowser();
      if (browser == null || typeof browser.tabContainer !== "object")
        return null;
      return browser;
    }
    // Register as an observer so we can catch windows opening and closing:
    var ww = (Cc["@mozilla.org/embedcomp/window-watcher;1"]
              .getService(Ci.nsIWindowWatcher));
    ww.registerNotification({
      observe: function observe(aSubject, aTopic, aData) {
        /* Called when a window opens or closes.  Make sure that every
         * window has the appropriate listeners registered. */
        let window = aSubject.QueryInterface(Ci.nsIDOMWindow);
        if (aTopic === "domwindowopened")
          registerListenersForWindow(window);
        else if (aTopic === "domwindowclosed")
          unRegisterListenersForWindow(window);
      }
    });
    /* Also directly register the listeners for any browser window already
     * open: */
    let wm = (Cc["@mozilla.org/appshell/window-mediator;1"]
              .getService(Ci.nsIWindowMediator));
    let enumerator = wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      registerListenersForWindow(enumerator.getNext());
    };
  },
  suggest: function nt_tab_suggest(text, html, cb, selectedIndices)
    [CmdUtils.makeSugg(tab.document.title || tab.document.URL, null, tab,
                       CmdUtils.matchScore(tab.match), selectedIndices)
     for each (tab in Utils.tabs.search(text, CmdUtils.maxSuggestions))],
};

// === {{{ noun_type_search_engine }}} ===
//
// **//FIXME//**
//
// * {{{text, html}}} : name of the engine
// * {{{data}}} : engine object (see {{{nsIBrowserSearchService}}})

var noun_type_search_engine = {
  label: "search engine",
  noExternalCalls: true,
  // the default search engine should just get 0.3 or so...
  // if it's actually entered, it can get a higher score.
  default: function nt_sengine_default()
    this._sugg(this._BSS.defaultEngine, 0.3),
  suggest: function nt_sengine_suggest(text) {
    var suggs = this._BSS.getVisibleEngines({}).map(this._sugg);
    return CmdUtils.grepSuggs(text, suggs);
  },
  _BSS: (Cc["@mozilla.org/browser/search-service;1"]
         .getService(Ci.nsIBrowserSearchService)),
  _sugg: function nt_sengine__sugg(engine, score) (
    CmdUtils.makeSugg(engine.name, null, engine, score || 1)),
};

// === {{{ noun_type_tag }}} ===
//
// Suggests the input as comma separated tags,
// plus completions based on existing tags.
// Defaults to all tags.
//
// * {{{text, html}}} : comma separated tags
// * {{{data}}} : an array of tags

var noun_type_tag = {
  label: "tag1[,tag2 ...]",
  rankLast: true,
  noExternalCalls: true,
  default: function nt_tag_default()
    [CmdUtils.makeSugg(tag, null, [tag], 0.3)
     for each (tag in PlacesUtils.tagging.allTags)],
  suggest: function nt_tag_suggest(text) {
    text = Utils.trim(text);
    if (!text) return [];

    // let's start with an initial seed score.
    var score = 0.3;

    var {allTags} = PlacesUtils.tagging;
    var lowercaseAllTags = [tag.toLowerCase() for each (tag in allTags)];

    // can accept multiple tags, seperated by a comma
    // assume last tag is still being typed - suggest completions for that
    var completedTags = text.split(/\s{0,},\s{0,}/);
    // separate last tag in fragment, from the rest
    var uncompletedTag = completedTags.pop();
    var utag = (uncompletedTag ? uncompletedTag.toLowerCase() : null);
    completedTags = completedTags.filter(Boolean);

    for each (let tag in completedTags) {
      if (lowercaseAllTags.indexOf(tag.toLowerCase()) > -1)
        // if preexisting tag, boost score
        score = Math.pow(score, 0.5);
    }

    var suggs = [
      CmdUtils.makeSugg(null, null,
                        (uncompletedTag
                         ? completedTags.concat(uncompletedTag)
                         : completedTags),
                        (uncompletedTag && lowercaseAllTags.indexOf(utag) >= 0
                         ? Math.sqrt(score)
                         : score))];
    if (uncompletedTag) {
      for each (let tag in allTags)
        // only match from the beginning of a tag name (not the middle)
        if (tag.length > utag.length &&
            tag.toLowerCase().indexOf(utag) === 0)
          suggs.push(CmdUtils.makeSugg(null, null,
                                       completedTags.concat(tag),
                                       Math.sqrt(score)));
    }
    return suggs;
  }
};

// === {{{ noun_type_awesomebar }}} ===
//
// Suggests "Awesome Bar" query results.
//
// * {{{text, html}}} : title or url
// * {{{data}}} : a query result
//   (see [[#modules/utils.js|Utils]]{{{.history.search}}})

var noun_type_awesomebar = {
  label: "query",
  rankLast: true,
  noExternalCalls: true,
  cacheTime: 0,
  suggest: function nt_awesome_suggest(text, html, callback) {
    if (!text) return [];

    var reqObj = {readyState: 2}, {_match} = this;
    Utils.history.search(text, function nt_awesome_results(results) {
      reqObj.readyState = 4;
      var returnArr = [], lctxt = text.toLowerCase();
      for each (let r in results) {
        let u = _match(r.url, lctxt);
        let t = _match(r.title, lctxt);
        let m = u.score > t.score ? u : t;
        returnArr.push(CmdUtils.makeSugg(m.input, null, r, m.score,
                                         [m.index, m.index + text.length]));
      }
      callback(returnArr);
    });
    return [reqObj];
  },
  // creates a fake match object with an applicable score
  _match: function nt_awesome_match(input, lctxt) {
    var index = input.toLowerCase().indexOf(lctxt);
    var match = {index: index, input: input, 0: lctxt};
    match.score = ~index && CmdUtils.matchScore(match);
    return match;
  },
};

// === {{{ noun_type_common_URI_scheme }}} ===
//
// The "common schemes" are the IANA-registered ones
// plus Unofficial ones and a few Mozilla specific ones.
// See http://en.wikipedia.org/wiki/URI_scheme .
//
// * {{{text, hml}}} : URL scheme

var common_URI_schemes = <><![CDATA[
  aaa aaas acap cap cid crid data dav dict dns fax file ftp go gopher h323
  http https icap im imap info ipp iris iris.beep iris.xpc iris.xpcs iris.lws
  ldap mailto mid modem msrp msrps mtqp mupdate news nfs nntp opaquelocktoken
  pop pres prospero rtsp service shttp sip sips snmp soap.beep soap.beeps tag
  tel telnet tftp thismessage tip tv urn vemmi wais xmlrpc.beep xmpp
  z39.50r z39.50s
  about afp aim apt bolo bzr callto cel cvs daap ed2k feed fish gg git
  gizmoproject iax2 irc ircs itms lastfm ldaps magnet mms msnim psyc rsync
  secondlife skype ssh svn sftp smb sms soldat steam unreal ut2004 view-source
  vzochat webcal wyciwyg xfire ymsgr
  chrome resource
  ]]></>.match(/\S+/g);

var noun_type_common_URI_scheme = CmdUtils.NounType(
  "URI scheme",
  [scheme + ":" for each (scheme in common_URI_schemes)]);

// === {{{ noun_type_url }}} ===
//
// Suggests a URL from the user's input and/or history.
// Defaults to the current page's URL if no input is given.
//
// * {{{text, hml}}} : URL

var noun_type_url = {
  label: "url",
  rankLast: true,
  noExternalCalls: true,
  cacheTime: 0,
  default: function nt_url_default()
    CmdUtils.makeSugg(Application.activeWindow.activeTab.uri.spec,
                      null, null, 0.5),
  _schemeRE: RegExp("^" + Utils.regexp.Trie(common_URI_schemes) +
                    "(?::/{0,2})?"),
  // LDH charcodes include "Letters, Digits, and Hyphen".
  // We'll throw in . @ : too.
  _LDHRE: /^[a-z\d-.@:]+$/i,
  suggest: function nt_url_suggest(text, html, callback, selectionIndices) {
    if (!text) return [];

    var possibleSchemes =
      noun_type_common_URI_scheme.suggest.apply(noun_type_common_URI_scheme,
                                                arguments);
    var returnArr = (
      possibleSchemes.length
      ? [{__proto__: s, score: 0.8 * s.score}
         for each (s in (Utils.sortBy(possibleSchemes, "score")
                         .slice(-2).reverse()))]
      : []);
    var score = 1;
    // check to see whether we have a full URI scheme.
    if (this._schemeRE.test(text))
      var {lastMatch: scheme, rightContext: noscheme} = RegExp;
    else {
      var scheme = "http://", noscheme = text;
      if (selectionIndices)
        selectionIndices =
          [i + scheme.length for each (i in selectionIndices)];
      score *= 0.9;
    }

    if (noscheme) {
      let segments = noscheme.split(/[/?#]/, 2);
      // if it's just a domain name-looking thing, lower confidence
      if (segments.length === 1) score *= 0.8;

      let domain = segments[0];
      // if the domain doesn't have any dots in it, lower confidence
      if (domain.indexOf('.') === -1) score *= 0.9;

      if (!this._LDHRE.test(domain)) {
        // if it's not LDH, then we should see if it's a valid
        // international domain name.
        try { // normalize can fail
          var asciiDomain = (Cc["@mozilla.org/network/idn-service;1"]
                             .createInstance(Ci.nsIIDNService)
                             .normalize(domain));
        } catch (e) {}
        // if it's not even a valid IDN, then throw it out.
        score *= this._LDHRE.test(asciiDomain) ? 0.9 : 0;
      }
    }

    if (score)
      returnArr.unshift(CmdUtils.makeSugg(scheme + noscheme, null, null,
                                          score, selectionIndices));

    var reqObj = {readyState: 2};
    returnArr.push(reqObj);
    Utils.history.search(text, function nt_url_search(results) {
      reqObj.readyState = 4;
      var suggs = [], tlc = text.toLowerCase();
      for each (let r in results) {
        var urlIndex = r.url.toLowerCase().indexOf(tlc);
        if (urlIndex < 0) continue;
        var urlScore =
          CmdUtils.matchScore({index: urlIndex, 0: text, input: r.url});
        suggs.push(CmdUtils.makeSugg(r.url, null, r, urlScore));
      }
      callback(suggs);
    });

    return returnArr;
  }
};

// === {{{ noun_type_livemark }}} ===
//
// Suggests each livemark whose title matches the input.
//
// * {{{text, html}}} : title
// * {{{data.id}}} : id
// * {{{data.feed}}} : feed URL
// * {{{data.site}}} : site URL
// * {{{data.items}}} : an array of items loaded in the livemark
//
// {{{feeds}}} is the getter for all livemarks.

var noun_type_livemark = {
  label: "title",
  cacheTime: 0,
  suggest: function nt_livemark_suggest(text, html, cb, selected) {
    if (!text) return [];

    var {feeds} = this;
    if (!feeds.length) return [];

    var {bookmarks} = PlacesUtils;
    var suggs =  [CmdUtils.makeSugg(bookmarks.getItemTitle(id), null,
                                    {id: id, __proto__: this._proto_})
                  for each (id in feeds)];
    return CmdUtils.grepSuggs(text, suggs);
  },
  get feeds() (Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Ci.nsIAnnotationService)
               .getItemsWithAnnotation("livemark/feedURI", {})),
  _proto_: {
    get feed() PlacesUtils.livemarks.getFeedURI(this.id).spec,
    get site() PlacesUtils.livemarks.getSiteURI(this.id).spec,
    get items() {
      var list = [], {root} = PlacesUtils.getFolderContents(this.id);
      root.containerOpen = true;
      for (let i = 0, c = root.childCount; i < c; ++i)
        list[i] = root.getChild(i);
      root.containerOpen = false;
      return list;
    },
  },
};

// === {{{ noun_type_command }}} ===
//
// Suggests each installed command whose name matches the input.
//
// * {{{text, html}}} : command name
// * {{{data}}} : command object

var noun_type_command = {
  label: "name",
  noExternalCalls: true,
  cacheTime: 0,
  suggest: function nt_command_suggest(text, html, cb, selected) {
    if (!text) return [];
    var grepee = this._get();
    if (!grepee.length) return [];
    var res = CmdUtils.grepSuggs(text, grepee);
    if (!res.length) return [];
    // removing duplicates
    var dic = {};
    for each (let r in res) let ({id} = r.cmd) {
      if (!(id in dic) || dic[id].score < r.score) dic[id] = r;
    }
    return [CmdUtils.makeSugg(r.text, null, r.cmd, r.score)
            for each (r in dic)];
  },
  _cmdSource: UbiquitySetup.createServices().commandSource,
  _get: function nt_command__get() {
    var cmds = this._cmdSource.getAllCommands();
    if ("disabled" in this) {
      let {disabled} = this;
      cmds = [cmd for each (cmd in cmds) if (cmd.disabled === disabled)];
    }
    return [{cmd: cmd, text: name}
            for each (cmd in cmds) for each (name in cmd.names)];
  },
};

// === {{{ noun_type_enabled_command }}} ===
// === {{{ noun_type_disabled_command }}} ===
//
// Same as {{{noun_type_command}}}, but with only enabled/disabled commands.

var noun_type_enabled_command = {
  __proto__: noun_type_command,
  get disabled() false,
};

var noun_type_disabled_command = {
  __proto__: noun_type_command,
  get disabled() true,
};

// === {{{ noun_type_skin }}} ===
//
// Suggests each installed skin whose name matches the input.
//
// * {{{text, html}}} : skin name
// * {{{data.downloadUrl}}}
// * {{{data.localUrl}}}
// * {{{data.metaData}}} : meta data dictionary

var noun_type_skin = {
  label: "name",
  noExternalCalls: true,
  cacheTime: 0,
  suggest: function nt_skin_suggest(text, html, cb, selected) {
    var {skinService} = UbiquitySetup.createServices();
    var suggs = [CmdUtils.makeSugg(skin.metaData.name, null, skin)
                 for each (skin in skinService.skinList)];
    return CmdUtils.grepSuggs(text, suggs);
  },
};

// === {{{ noun_type_twitter_user }}} ===
//
// Suggests Twitter IDs from the user's login info.
//
// * {{{text, html}}} : Twitter ID
// * {{{data}}} : login data (see {{{nsILoginManager}}})

var noun_type_twitter_user = {
  label: "user",
  rankLast: true,
  noExternalCalls: true,
  cacheTime: 0,
  suggest: function nt_twuser_suggest(text, html, cb, selected) {
    // reject text from selection.
    if (!text || selected)
      return [];

    var foundAt = text[0] === '@';
    if (foundAt) text = text.slice(1); // strip off the @

    var suggs = CmdUtils.grepSuggs(text, this.logins());
    // only letters, numbers, and underscores are allowed in twitter
    // usernames.

    if (/^\w+$/.test(text))
      suggs.push(CmdUtils.makeSugg(text, null, {}, 0.5));

    if (foundAt)
      suggs = [{
        __proto__: s,
        text: '@' + s.text,
        html: '@' + s.html,
        summary: '@' + s.summary,
        score: Math.pow(s.score, 0.8),
      } for each (s in suggs)];

    return suggs;
  },
  logins: function nt_twuser_logins(reload) {
    // TODO: figure out how often to clear this list cache.
    if (this._list && !reload) return this._list;
    var list = [];
    var token = (Cc["@mozilla.org/security/pk11tokendb;1"]
                 .getService(Ci.nsIPK11TokenDB)
                 .getInternalKeyToken());
    if (!token.needsLogin() || token.isLoggedIn()) {
      // Look for twitter usernames stored in password manager
      var usersFound = {};
      var passwordManager = (Cc["@mozilla.org/login-manager;1"]
                             .getService(Ci.nsILoginManager));
      for each (let url in ["https://twitter.com", "http://twitter.com"]) {
        for each (let login in passwordManager.findLogins({}, url, "", "")) {
          let {username} = login;
          if (username in usersFound) continue;
          usersFound[username] = true;
          list.push(CmdUtils.makeSugg(username, null, login));
        }
      }
    }
    return this._list = list;
  },
  _list: null,
};

// === {{{ noun_type_number }}} ===
//
// Suggests a number value. Defaults to 1.
//
// * {{{text, html}}} : number text
// * {{{data}}} : number

var noun_type_number = {
  label: "number",
  noExternalCalls: true,
  cacheTime: -1,
  suggest: function nt_number_suggest(text) {
    var num = +text;
    return isNaN(num) ? [] : [CmdUtils.makeSugg(text, null, num)];
  },
  "default": function nt_number_default() {
    return CmdUtils.makeSugg("1", null, 1, 0.5);
  }
};

// === {{{ noun_type_bookmarklet }}} ===
//
// Suggests each bookmarklet whose title matches the input.
//
// * {{{text, html}}} : bookmarklet title
// * {{{data}}} : bookmarklet (pseudo) url
//
// {{{load()}}} : Reloads bookmarklets.

var noun_type_bookmarklet = {
  label: "title",
  noExternalCalls: true,
  cacheTime: 0,
  suggest: function nt_bookmarklet_suggest(text, html, cb, selected) {
    if (!text) return [];
    return CmdUtils.grepSuggs(text, this.list);
  },
  list: null,
  load: function nt_bookmarklet_load(reload) {
    var list = [];
    var {bookmarks, history} = PlacesUtils;
    var query = history.getNewQuery();
    var options = history.getNewQueryOptions();
    query.onlyBookmarked = true;
    query.searchTerms = "javascript:";
    options.queryType = options.QUERY_TYPE_BOOKMARKS;
    options.sortingMode = options.SORT_BY_TITLE_DESCENDING;
    var {root} = history.executeQuery(query, options);
    root.containerOpen = true;
    for (var i = root.childCount; i--;) {
      var node = root.getChild(i);
      if (/^javascript:/.test(node.uri) &&
         !bookmarks.getKeywordForBookmark(node.itemId))
        list.push(CmdUtils.makeSugg(node.title, null, node.uri));
    }
    root.containerOpen = false;
    this.list = list;
    return this;
  }
}.load();

// === {{{ noun_type_date }}} ===
// === {{{ noun_type_time }}} ===
//
// Suggests a date/time for input, using the mighty {{{Date.parse()}}}.
// Defaults to today/now.
//
// * {{{text, html}}} : date/time text
// * {{{data}}} : {{{Date}}} instance

function parseAndScoreDateTime(text, outputLength) {
  var score = 1;
  if (/^[\d\s]+$/.test(text))
    score *= 0.8;
  if (text.length < outputLength)
    score *= 0.5 + 0.5 * Math.pow(text.length / outputLength, 0.5);
  var date = Date.parse(text);
  return {date: date, score: score};
}

var noun_type_date = {
  label: "date",
  noExternalCalls: true,
  cacheTime: 0,
  "default": function nt_date_default() this._sugg(Date.parse("today"), 1),
  suggest: function nt_date_suggest(text) {
    if (/^\s*(today|now)\s*$/i.test(text))
      return [this._sugg(new Date, RegExp.$1.length / 5)];

    var {date, score} = parseAndScoreDateTime(text, 10);
    if (date && date.isToday())
      score *= 0.5;
    if (date && date.toString("hh:mm tt") !== "12:00 AM")
      score *= 0.7;

    return date ? [this._sugg(date, score)] : [];
  },
  _sugg: function nt_date__sugg(date, score)
    CmdUtils.makeSugg(date.toString("yyyy-MM-dd"), null, date, score)
};

var noun_type_time = {
  label: "time",
  noExternalCalls: true,
  cacheTime: 0,
  "default": function nt_time_default() this._sugg(Date.parse("now"), 1),
  suggest: function nt_time_suggest(text, html) {
    if (/^\s*now\s*$/i.test(text))
      return [this._sugg(new Date, 1)];

    var {date, score} = parseAndScoreDateTime(text, 8);
    if (date && date.toString("hh:mm tt") === "12:00 AM")
      score *= 0.5;
    if (date && !date.isToday())
      score *= 0.7;
    return date ? [this._sugg(date, score)] : [];
  },
  _sugg: function nt_time__sugg(time, score)
    CmdUtils.makeSugg(time.toString("hh:mm tt"), null, time, score)
};

var noun_type_date_time = {
  label: "date and time",
  noExternalCalls: true,
  cacheTime: 0,
  "default": function nt_date_time_default() this._sugg(Date.parse("now"), 1),
  suggest: function nt_time_suggest(text, html) {
    if (/^\s*now\s*$/i.test(text))
      return [this._sugg(new Date, 1)];
    if (/^\s*today\s*$/i.test(text))
      // this crazy Date(Date(Date(... structure is used to get a Date object
      // which has today's date but has 12:00 AM as the time.
      return [this._sugg(new Date(Date.parse(new Date().toDateString())),
                         0.7)];

    var {date, score} = parseAndScoreDateTime(text, 19);
    if (date && date.isToday())
      score *= 0.7;
    if (date && date.toString("hh:mm tt") === "12:00 AM")
      score *= 0.7;
    return date ? [this._sugg(date, score)] : [];
  },
  _sugg: function nt_date_time__sugg(time, score)
    CmdUtils.makeSugg(time.toString("yyyy-MM-dd hh:mm tt"), null, time,
                      score),
};

// === {{{ noun_type_contact }}} ===
//
// Same as {{{noun_type_email}}}, but also suggests
// the user's contact informations that are fetched from Gmail (for now).
//
// * {{{text, data.email}}} : email address
// * {{{html}}} : %name <%email> (same as {{{summary}}})
// * {{{data.name}}} : name of contactee

var noun_type_contact = {
  label: "name or email",
  _list: null,
  suggest: function nt_contact_suggest(text, html, callback) {
    var suggs = noun_type_email.suggest.apply(noun_type_email, arguments);
    if (!this._list) {
      var list = this._list = [];
      return suggs.concat(getContacts(function nt_contact_cb(contacts) {
        for each (var {name, email} in contacts) {
          var htm = <>{name} &lt;{email}&gt;</>.toXMLString();
          list.push({
            text: email, html: htm, data: name, summary: htm, score: 1});
        }
        // include results based on the email address...
        callback(CmdUtils.grepSuggs(text, list, "text")
                 // ...and based on the name.
                 .concat(CmdUtils.grepSuggs(text, list, "data")));
      }));
    }
    else return CmdUtils.grepSuggs(text, this._list, "_key").concat(suggs);
  }
};

function getGmailContacts(callback) {
  var asyncRequest = jQuery.get(
    "https://mail.google.com/mail/contacts/data/export",
    {exportType: "ALL", out: "VCARD"},
    function gGC_success(data) {
      var contacts = [], name = "";
      for each(let line in data.replace(/\r\n /g, '').split(/\r\n/)) {
        if (/^(FN|EMAIL).*?:(.*)/.test(line)) {
          var {$1: key, $2: val} = RegExp;
          if (key === "FN")
            name = val;
          else
            contacts.push({name: name, email: val});
        }
      }
      callback(contacts);
    },
    "text");
  return asyncRequest;
}

function getYahooContacts(callback) {
  var url = "http://us.mg1.mail.yahoo.com/yab";
  //TODO: I have no idea what these params mean
  var params = {
    v: "XM",
    prog: "ymdc",
    tags: "short",
    attrs: "1",
    xf: "sf,mf"
  };

  var asyncRequest = jQuery.get(url, params, function (data) {

    var contacts = [];
    for each(var line in jQuery(data).find("ct")) {
      var name = jQuery(line).attr("yi");
      //accept it as as long as it is not undefined
      if (name) {
        var contact = {};
        contact["name"] = name;
        //TODO: what about yahoo.co.uk or ymail?
        contact["email"] = name + "@yahoo.com";
        contacts.push(contact);
      }
    }

    callback(contacts);
  }, "text");

  return asyncRequest;
}

function getContacts(callback) {
  //getYahooContacts(callback);
  return getGmailContacts(callback);
}

// === {{{ noun_type_geolocation }}} ===
//
// **//FIXME//**
//
// * {{{text}}} :
// * {{{html}}} :
// * {{{data}}} :

var noun_type_geolocation = {
  label: "geolocation",
  rankLast: true,
  "default": function nt_geoloc_default() {
    var location = CmdUtils.getGeoLocation();
    if (!location) return false;
    var fullLocation = ((location.city ? location.city + ", " : "") +
                        location.country);
    return CmdUtils.makeSugg(fullLocation, null, null, 0.5);
  },
  suggest: function nt_geoloc_suggest(text, html, callback, selectionIndices) {
    // LONGTERM TODO: try to detect whether fragment is anything like
    // a valid location or not, and don't suggest anything
    // for input that's not a location.
    function addAsyncGeoSuggestions(location) {
      callback([CmdUtils.makeSugg(location.city + ", " + location.country),
                CmdUtils.makeSugg(location.city),
                CmdUtils.makeSugg(location.country)]);
    }
    // TODO: we should try to build this "here" handling into something like
    // magic words (anaphora) handling in Parser 2: make it localizable.
    var suggs = [CmdUtils.makeSugg(text, null, null, 0.3, selectionIndices)];
    if (/^\s*here\s*$/i.test(text))
      suggs.push(CmdUtils.getGeoLocation(addAsyncGeoSuggestions));
    return suggs;
  }
};

// === {{{ noun_type_lang_google }}} ===
//
// Suggests languages used in various Google services.
//
// === {{{ noun_type_lang_wikipedia }}} ===
//
// Suggests languages used in Wikipedia.
//
// * {{{text, html}}} : language name
// * {{{data}}} : language code
//
// {{{getLangName(code)}}}
// returns the corresponding language name for {{{code}}}.

var noun_type_lang_google = CmdUtils.NounType("language", {
  Arabic: "ar",
  Bulgarian: "bg",
  Catalan: "ca",
  "Chinese Simplified": "zh-CN",
  "Chinese Traditional": "zh-TW",
  Croatian: "hr",
  Czech: "cs",
  Danish: "da",
  Dutch: "nl",
  English: "en",
  Estonian: "et",
  Filipino: "tl",
  Finnish: "fi",
  French: "fr",
  German: "de",
  Greek: "el",
  Hebrew: "iw",
  Hindi: "hi",
  Hungarian: "hu",
  Icelandic: "is",
  Indonesian: "id",
  Italian: "it",
  Japanese: "ja",
  Korean: "ko",
  Latvian: "lv",
  Lithuanian: "lt",
  Norwegian: "no",
  Polish: "pl",
  Portuguese: "pt",
  Romanian: "ro",
  Russian: "ru",
  Serbian: "sr",
  Slovak: "sk",
  Slovenian: "sl",
  Spanish: "es",
  Swedish: "sv",
  Thai: "th",
  Turkish: "tr",
  Ukrainian: "uk",
  Urdu: "ur",
  Vietnamese: "vi",
});

// from http://meta.wikimedia.org/wiki/List_of_Wikipedias
// omitting ones with 100+ articles
var noun_type_lang_wikipedia = CmdUtils.NounType("language", {
  English: "en",
  German: "de",
  French: "fr",
  Polish: "pl",
  Japanese: "ja",
  Italian: "it",
  Dutch: "nl",
  Portuguese: "pt",
  Spanish: "es",
  Russian: "ru",
  Swedish: "sv",
  Chinese: "zh",
  "Norwegian (Bokmal)": "no",
  Finnish: "fi",
  Catalan: "ca",
  Ukrainian: "uk",
  Turkish: "tr",
  Czech: "cs",
  Hungarian: "hu",
  Romanian: "ro",
  Volapuk: "vo",
  Esperanto: "eo",
  Danish: "da",
  Slovak: "sk",
  Indonesian: "id",
  Arabic: "ar",
  Korean: "ko",
  Hebrew: "he",
  Lithuanian: "lt",
  Vietnamese: "vi",
  Slovenian: "sl",
  Serbian: "sr",
  Bulgarian: "bg",
  Estonian: "et",
  Persian: "fa",
  Croatian: "hr",
  "Simple English": "simple",
  "Newar / Nepal Bhasa": "new",
  Haitian: "ht",
  "Norwegian (Nynorsk)": "nn",
  Galician: "gl",
  Thai: "th",
  Telugu: "te",
  Greek: "el",
  Malay: "ms",
  Basque: "eu",
  Cebuano: "ceb",
  Hindi: "hi",
  Macedonian: "mk",
  Georgian: "ka",
  Latin: "la",
  Bosnian: "bs",
  Luxembourgish: "lb",
  Breton: "br",
  Icelandic: "is",
  "Bishnupriya Manipuri": "bpy",
  Marathi: "mr",
  Albanian: "sq",
  Welsh: "cy",
  Azeri: "az",
  "Serbo-Croatian": "sh",
  Tagalog: "tl",
  Latvian: "lv",
  Piedmontese: "pms",
  Bengali: "bn",
  "Belarusian (Tarashkevitsa)": "be-x-old",
  Javanese: "jv",
  Tamil: "ta",
  Occitan: "oc",
  Ido: "io",
  Belarusian: "be",
  Aragonese: "an",
  "Low Saxon": "nds",
  Sundanese: "su",
  Sicilian: "scn",
  Neapolitan: "nap",
  Kurdish: "ku",
  Asturian: "ast",
  Afrikaans: "af",
  "West Frisian": "fy",
  Swahili: "sw",
  Walloon: "wa",
  Cantonese: "zh-yue",
  Samogitian: "bat-smg",
  Quechua: "qu",
  Urdu: "ur",
  Chuvash: "cv",
  Ripuarian: "ksh",
  Malayalam: "ml",
  Tajik: "tg",
  Irish: "ga",
  Venetian: "vec",
  Tarantino: "roa-tara",
  "Waray-Waray": "war",
  Uzbek: "uz",
  "Scottish Gaelic": "gd",
  Kapampangan: "pam",
  Kannada: "kn",
  Maori: "mi",
  Yiddish: "yi",
  Yoruba: "yo",
  Gujarati: "gu",
  Nahuatl: "nah",
  Lombard: "lmo",
  Corsican: "co",
  Gilaki: "glk",
  "Upper Sorbian": "hsb",
  "Min Nan": "zh-min-nan",
  Aromanian: "roa-rup",
  Alemannic: "als",
  Interlingua: "ia",
  Limburgian: "li",
  Armenian: "hy",
  Sakha: "sah",
  Kazakh: "kk",
  Tatar: "tt",
  Gan: "gan",
  Sanskrit: "sa",
  Turkmen: "tk",
  Wu: "wuu",
  "Dutch Low Saxon": "nds-nl",
  Faroese: "fo",
  "West Flemish": "vls",
  Norman: "nrm",
  Ossetian: "os",
  Voro: "fiu-vro",
  Amharic: "am",
  Romansh: "rm",
  Banyumasan: "map-bms",
  Pangasinan: "pag",
  Divehi: "dv",
  Mongolian: "mn",
  "Egyptian Arabic": "arz",
  "Northern Sami": "se",
  Zazaki: "diq",
  Nepali: "ne",
  Friulian: "fur",
  Manx: "gv",
  Scots: "sco",
  Ligurian: "lij",
  Novial: "nov",
  Bavarian: "bar",
  Bihari: "bh",
  Maltese: "mt",
  Ilokano: "ilo",
  Pali: "pi",
  "Classical Chinese": "zh-classical",
  Khmer: "km",
  "Franco-Provencal/Arpitan": "frp",
  Mazandarani: "mzn",
  Kashubian: "csb",
  Ladino: "lad",
  "Pennsylvania German": "pdc",
  Uyghur: "ug",
  Cornish: "kw",
  Sinhalese: "si",
  "Anglo-Saxon": "ang",
  Hawaiian: "haw",
  Tongan: "to",
  Sardinian: "sc",
  "Central_Bicolano": "bcl",
  Komi: "kv",
  Punjabi: "pa",
  Pashto: "ps",
  Silesian: "szl",
  Interlingue: "ie",
  Malagasy: "mg",
  Guarani: "gn",
  Lingala: "ln",
  Burmese: "my",
  "Fiji Hindi": "hif",
}, "^_");

for each (let ntl in [noun_type_lang_google, noun_type_lang_wikipedia]) {
  ntl._code2name = ntl._list.reduce(function (o, s) {
    o[s.data] = s.text;
    return o;
  }, {});
  ntl.getLangName = function getLangName(langCode) this._code2name[langCode];
}
{
  let locale = /^\w+/(Application.prefs.getValue("general.useragent.locale",
                                                 "en")) + "";
  let langName = noun_type_lang_wikipedia.getLangName(locale);
  if (langName)
    noun_type_lang_wikipedia._defaults.push(
      CmdUtils.makeSugg(langName, null, locale));
}

// === {{{ NounAsync }}} ===
//
// {{{NounAsync}}} is a utility function used in a couple of newer nountypes.

function NounAsync(label, checker, acceptAnything) {
  function asyncSuggest(text, html, callback, selectionIndices) {
    var returnArr = [checker(text, callback, selectionIndices)];
    if (acceptAnything) {
      returnArr.push(CmdUtils.makeSugg(text, html, null, .3,
                                       selectionIndices));
    }
    return returnArr;
  };
  return {
    label: label,
    rankLast: true,
    suggest: (CmdUtils.parserVersion > 1
              ? asyncSuggest
              : noun_arb_text.suggest),
  };
}

// === {{{ noun_type_async_restaurant }}} ===
//
// **//FIXME//**
//
// * {{{text}}} :
// * {{{html}}} :
// * {{{data}}} :

var noun_type_async_restaurant = NounAsync("restaurant", getRestaurants, true);

function getRestaurants(query, callback, selectionIndices) {
  if (query.length == 0) return;

  var baseUrl = "http://api.yelp.com/business_review_search";
  var queryToMatch = query.toLowerCase().replace(/\s+/g, '');
  var near = "";
  var loc = CmdUtils.getGeoLocation();
  if (loc)
    near = loc.city + "," + loc.state;

  var params = Utils.paramsToString({
    term: query,
    num_biz_requested: 1,
    location: near,
    category: "restaurants",
    ywsid: "HbSZ2zXYuMnu1VTImlyA9A"
  });

  var asyncRequest = jQuery.ajax({
    url: baseUrl+params,
    dataType: "json",
    error: function () {
      callback([]);
    },
    success: function (data) {
      var allBusinesses = data.businesses.map(
        function (business) {
          return {name: business.name.toLowerCase().replace(/\s+/g, ''),
            categories: business.categories};
        });
      // if the business's name or category overlaps with the query
      // then consider it a restaurant match
      for each (business in allBusinesses) {
        if (business.name.indexOf(queryToMatch) !== -1 ||
            queryToMatch.indexOf(business.name) !== -1) {
              callback([CmdUtils.makeSugg(query, query, null, .9,
                                          selectionIndices)]);
              return;
        }
        else {
          for each (category in business.categories) {
            if (category.name.indexOf(queryToMatch) !== -1 ||
              queryToMatch.indexOf(category.name) !== -1) {
              callback([CmdUtils.makeSugg(query, query, null, .9,
                                          selectionIndices)]);
              return;
            }
          }
        }
      }
      callback([]);
    }
  });
  return asyncRequest;
}

// === {{{ noun_type_async_address }}} ===
//
// **//FIXME//**
//
// * {{{text}}} :
// * {{{html}}} :
// * {{{data}}} :

var noun_type_async_address = NounAsync("address", getLegacyAddress, true);

function getLegacyAddress(query, callback, selectionIndices) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = Utils.paramsToString({
    location: query,
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--"
  });
  var asyncRequest = jQuery.ajax({
    url: url+params,
    dataType: "xml",
    error: function () {
      callback([]);
    },
    success:function (data) {
      var results = jQuery(data).find("Result");
      var allText = jQuery.makeArray(
        jQuery(data)
        .find(":contains('')")
        .map(function () this.textContent.toLowerCase()));

      // TODO: Handle non-abbriviated States. Like Illinois instead of IL.

      if (results.length === 0){
        callback([]);
        return;
      }

      function existsMatch(text) {
        var joinedText = allText.join(" ");
        return joinedText.indexOf(text.toLowerCase()) !== -1;
      }

      var missCount = 0;

      var queryWords = query.match(/\w+/g);
      for (var i = 0, l = queryWords.length; i < l; ++i) {
        if (!existsMatch(queryWords[i])) {
          missCount += 1;
        }
      }

      var missRatio = missCount / queryWords.length;

      if (missRatio < .5)
        callback(CmdUtils.makeSugg(query, query, null, 0.9,
                                   selectionIndices));
      else
        callback([]);
    }
  });
  return asyncRequest;
}


var noun_type_geo_country = NounAsync("country", getCountry, false);
function getCountry(query, callback, selectionIndices) {
  return getGeo(query, callback, selectionIndices, 1, 1);
}

// The region
// Think American states, provinces in many countries, Japanese prefectures.
var noun_type_geo_region = NounAsync("region", getRegion, false);
function getRegion(query, callback, selectionIndices) {
  return getGeo(query, callback, selectionIndices, 2, 2);
}

// The subregion
var noun_type_geo_subregion = NounAsync("subregion", getSubregion, false);
function getSubregion(query, callback, selectionIndices) {
  return getGeo(query, callback, selectionIndices, 3, 3);
}

var noun_type_geo_town = NounAsync("city/town", getTown, false);
function getTown(query, callback, selectionIndices) {
  return getGeo(query, callback, selectionIndices, 4, 4);
}

var noun_type_geo_postal = NounAsync("postal code", getPostal, false);
function getPostal(query, callback, selectionIndices) {
  return getGeo(query, callback, selectionIndices, 5, 5);
}

var noun_type_geo_address = NounAsync("address", getAddress, false);
function getAddress(query, callback, selectionIndices) {
  return getGeo(query, callback, selectionIndices, 6, 9);
}

function getGeo(query, callback, selectionIndices, minAccuracy, maxAccuracy) {
  var url = "http://maps.google.com/maps/geo";
  var params = {
    q: query,
    output: "json",
    oe: "utf8",
    sensor: "false",
    key: "ABQIAAAAzBIC_wxmje-aKLT3RzZx7BQFk1cXV-t8vQsDjFX6X7KZv96YRxSFucHgmE5u4oZ5fuzOrPHpaB_Z2w"
  };
  var asyncRequest = jQuery.ajax({
    url: url,
    data: params,
    dataType: "json",
    error: function () {
      callback([]);
    },
    success: function (data) {
      // if no results found, accept whatever input with a low score (0.3)
      if (data.Status.code != "200" ||
          (data.Placemark && data.Placemark.length == 0)) {
        callback(CmdUtils.makeSugg(text, html, null, .3,
                                       selectionIndices));
        return;
      }

      var returnArr = [];
      var unusedResults = [];

      var results = data.Placemark;
      for each (let result in results) {
        // if there are no AddressDetails, it has no accuracy value either
        // so let's ignore it.
        if (!result.AddressDetails)
          continue;

        if (result.address.toLowerCase()
            .indexOf(query.toLowerCase()) === 0) {
          var score = CmdUtils.matchScore(
            {input: result.address, index: 0, 0: query});
          score *= accuracyScore(result.AddressDetails.Accuracy,
                                 minAccuracy, maxAccuracy);
          returnArr.push(formatGooglePlacemark(result.address,result,score));
        }
        else {
          unusedResults.push(result);
        }
      }

      // if none of the results matched the input, let's take the first
      // one's data with the original input, but with a penalty.
      // TODO: See if this is a Bad Idea and think of a Good Idea.
      if (!returnArr.length && unusedResults.length) {
        var result = unusedResults[0];
        var score = 0.7 * accuracyScore(result.AddressDetails.Accuracy,
                                        minAccuracy, maxAccuracy);
        returnArr.push(formatGooglePlacemark(query,unusedResults[0],score));
      }

      callback(returnArr);
    }
  });
  return asyncRequest;
}

// used by getGeo
function accuracyScore(score, minAccuracy, maxAccuracy) {
  return (score === minAccuracy
          ? 1
          : Math.pow(0.8, Math.abs(minAccuracy - score)));
}

// used by getGeo
function formatGooglePlacemark(text,placemark,score,selectionIndices) {
  var ad = placemark.AddressDetails;
  var data = {coordinates: {lat: placemark.Point.coordinates[1],
                            lng: placemark.Point.coordinates[0]},
              address: {}, accuracy: ad.Accuracy};

  if (ad.Country) {
    data.address.country = ad.Country.CountryName;
    data.address.countryCode = ad.Country.CountryNameCode;

    var nodesToCrawl = [ad.Country];

    while (nodesToCrawl[0]) {
      dump('ntc length:'+nodesToCrawl.length+'\n');
      var thisNode = nodesToCrawl[0];
      nodesToCrawl = nodesToCrawl.slice(1);

      for (let id in thisNode) {
        dump('id: '+id+'\n');
        if (id.indexOf("Name") > -1) {
          var newId  = id[0].toLowerCase() + id.slice(1);
          newId = newId.replace("Name", "");
          data.address[newId] = thisNode[id];
        }
        else {
          if (typeof thisNode[id] !== "string")
            nodesToCrawl.push(thisNode[id]);
        }
      }
    }
  }

  return CmdUtils.makeSugg(text, text, data, score, selectionIndices);
}

var EXPORTED_SYMBOLS = (
  [it for (it in Iterator(this)) if (/^noun_/.test(it[0]))]
  .map(function ([sym, noun], i) {
    noun.id = "#" + sym;
    noun.name = /^noun_(?:type_)?(.*)/(sym)[1];
    return sym;
  }, this));

// ** DEPRECATED ** \\
// {{{noun_type_language}}}\\
// {{{noun_type_commands}}}\\
// {{{noun_type_emailservice}}}\\
// {{{noun_type_searchengine}}}
for (let [old, now] in Iterator({
  language: noun_type_lang_google,
  commands: noun_type_command,
  emailservice: noun_type_email_service,
  searchengine: noun_type_search_engine,
})) {
  let sym = "noun_type_" + old;
  this[sym] = now;
  EXPORTED_SYMBOLS.push(sym);
}
