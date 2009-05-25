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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/cmdutils.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");

var noun_arb_text = {
  _name: "text",
  rankLast: true,
  suggest: function(text, html, callback, selectionIndices) {
    return [CmdUtils.makeSugg(text, html, null, 0.7, selectionIndices)];
  },
  // hack to import feed-specific globals into this module
  loadGlobals: function(source) {
    var target = (function() this)();
    for each (let p in ["Utils", "CmdUtils", "jQuery", "Date"])
      target[p] = source[p];
    this.loadGlobals = function(){};
  }
};

var noun_type_emailservice = CmdUtils.NounType("email service",
                                               "googleapps gmail yahoo",
                                               "gmail");

// from http://blog.livedoor.jp/dankogai/archives/51190099.html
var noun_type_email = CmdUtils.nounTypeFromRegExp(
  /^(?:(?:(?:(?:[a-zA-Z0-9_!#$%&\'*+/=?^`{}~|-]+)(?:\.(?:[a-zA-Z0-9_!#$%&\'*+/=?^`{}~|-]+))*)|(?:\"(?:\\[^\r\n]|[^\\\"])*\")))\@(?:(?:(?:[a-zA-Z0-9_!#$%&\'*+/=?^`{}~|-]+)(?:\.(?:[a-zA-Z0-9_!#$%&\'*+/=?^`{}~|-]+))*))$/,
"email");

var noun_type_percentage = {
  _name: "percentage",
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

/*
 * Noun type for searching links on the awesomebar database.
 * Right now, the suggestion returned is:
 *  -- text: title of the url
 *  -- html: the link
 *  -- data: the favicon
 *
 *  The code is totally based on Julien Couvreur's insert-link command (http://blog.monstuff.com/archives/000343.html)
 */

var noun_type_awesomebar = {
  _name: "url",
  suggest: function(part, html, callback){
     Utils.history.search(part, CmdUtils.maxSuggestions, function(result){
       callback(CmdUtils.makeSugg(result.url, result.title, result.favicon));
     });
  }
};

var noun_type_tab = {
  _name: "tab name",
  suggest: function(text, html, cb, selectedIndices)(
    [CmdUtils.makeSugg(tab.document.title || tab.document.URL,
                        null, tab, selectedIndices)
     for each (tab in Utils.tabs.search(text, CmdUtils.maxSuggestions))]),
};

var noun_type_searchengine = {
  _name: "search engine",
  suggest: function(fragment, html) {
    var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
      .getService(Components.interfaces.nsIBrowserSearchService);
    var engines = searchService.getVisibleEngines({});

    if (!fragment) {
      return engines.map(function(engine) {
        return CmdUtils.makeSugg(engine.name, null, engine);
      });
    }

    var fragment = fragment.toLowerCase();
    var suggestions = [];

    for(var i = 0; i < engines.length; i++) {
      if(engines[i].name.toLowerCase().indexOf(fragment) > -1) {
        suggestions.push(CmdUtils.makeSugg(engines[i].name, null, engines[i], 0.9));
      }
    }

    return suggestions;
  },
  getDefault: function() {
    return (Components.classes["@mozilla.org/browser/search-service;1"]
            .getService(Components.interfaces.nsIBrowserSearchService)
            .defaultEngine);
  }
};

var noun_type_tag = {
  _name: "tag-list",
  suggest: function(fragment) {
    var allTags = (Components.classes["@mozilla.org/browser/tagging-service;1"]
                   .getService(Components.interfaces.nsITaggingService)
                   .allTags);

    if(fragment.length < 1) {
      return allTags.map(function(tag) {
        return CmdUtils.makeSugg(tag, null, [tag]);
      });
    }

    fragment = fragment.toLowerCase();
    var numTags = allTags.length;
    var suggestions = [];

    // can accept multiple tags, seperated by a comma
    // assume last tag is still being typed - suggest completions for that

    var completedTags = fragment.split(",").map(function(tag) {
      return Utils.trim(tag);
    });;


    // separate last tag in fragment, from the rest
    var uncompletedTag = completedTags.pop();

    completedTags = completedTags.filter(function(tagName) {
      return tagName.length > 0;
    });
    var fragmentTags = "";
    if(completedTags.length > 0)
      fragmentTags = completedTags.join(",");

    if(uncompletedTag.length > 0) {
      if(fragmentTags.length > 0) {
        suggestions.push(CmdUtils.makeSugg(
          fragmentTags + "," + uncompletedTag,
          null,
          completedTags.concat([uncompletedTag])
         ));
       } else {
         suggestions.push(CmdUtils.makeSugg(
                             uncompletedTag,
                             null,
                             completedTags
                          ));
       }

    } else {
      suggestions.push(CmdUtils.makeSugg(
                         fragmentTags,
                         null,
                         completedTags
                       ));
    }

    for(var i = 0; i < numTags; i++) {
      // handle cases where user has/hasn't typed anything for the current uncompleted tag in the fragment
      // and only match from the begining of a tag name (not the middle)
      if(uncompletedTag.length < 1 || allTags[i].indexOf(uncompletedTag) == 0) {
        // only if its not in the list already
        if(completedTags.indexOf(allTags[i]) == -1)
          suggestions.push(CmdUtils.makeSugg(
                             fragmentTags + "," + allTags[i],
                             null,
                             completedTags.concat([allTags[i]])
         ));
      }
    }

    return suggestions;
  }
};

var noun_type_url = {
  /* TODO longterm, noun_type_url could suggest URLs you've visited before, by querying
   * the awesomebar's data source
   */
  _name : "url",
  rankLast: true,
  suggest: function(fragment) {
    var regexp = /^[A-Za-z][A-Za-z\d.+-]:\/\/(?:\w+:?\w*@)?(\S+)(?::\d+)?\/?/;
    // Magic words "page" or "url" result in the URL of the current page
    if (fragment == "page" || fragment == "url") {
      var url = Application.activeWindow.activeTab.document.URL;
      return [CmdUtils.makeSugg(url)];
    }
    // If it's a valid URL, suggest it back
    if (regexp.test(fragment)) {
      return [CmdUtils.makeSugg(fragment)];
    } else if (regexp.test( "http://" + fragment ) ) {
      return [CmdUtils.makeSugg("http://" + fragment)];
    }
    return [];
  }
};

var noun_type_livemark = {
  _name: "livemark",
  rankLast: true,

  /*
  * text & html = Livemark Title (string)
  * data = { itemIds : [] } - an array of itemIds(long long)
  * for the suggested livemarks.
  * These values can be used to reference the livemark in bookmarks & livemark
  * services
  */

  getFeeds: function() {

    //Find all bookmarks with livemark annotation
     return Components.classes["@mozilla.org/browser/annotation-service;1"]
        .getService(Components.interfaces.nsIAnnotationService)
        .getItemsWithAnnotation("livemark/feedURI", {});
  },

  'default': function() {
    var feeds = this.getFeeds();
    if( feeds.length > 0 ) {
       return CmdUtils.makeSugg("all livemarks", null, {itemIds: feeds});
    }
    return null;
  },

  suggest: function(fragment) {
    fragment = fragment.toLowerCase();

    var suggestions = [];
    var allFeeds = this.getFeeds();

    if(allFeeds.length > 0) {
      var bookmarks = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                                  .getService(Components.interfaces.nsINavBookmarksService);

      for(var i = 0; i < allFeeds.length; ++i) {
        var livemarkTitle = bookmarks.getItemTitle(allFeeds[i]).toLowerCase();
        if(livemarkTitle.toLowerCase().indexOf(fragment) > -1) {
          suggestions.push(CmdUtils.makeSugg(livemarkTitle , null,
                                         { itemIds: [allFeeds[i]] } )); //data.itemIds[]
        }
      }

      //option for all livemarks
      var all = "all livemarks";
      if(all.indexOf(fragment) > -1) {
        suggestions.push(CmdUtils.makeSugg( all , null, {itemIds: allFeeds} ));
      }
      return suggestions;
    }
    return [];
  }
};

var noun_type_commands = {
   _name: "command",
   __cmdSource : UbiquitySetup.createServices().commandSource,

   suggest : function(fragment){
      var cmds = [];
      for each( var cmd in this.__cmdSource.commandNames){
         if(cmd.name.match(fragment, "i")){
            var cmdObj = this.__cmdSource.getCommand(cmd.name);

            var help = cmdObj.help ? cmdObj.help : cmdObj.description;
            cmds.push(CmdUtils.makeSugg(cmd.name, help, cmdObj));
         }
      }
      return cmds;
   }
}

var noun_type_twitter_user = {
   _name: "twitter username",
   rankLast: true,
   suggest: function(text, html, cb, selected){
     if(selected) return [];
     
     // Twitter usernames can't contain spaces; reject input with spaces.
     if (text.length && text.indexOf(" ") != -1)
       return [];

     var suggs = [];

     // If we don't need to ask the user for their master password, let's
     // see if we can suggest known users that the user has logged-in as
     // before.
     var tokenDB = Cc["@mozilla.org/security/pk11tokendb;1"].
                   getService(Ci.nsIPK11TokenDB);
     var token = tokenDB.getInternalKeyToken();

     if (!token.needsLogin() || token.isLoggedIn()) {
       // Look for twitter usernames stored in password manager
       var usersFound = {};
       var passwordManager = Cc["@mozilla.org/login-manager;1"]
                             .getService(Ci.nsILoginManager);
       var urls = ["https://twitter.com", "http://twitter.com"];
       urls.forEach(
         function(url) {
           var logins = passwordManager.findLogins({}, url, "", "");

           for (var x = 0; x < logins.length; x++) {
             var login = logins[x];
             if (login.username.indexOf(text) != -1 &&
                 !usersFound[login.username]) {
               usersFound[login.username] = true;
               suggs.push(CmdUtils.makeSugg(login.username, null, login));
             }
           }
         });
     }

     // If all else fails, treat the user's single-word input as a twitter
     // username.
     if (suggs.length == 0)
       suggs.push(CmdUtils.makeSugg(text, null, null, 0.7));

     return suggs;
   }
};

var noun_type_number = {
  _name: "number",
  suggest: function(text) {
    return /^\d+$/.test(text) ? [CmdUtils.makeSugg(text, null, +text)] : [];
  },
  "default": function() {
    return CmdUtils.makeSugg("1", null, 1, 0.9);
  }
};

var noun_type_bookmarklet = {
  _name: "bookmarklet",
  suggest: function(txt, htm, cb, selected) {
    if (selected || !txt) return [];
    try { var tester = RegExp(txt, "i") }
    catch (e) {
      txt = txt.toLowerCase();
      tester = {test: function(x) ~x.toLowerCase().indexOf(txt)};
    }
    return [s for each (s in this.list) if(tester.test(s.text))];
  },
  list: null,
  load: function(reload) {
    var jsm = {};
    Cu.import("resource://gre/modules/utils.js", jsm);
    var list = [];
    var {bookmarks, history} = jsm.PlacesUtils;
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

var noun_type_date = {
  _name: "date",
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

var noun_type_time = {
   _name: "time",
   'default': function(){
     var time = Date.parse("now");
     var text = time.toString("hh:mm tt");
     return CmdUtils.makeSugg(text, null, time, 0.9);
   },
   suggest: function(text, html){
     if (typeof text != "string"){
       return [];
     }

     var time = Date.parse( text );
     if(!time ){
       return [];
     }

     return [CmdUtils.makeSugg(time.toString("hh:mm tt"), null, time)];
   }
};

// TODO this is going on obsolete, and will be replaced entirely by
// noun_type_async_address.
var noun_type_address = {
  _name: "address",
  knownAddresses: [],
  maybeAddress: null,
  callback: function( isAnAddress ) {
    if (isAnAddress) {
      noun_type_address.knownAddresses.push( noun_type_address.maybeAddress );
    }
    noun_type_address.maybeAddress = null;
  },
  suggest: function( text, html ) {
    isAddress( text, noun_type_address.callback );
    for(var x in noun_type_address.knownAddresses) {
      if (noun_type_address.knownAddresses[x] == text) {
        return [CmdUtils.makeSugg(text)];
      }
    }
    noun_type_address.maybeAddress = text;
    isAddress( text, noun_type_address.callback );
    return [];
  }
};

// commenting out until this actually works (#619)
/*
var noun_type_async_address = {
  _name: "address(async)",
  // TODO caching
  suggest: function(text, html, callback) {
    isAddress( text, function( truthiness ) {
      if (truthiness) {
       callback(CmdUtils.makeSugg(text));
      }
    });
    return [];
  }
};
*/

var noun_type_contact = {
  _name: "contact",
  contactList: null,
  callback: function(contacts) {
    Array.prototype.push.apply(noun_type_contact.contactList,
                               contacts);
  },
  suggest: function(text, html) {
    if (noun_type_contact.contactList == null) {
      noun_type_contact.contactList = [];
      getContacts(noun_type_contact.callback);
      var suggs = noun_type_email.suggest(text, html);
      return suggs.length > 0 ? suggs : [];
    }

    if( text.length < 1 ) return [];

    var suggestions  = [];
    for ( var c in noun_type_contact.contactList ) {
      var contact = noun_type_contact.contactList[c];

      if ((contact["name"].match(text, "i")) || (contact["email"].match(text, "i"))){
	      suggestions.push(CmdUtils.makeSugg(contact["email"]));
	    }
    }

    var suggs = noun_type_email.suggest(text, html);
    if (suggs.length > 0)
      suggestions.push(suggs[0]);

    return suggestions.slice(0, CmdUtils.maxSuggestions);
  }
};

var noun_type_geolocation = {
   _name : "geolocation",
   rankLast: true,
   'default': function() {
     var location = CmdUtils.getGeoLocation();
     if (!location) {
       // TODO: there needs to be a better way of doing this,
       // as default() can't currently return null
       return {text: "", html: "", data: null, summary: ""};
     }
     var fullLocation = location.city + ", " + location.country;
     return CmdUtils.makeSugg(fullLocation,null,null,0.9);
   },

   suggest: function(fragment, html, callback) {
      /* LONGTERM TODO: try to detect whether fragment is anything like a valid location or not,
       * and don't suggest anything for input that's not a location.
       */
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

var noun_type_lang_google = CmdUtils.nounTypeFromDictionary({
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
}, "language google");

// for backward compatibility
var noun_type_language = noun_type_lang_google;

// from http://meta.wikimedia.org/wiki/List_of_Wikipedias
// omitting ones with 100+ articles
var noun_type_lang_wikipedia = CmdUtils.nounTypeFromDictionary({
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
}, "language wikipedia");

for each (let ntl in [noun_type_lang_google, noun_type_lang_wikipedia]) {
  ntl._code2name = ntl._list.reduce(function(o, s) {
    o[s.data] = o[s.text];
    return o;
  }, {});
  ntl.getLangName = function getLangName(langCode) this._code2name[langCode];
}

function getGmailContacts( callback ) {
  // TODO: It's not really a security hazard since we're evaluating the
  // Vcard data in a sandbox, but I'm not sure how accurate this
  // algorithm is; we might want to consider using a third-party
  // VCard parser instead, e.g.: git://github.com/mattt/vcard.js.git
  // -AV

  var sandbox = Cu.Sandbox("data:text/html,");
  jQuery.get(
    "http://mail.google.com/mail/contacts/data/export",
    {exportType: "ALL", out: "VCARD"},
    function(data) {
      function unescapeBS(m) {
        var result =  Cu.evalInSandbox("'"+ m +"'", sandbox);
        if (typeof(result) == "string")
          return result;
        else
          return "";
      }
      var contacts = [], name = '';
      for each(var line in data.replace(/\r\n /g, '').split(/\r\n/))
        if(/^(FN|EMAIL).*?:(.*)/.test(line)){
          var {$1: key, $2: val} = RegExp;
          var val = val.replace(/\\./g, unescapeBS);
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

function getContacts(callback){
  getGmailContacts(callback);
  getYahooContacts(callback);
}

function isAddress( query, callback ) {
  var url = "http://local.yahooapis.com/MapsService/V1/geocode";
  var params = Utils.paramsToString({
    location: query,
    appid: "YD-9G7bey8_JXxQP6rxl.fBFGgCdNjoDMACQA--"
  });


  jQuery.ajax({
    url: url+params,
    dataType: "xml",
    error: function() {
      callback( false );
    },
    success:function(data) {
      var results = jQuery(data).find("Result");
      var allText = jQuery.makeArray(
                      jQuery(data)
                        .find(":contains()")
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
}

var EXPORTED_SYMBOLS = [sym for (sym in this) if (/^noun_/.test(sym))];
