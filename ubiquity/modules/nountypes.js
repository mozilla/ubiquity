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
// ** {{{label}}} (, {{{name}}}, {{{id}}})

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/cmdutils.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://gre/modules/utils.js");

// ** {{{ noun_arb_text }}} **
//
// Suggests the input as is.
//
// {{{text, html}}} : The user input.

var noun_arb_text = {
  label: "?",
  rankLast: true,
  suggest: function(text, html, callback, selectionIndices) {
    return [CmdUtils.makeSugg(text, html, null, 0.7, selectionIndices)];
  },
  // hack to import feed-specific globals into this module
  loadGlobals: function(source) {
    var target = (function() this)();
    for each (let p in ["Utils", "CmdUtils",
                        "Application", "jQuery", "Date"])
      target[p] = source[p];
    this.loadGlobals = function(){};
  }
};

// ** {{{ noun_type_email_service }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_email_service = CmdUtils.NounType("email service",
                                                "googleapps gmail yahoo",
                                                "gmail");

// ** {{{ noun_type_email }}} **
//
// Suggests an email address (RFC2822 minus domain-lit).
// The regex is taken from:
// http://blog.livedoor.jp/dankogai/archives/51190099.html
//
// {{{text, html, data}}} : The email address.

var noun_type_email = CmdUtils.NounType(
  "email",
  let (atom = "[\\w!#$%&'*+/=?^`{}~|-]+") RegExp(
    "^(?:(?:(?:(?:" + atom + ")(?:\\.(?:" + atom +
    '))*)|(?:\\"(?:\\\\[^\\r\\n]|[^\\\\\\"])*\\")))@(?:(?:(?:' +
    atom + ")(?:\\.(?:" + atom + "))*))$"));

// ** {{{ noun_type_percentage }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_percentage = {
  label: "percentage",
  _default: CmdUtils.makeSugg("100%", null, 1.0),
  "default": function() this._default,
  suggest: function(text, html) {
    if (!text)
      return [];
    var number = parseFloat(text);
    if (isNaN(number))
      return [];
    if (number > 1 && text.indexOf(".") == -1)
      number /= 100;
    text = number*100 + "%";
    return [CmdUtils.makeSugg(text, null, number)];
  }
};

// ** {{{ noun_type_tab }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_tab = {
  label: "title or URL",
  suggest: function(text, html, cb, selectedIndices)(
    [CmdUtils.makeSugg(tab.document.title || tab.document.URL,
                       null, tab, selectedIndices)
     for each (tab in Utils.tabs.search(text, CmdUtils.maxSuggestions))]),
};

// ** {{{ noun_type_search_engine }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_search_engine = {
  label: "search engine",
  default: function() this._makeSugg(this._BSS.defaultEngine),
  suggest: function(text) {
    var suggs = this._BSS.getVisibleEngines({}).map(this._makeSugg);
    return CmdUtils.grepSuggs(text, suggs);
  },
  _BSS: (Cc["@mozilla.org/browser/search-service;1"]
         .getService(Ci.nsIBrowserSearchService)),
  _makeSugg: function(engine) CmdUtils.makeSugg(engine.name, null, engine),
};

// ** {{{ noun_type_tag }}} **
//
// Suggests the input as comma separated tags,
// plus completions based on existing tags.
// Defaults to all tags.
//
// * {{{text, html}}} : comma separated tags
// * {{{data}}} : an array of tags

var noun_type_tag = {
  label: "tag1[,tag2 ...]",
  default: function() [CmdUtils.makeSugg(tag, null, [tag])
                       for each (tag in PlacesUtils.tagging.allTags)],
  suggest: function(text) {
    text = Utils.trim(text);
    if (!text) return [];

    var {allTags} = PlacesUtils.tagging;
    // can accept multiple tags, seperated by a comma
    // assume last tag is still being typed - suggest completions for that
    var completedTags = text.split(/\s{0,},\s{0,}/);
    // separate last tag in fragment, from the rest
    var uncompletedTag = completedTags.pop();
    completedTags = completedTags.filter(Boolean);

    var suggs = [CmdUtils.makeSugg(null, null,
                                   (uncompletedTag
                                    ? completedTags.concat(uncompletedTag)
                                    : completedTags))];
    if (uncompletedTag) {
      let utag = uncompletedTag.toLowerCase();
      for each (let tag in allTags)
        // only match from the beginning of a tag name (not the middle)
        if (tag.length > utag.length &&
            tag.toLowerCase().indexOf(utag) === 0)
          suggs.push(CmdUtils.makeSugg(null, null, completedTags.concat(tag)));
    }
    return suggs;
  }
};

// ** {{{ noun_type_awesomebar }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_awesomebar = {
  label: "query",
  rankLast: true,
  suggest: function(text, html, callback, selectedIndices) {
    if (!text) return [];
    Utils.history.search(text, function(results) {
      if (results.length)
        callback([CmdUtils.makeSugg(r.title, null, r, .9)
                  for each (r in results)]);
    }, CmdUtils.maxSuggestions);
    return [CmdUtils.makeSugg(text, html,
                              {url: text, title: text, favicon: ""},
                              .7, selectedIndices)];
  }
};

// ** {{{ noun_type_url }}} **
//
// Suggests a URL from the user's input and/or history.
// Defaults to the current page's URL if no input is given.
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_url = {
  label: "url",
  rankLast: true,
  default: function()(
    CmdUtils.makeSugg(Application.activeWindow.activeTab.uri.spec)),
  suggest: function(text, html, callback, selectionIndices) {
    var url = text;
    if (/^(?![A-Za-z][A-Za-z\d.+-]*:)/.test(url)) {
      let p = "http://", n = p.length;
      url = p + url;
      if (selectionIndices) selectionIndices = [n, n + url.length];
    }
    Utils.history.search(text, function(results) {
      if (results.length)
        callback([CmdUtils.makeSugg(r.url, null, null, .9)
                  for each (r in results)]);
    }, CmdUtils.maxSuggestions);
    return [CmdUtils.makeSugg(url, null, null, .7, selectionIndices)];
  }
};

// ** {{{ noun_type_livemark }}} **
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
  suggest: function(text, html, cb, selected) {
    if (selected || !text) return [];

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

// ** {{{ noun_type_command }}} **
//
// Suggests each installed command whose name matches the input.
//
// * {{{text, html}}} : command name
// * {{{data}}} : command object

var noun_type_command = {
  label: "name",
  suggest: function(text, html, cb, selected) {
    if (selected || !text) return [];
    return (CmdUtils.grepSuggs(text,
                               this._cmdSource.getAllCommands(),
                               "name")
            .map(this._makeSugg));
  },
  _cmdSource: UbiquitySetup.createServices().commandSource,
  _makeSugg: function(cmd)
    CmdUtils.makeSugg(cmd.name,
                      ((cmd.description || "") +
                       ("<p>" + (cmd.help || "") + "</p>")),
                      cmd),
};

// ** {{{ noun_type_twitter_user }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_twitter_user = {
  label: "user",
  rankLast: true,
  suggest: function(text, html, cb, selected) {
    // reject text from selection.
    if (!text || selected)
      return [];

    var suggs = CmdUtils.grepSuggs(text, this.logins());
    // only letters, numbers, and underscores are allowed in twitter
    // usernames.
    if (/^[a-z0-9_]+$/i.test(suggs))
      suggs.push(CmdUtils.makeSugg(text, null, {}, 0.7));
    return suggs;
  },
  logins: function(reload) {
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

// ** {{{ noun_type_number }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_number = {
  label: "number",
  suggest: function(text) {
    var num = +text;
    return isNaN(num) ? [] : [CmdUtils.makeSugg(text, null, num)];
  },
  "default": function() {
    return CmdUtils.makeSugg("1", null, 1, 0.9);
  }
};

// ** {{{ noun_type_bookmarklet }}} **
//
// Suggests each bookmarklet whose title matches the input.
//
// * {{{text, html}}} : bookmarklet title
// * {{{data}}} : bookmarklet (pseudo) url

var noun_type_bookmarklet = {
  label: "title",
  suggest: function(text, html, cb, selected) {
    if (selected || !text) return [];
    return CmdUtils.grepSuggs(text, this.list);
  },
  list: null,
  load: function(reload) {
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

// ** {{{ noun_type_date }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_date = {
  label: "date",
  'default': function(){
     var date = Date.parse("today");
     var text = date.toString("dd MM, yyyy");
     return CmdUtils.makeSugg(text, null, date, 0.9);
   },
  suggest: function( text, html )  {
    if (typeof text != "string") {
      return [];
    }

    var date = Date.parse( text );
    if (!date) {
      return [];
    }
    text = date.toString("dd MM, yyyy");
    return [ CmdUtils.makeSugg(text, null, date) ];
  }
};

// ** {{{ noun_type_time }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_time = {
  label: "time",
  "default": function() {
    var time = Date.parse("now");
    var text = time.toString("hh:mm tt");
    return CmdUtils.makeSugg(text, null, time, 0.9);
  },
  suggest: function(text, html) {
    var time = Date.parse(text);
    return !time ? [] : [CmdUtils.makeSugg(time.toString("hh:mm tt"),
                                           null,
                                           time)];
  }
};

// ** {{{ noun_type_async_address }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_async_address = {
  label: "address",
  ajaxRequest: null,
  suggest: function(text, html, callback) {
    this.ajaxRequest = getAddress( text, function( truthiness ) {
      if (truthiness) {
        callback([CmdUtils.makeSugg(text)]);
      }
    });
    return [];
  }
};

// ** {{{ noun_type_async_restaurant }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_async_restaurant = {
  label: "restaurant",
  ajaxRequest: null,
  suggest: function(text, html, callback) {
    this.ajaxRequest = getRestaurants( text, function( truthiness, suggestion ) {
      if (truthiness) {
        callback([CmdUtils.makeSugg(text)]);
      }
    });
    return [];
  }
};

// ** {{{ noun_type_contact }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_contact = {
  label: "name or email",
  _list: null,
  _callback: function(contacts) {
    var {_list} = noun_type_contact;
    for each (var {name, email} in contacts) {
      var htm = <>{name} &lt;{email}&gt;</>.toXMLString();
      _list.push({
        text: email, html: htm, data: name, summary: htm, score: 0.9,
        key: name + "\n" + email});
    }
  },
  suggest: function(text) {
    if (!this._list) {
      this._list = [];
      getContacts(this._callback);
      return noun_arb_text.suggest.apply(noun_arb_text, arguments);
    }
    return (CmdUtils.grepSuggs(text, this._list, "key")
            .concat(noun_type_email.suggest.apply(noun_type_email,
                                                  arguments)));
  }
};

// ** {{{ noun_type_geolocation }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

var noun_type_geolocation = {
  label: "geolocation",
  rankLast: true,
  'default': function() {
    var location = CmdUtils.getGeoLocation();
    if (!location) {
      // TODO: there needs to be a better way of doing this,
      // as default() can't currently return null
      return CmdUtils.makeSugg("", "", null, 0.9);
    }
    var fullLocation = location.city + ", " + location.country;
    return CmdUtils.makeSugg(fullLocation, null, null, 0.9);
  },
  suggest: function(fragment, html, callback) {
    // LONGTERM TODO: try to detect whether fragment is anything like
    // a valid location or not, and don't suggest anything
    // for input that's not a location.
    function addAsyncGeoSuggestions(location) {
      if(!location)
        return;
      var fullLocation = location.city + ", " + location.country;
      callback([CmdUtils.makeSugg(fullLocation),
                CmdUtils.makeSugg(location.city),
                CmdUtils.makeSugg(location.country)]);
    }
    if (/\bhere\b/.test(fragment)) {
      CmdUtils.getGeoLocation(addAsyncGeoSuggestions);
    }
    return [CmdUtils.makeSugg(fragment)];
  }
};

// ** {{{ noun_type_lang_google }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

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

// ** {{{ noun_type_lang_wikipedia }}} **
//
// **//FIXME//**
//
// {{{text}}}
//
// {{{html}}}
//
// {{{data}}}

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
  jQuery.get(
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

  jQuery.get(url, params, function(data) {

    var contacts = [];
    for each( var line in jQuery(data).find("ct") ){
      var name = jQuery(line).attr("yi");
      //accept it as as long as it is not undefined
      if(name){
        var contact = {};
        contact["name"] = name;
        contact["email"] = name + "@yahoo.com"; //TODO: what about yahoo.co.uk or ymail?
        contacts.push(contact);
      }
    }

    callback(contacts);
  }, "text");
}

function getContacts(callback) {
  getGmailContacts(callback);
  //getYahooContacts(callback);
}

function getRestaurants(query, callback){
  if (query.length == 0) return;

  var baseUrl = "http://api.yelp.com/business_review_search";
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
  
  var ajaxRequest = jQuery.ajax({
    url: baseUrl+params,
    dataType: "json",
    error: function() {
      callback( false, null );
    },
    success: function(data) {
      var allBusinesses = data.businesses.map(function(business)
                                              { return business.name });
      if (allBusinesses.length > 0){
        callback( true, allBusinesses[0] );
      }
      else{
        callback( false, allBusinesses[0] );
      }
    }
  });
  return ajaxRequest;
}

function getAddress( query, callback ) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = Utils.paramsToString({
    location: query,
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--"
  });
  var ajaxRequest = jQuery.ajax({
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
  return ajaxRequest;
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
