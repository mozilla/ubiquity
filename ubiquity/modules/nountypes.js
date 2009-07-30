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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/cmdutils.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://gre/modules/utils.js");

// === {{{ noun_arb_text }}} ===
//
// Suggests the input as is.
//
// * {{{text, html}}} : user input

var noun_arb_text = {
  label: "?",
  rankLast: true,
  noExternalCalls: true,
  suggest: function nat_suggest(text, html, callback, selectionIndices) {
    return [CmdUtils.makeSugg(text, html, null, 0.3, selectionIndices)];
  },
  // hack to import feed-specific globals into this module
  // see feed-parts/header/nountypes.js
  loadGlobals: function nat_loadGlobals(source) {
    var target = (function() this)();
    for each (let p in ["Utils", "CmdUtils", "Application", "jQuery", "Date"])
      target[p] = source[p];
    this.loadGlobals = function(){};
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
// * {{{data}}} : match array

var noun_type_email = CmdUtils.NounType(
  "email",
  let (atom = "[\\w!#$%&'*+/=?^`{}~|-]+") RegExp(
    "^(?:(?:(?:(?:" + atom + ")(?:\\.(?:" + atom +
    '))*)|(?:\\"(?:\\\\[^\\r\\n]|[^\\\\\\"])*\\")))@(?:(?:(?:' +
    atom + ")(?:\\.(?:" + atom + "))*))$"));

// === {{{ noun_type_percentage }}} ===
//
// Suggests a percentage value.
//
// * {{{text, html}}} : "?%"
// * {{{data}}} : a float number

var noun_type_percentage = {
  label: "percentage",
  noExternalCalls: true,
  _default: CmdUtils.makeSugg("100%", null, 0.3),
  "default": function nt_percentage_default() this._default,
  suggest: function nt_percentage_suggest(text, html) {
    var number = parseFloat(text);
    if (isNaN(number))
      return [];

    var numOfOkayChars = text.replace(/[^\d%.]/g,'').length;
    var score = numOfOkayChars / (text.length);
    if (text.indexOf("%") < 0)
      score *= 0.9;
    
    var returnArr = [CmdUtils.makeSugg(number+"%", null, number, score)];
    
    // if the number's below 1 and there's no
    // % sign, also try interpreting it as a proportion instead of a 
    // percent and offer it as a suggestion as well, but with a lower
    // score.
    if (text.indexOf("%") < 0 && (number <= 1))
      returnArr.push(
        CmdUtils.makeSugg(number*100+"%", null, number*100, score * 0.9));
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
  _sugg: function(engine, score) (
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

    for each (tag in completedTags) {
      if (lowercaseAllTags.indexOf(tag.toLowerCase()) > -1)
        // if preexisting tag, boost score
        score = Math.pow(score, 0.5);
    }

    var suggs = [CmdUtils.makeSugg(null, null,
                                   (uncompletedTag
                                    ? completedTags.concat(uncompletedTag)
                                    : completedTags),
                       (uncompletedTag && lowercaseAllTags.indexOf(utag) > -1)
                       ? Math.pow(score, 0.5)
                       : score )];
    if (uncompletedTag) {
      for each (let tag in allTags)
        // only match from the beginning of a tag name (not the middle)
        if (tag.length > utag.length &&
            tag.toLowerCase().indexOf(utag) === 0)
          suggs.push(CmdUtils.makeSugg(null, null,
                                       completedTags.concat(tag),
                                       Math.pow(score, 0.5)));
    }
    return suggs;
  }
};

// === {{{ noun_type_awesomebar }}} ===
//
// Suggests "Awesome Bar" query results.
// Also suggests the input back with empty data.
//
// * {{{text, html}}} : title or input
// * {{{data}}} : a query result
//   (see [[#modules/utils.js|Utils]]{{{.history.search}}})

var noun_type_awesomebar = {
  label: "query",
  rankLast: true,
  noExternalCalls: true,
  suggest: function nt_awesome_suggest(text, html, callback, selectedIndices) {
    if (!text) return [];
    var reqObj = {readyState: 2};
    
    Utils.history.search(text, function(results){
      reqObj.readyState = 4;
      var returnArr = [];
      for each (r in results) {

        var urlMatch = r.url.match(text);
        if (urlMatch != null)
          urlScore = CmdUtils.matchScore(urlMatch);
        else
          urlScore = 0;

        var titleMatch = r.title.match(text);
        if (titleMatch != null)
          titleScore = CmdUtils.matchScore(titleMatch);
        else
          titleScore = 0;

        if (!urlScore && !titleScore)
          continue;

        if (urlScore >= titleScore)
          returnArr.push(CmdUtils.makeSugg(r.url, r.url, r, urlScore));
        else
          returnArr.push(CmdUtils.makeSugg(r.title, r.title, r, titleScore));
      }
      callback(returnArr);
    });
    
    return [reqObj];
  }
};

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
  default: function nt_url_default() (
    CmdUtils.makeSugg(Application.activeWindow.activeTab.uri.spec,
                      null, null, 0.5)),
  suggest: function nt_url_suggest(text, html, callback, selectionIndices) {
    var url = text;
    if (/^(?![A-Za-z][A-Za-z\d.+-]*:)/.test(url)) {
      let p = "http://";
      url = p + url;
      if (selectionIndices) {
        let {length} = p;
        selectionIndices[0] += length;
        selectionIndices[1] += length;
      }
    }
    Utils.history.search(text, function nt_url_search(results) {
      if (results.length)
        callback([CmdUtils.makeSugg(r.url, null, null, .9)
                  for each (r in results)]);
    });
    return [CmdUtils.makeSugg(url, null, null, .5, selectionIndices)];
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
// {{{feeds} is the getter for all livemarks.

var noun_type_livemark = {
  label: "title",
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
  get feeds()(Cc["@mozilla.org/browser/annotation-service;1"]
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
  suggest: function nt_twuser_suggest(text, html, cb, selected) {
    // reject text from selection.
    if (!text || selected)
      return [];

    var suggs = CmdUtils.grepSuggs(text, this.logins());
    // only letters, numbers, and underscores are allowed in twitter
    // usernames.
    if (/^\w+$/.test(text))
      suggs.push(CmdUtils.makeSugg(text, null, {}, 0.5));
    return suggs;
  },
  logins: function nt_twuser_logins(reload) {
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
      if(/^javascript:/.test(node.uri) &&
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

var noun_type_date = {
  label: "date",
  noExternalCalls: true,
  "default": function() this._sugg(Date.parse("today")),
  suggest: function nt_date_suggest(text) {
    var date = Date.parse(text);
    return date ? [this._sugg(date)] : [];
  },
  _sugg: function nt_date__sugg(date)
    CmdUtils.makeSugg(date.toString("yyyy-MM-dd"), null, date),
};

var noun_type_time = {
  label: "time",
  noExternalCalls: true,
  "default": function nt_time_default() {
    var time = Date.parse("now");
    var text = time.toString("hh:mm tt");
    return CmdUtils.makeSugg(text, null, time, 0.5);
  },
  suggest: function nt_time_suggest(text, html) {
    var time = Date.parse(text);
    return !time ? [] : [CmdUtils.makeSugg(time.toString("hh:mm tt"),
                                           null,
                                           time)];
  }
};

// === {{{ noun_type_async_address }}} ===
//
// **//FIXME//**
//
// * {{{text}}} :
// * {{{html}}} :
// * {{{data}}} :

var noun_type_async_address = NounAsync("address", getAddress);

// === {{{ noun_type_async_restaurant }}} ===
//
// **//FIXME//**
//
// * {{{text}}} :
// * {{{html}}} :
// * {{{data}}} :

var noun_type_async_restaurant = NounAsync("restaurant", getRestaurants);

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
  _callback: function nt_contact__callback(contacts) {
    var {_list} = noun_type_contact;
    for each (var {name, email} in contacts) {
      var htm = <>{name} &lt;{email}&gt;</>.toXMLString();
      _list.push({
        text: email, html: htm, data: name, summary: htm, score: 0.9,
        _key: name + "\n" + email});
    }
  },
  suggest: function nt_contact_suggest(text) {
    var suggs = noun_type_email.suggest.apply(noun_type_email, arguments);
    if (!this._list) {
      this._list = [];
      getContacts(this._callback);
      return suggs;
    }
    return CmdUtils.grepSuggs(text, this._list, "_key").concat(suggs);
  }
};

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
    var fullLocation = ((location.city ? location.city + ", " : "")
                        + location.country);
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
    if (/^here$/i.test(text))
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
});

for each (let ntl in [noun_type_lang_google, noun_type_lang_wikipedia]) {
  ntl._code2name = ntl._list.reduce(function(o, s) {
    o[s.data] = s.text;
    return o;
  }, {});
  ntl.getLangName = function getLangName(langCode) this._code2name[langCode];
}

function getGmailContacts(callback) {
  var asyncRequest = jQuery.get(
    "https://mail.google.com/mail/contacts/data/export",
    {exportType: "ALL", out: "VCARD"},
    function(data) {
      var contacts = [], name = "";
      for each(var line in data.replace(/\r\n /g, '').split(/\r\n/))
        if(/^(FN|EMAIL).*?:(.*)/.test(line)){
          var {$1: key, $2: val} = RegExp;
          if(key === "FN")
            name = val;
          else
            contacts.push({name: name, email: val});
        }
      callback(contacts);
    },
    "text");
  return asyncRequest;
}

function getYahooContacts( callback ){
  var url = "http://us.mg1.mail.yahoo.com/yab";
  //TODO: I have no idea what these params mean
  var params = {
    v: "XM",
    prog: "ymdc",
    tags: "short",
    attrs: "1",
    xf: "sf,mf"
  };

  var asyncRequest = jQuery.get(url, params, function(data) {

    var contacts = [];
    for each( var line in jQuery(data).find("ct") ){
      var name = jQuery(line).attr("yi");
      //accept it as as long as it is not undefined
      if(name){
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

function getRestaurants(query, callback){
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
    error: function() {
      callback( false, null );
    },
    success: function(data) {
      var allBusinesses = data.businesses.map(
        function(business){
          return {name: business.name.toLowerCase().replace(/\s+/g, ''),
            categories: business.categories};
        });
      // if the business's name or category overlaps with the query
      // then consider it a restaurant match
      for each (business in allBusinesses){
        if(business.name.indexOf(queryToMatch) != -1 ||
           queryToMatch.indexOf(business.name) != -1){
              callback( true );
              return;
        }
        else{
          for each (category in business.categories){
            if(category.name.indexOf(queryToMatch) != -1 ||
              queryToMatch.indexOf(category.name) != -1){
              callback( true );
              return;
            }
          }
        }
      }
      callback( false );
    }
  });
  return asyncRequest;
}

function getAddress( query, callback ) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = Utils.paramsToString({
    location: query,
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--"
  });
  var asyncRequest = jQuery.ajax({
    url: url+params,
    dataType: "xml",
    error: function() {
      callback( false );
    },
    success:function(data) {
      var results = jQuery(data).find("Result");
      var allText = jQuery.makeArray(
                      jQuery(data)
                        .find(":contains('')")
                        .map( function(){ return jQuery(this).text().toLowerCase(); } )
                    );

      // TODO: Handle non-abbriviated States. Like Illinois instead of IL.

      if( results.length == 0 ){
        callback( false );
        return;
      }

      function existsMatch( text ){
        var joinedText = allText.join(" ");
        return joinedText.indexOf( text.toLowerCase() ) != -1;
      }

      var missCount = 0;

      var queryWords = query.match(/\w+/g);
      for( var i=0; i < queryWords.length; i++ ){
        if( existsMatch( queryWords[i] ) == false ) {
          missCount += 1;
          //displayMessage( queryWords[i] );
        }
      }

      var missRatio = missCount / queryWords.length;
      //displayMessage( missRatio );

      if( missRatio < .5 )
        callback( true );
      else
        callback( false );
    }
  });
  return asyncRequest;
}

function NounAsync(label, checker) {
  function asyncSuggest(text, html, callback, selectionIndices) (
    [CmdUtils.makeSugg(text, html, null, .5, selectionIndices),
     checker(text, function asyncBack(truthiness) {
       if(truthiness)
         callback([CmdUtils.makeSugg(text, html, null, .9, selectionIndices)]);
       else
	 callback([]);
     })]);
  return {
    label: label,
    rankLast: true,
    suggest: (CmdUtils.parserVersion > 1
              ? asyncSuggest
              : noun_arb_text.suggest),
  };
}

var EXPORTED_SYMBOLS = (
  [it for (it in Iterator(this)) if (/^noun_/.test(it[0]))]
  .map(function([sym, noun], i) {
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
