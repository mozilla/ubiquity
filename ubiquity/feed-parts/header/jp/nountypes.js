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
 *   Masahiko Imanaka <chimantaea_mirabilis@yahoo.co.jp>
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
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

var noun_type_emailservice = {
   _name: "E-mail サービス",
   suggest: function(text, html) {

     var providers = ["googleapps", "gmail", "yahoo"];
     var suggestions = [];
     //match based on input
     for each (var provider in providers) {
       if (provider.match(text, "i")){
         suggestions.push(CmdUtils.makeSugg(provider, null, provider));
       }
     }
     return suggestions;
   },
   default: function() {
     //TODO: find a better way to pick the default
     return CmdUtils.makeSugg("gmail", null, "gmail",0.9);
   }
};

var JLanguageCodes = {
  'アラビア語' : 'ar',
  'ブルガリア語' : 'bg',
  'カタルーニャ語' : 'ca',
  '中国語(簡体)' : 'zh',
  '中国語(繁體)' : 'zh-TW',
  'クロアチア語': 'hr',
  'チェコ語': 'cs',
  'デンマーク語' : 'da',
  'オランダ語': 'nl',
  '英語' : 'en',
  'タガログ語' : 'tl',
  'フィンランド語' : 'fi',
  'フランス語' : 'fr',
  'ドイツ語' : 'de',
  'ギリシャ語' : 'el',
  'ヘブライ語' : 'he',
  'ヒンディー語' : 'hi',
  'イタリア語' : 'it',
  '日本語' : 'ja',
  '韓国語' : 'ko',
  'ラトビア語' : 'lv',
  'リトアニア語' : 'lt',
  'ノルウェー語' : 'no',
  'ポーランド語' : 'pl',
  'ポルトガル語' : 'pt',
  'ルーマニア語' : 'ro',
  'ロシア語' : 'ru',
  'セルビア語' : 'sr',
  'スロバキア語' : 'sk',
  'スロベニア語' : 'sl',
  'スペイン語' : 'es',
  'スウェーデン語' : 'sv',
  'ウクライナ語' : 'uk',
  'ベトナム語' : 'vi',
  
  'arabic' : 'ar',
  'bulgarian' : 'bg',
  'catalan' : 'ca',
  'chinese' : 'zh',
  'chinese_traditional' : 'zh-TW',
  'croatian': 'hr',
  'czech': 'cs',
  'danish' : 'da',
  'dutch': 'nl',
  'english' : 'en',
  // Filipino should be 'fil', however Google
  // improperly uses 'tl', which is actually
  // the language code for tagalog. Using 'tl'
  // for now so that filipino translations work.
  'filipino' : 'tl',
  'finnish' : 'fi',
  'french' : 'fr',
  'german' : 'de',
  'greek' : 'el',
  'hebrew' : 'he',
  'hindi' : 'hi',
  'indonesian' : 'id',
  'italian' : 'it',
  'japanese' : 'ja',
  'korean' : 'ko',
  'latvian' : 'lv',
  'lithuanian' : 'lt',
  'norwegian' : 'no',
  'polish' : 'pl',
  'portuguese' : 'pt',
  'romanian' : 'ro',
  'russian' : 'ru',
  'serbian' : 'sr',
  'slovak' : 'sk',
  'slovenian' : 'sl',
  'spanish' : 'es',
  'swedish' : 'sv',
  'ukranian' : 'uk',
  'vietnamese' : 'vi'
};

var noun_type_language =  {
  _name: "言語",
  suggest: function( text, html ) {
    var suggestions = [];
    for ( var word in JLanguageCodes ) {
      // Do the match in a non-case sensitive way
      if ( word.indexOf( text.toLowerCase() ) > -1 ) {
        // Use the 2-letter language code as the .data field of the suggestion
        var sugg = CmdUtils.makeSugg(word, word, JLanguageCodes[word]);
        suggestions.push( sugg );
      }
    }
    return suggestions;
  },
   
  // Returns the language name for the given lang code.
  getLangName: function(langCode) {
 	var code = langCode.toLowerCase();
 	for ( var word in JLanguageCodes ) {
 		if (code == JLanguageCodes[word].toLowerCase()) {
 			return word;
 		}
 	}
 	return null;
  }
};

var noun_arb_text = {
  _name: "テキスト",
  rankLast: true,
  suggest: function( text, html, callback, selectionIndices ) {
    var suggestion = CmdUtils.makeSugg(text, html);
    /* If the input comes all or in part from a text selection,
     * we'll stick some html tags into the summary so that the part
     * that comes from the text selection can be visually marked in
     * the suggestion list.
     */
    if (selectionIndices) {
      var pre = suggestion.summary.slice(0, selectionIndices[0]);
      var middle = suggestion.summary.slice(selectionIndices[0],
					    selectionIndices[1]);
      var post = suggestion.summary.slice(selectionIndices[1]);
      suggestion.summary = pre + "<span class='selection'>" +
			     middle + "</span>" + post;
    }
    return [suggestion];
  }
};

var noun_type_contact = {
  _name: "連絡先",
  contactList: null,
  callback:function(contacts) {
    noun_type_contact.contactList = noun_type_contact.contactList.concat(contacts);
  },

  suggest: function(text, html) {

    if (noun_type_contact.contactList == null) {
      noun_type_contact.contactList = [];
      getContacts( noun_type_contact.callback);
      var suggs = noun_type_email.suggest(text, html);
      return suggs.length > 0 ? suggs : [];
    }

    if( text.length < 2 ) return [];

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

    return suggestions.splice(0, 5);
  }
};

/*
 * Noun that matches only emails based on the regexp
 * found on http://iamcal.com/publish/articles/php/parsing_email by Cal Henderson
 * This regexp is RFC822 compilant.
 */
var noun_type_email = {
  _name: "メールアドレス",
  _regexp: new RegExp('^([^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+' +
                      '|\\x22([^\\x0d\\x22\\x5c\\x80-\\xff]|\\x5c[\\x00-\\x7f])*\\x22)(\\x2e([^\\x00-\\x20\\x22' +
                      '\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+|\\x22([^\\x0d\\x22\\x5c' +
                      '\\x80-\\xff]|\\x5c\\x00-\\x7f)*\\x22))*\\x40([^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-' +
                      '\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+|\\x5b([^\\x0d\\x5b-\\x5d\\x80-\\xff]|\\x5c[\\x00-' +
                      '\\x7f])*\\x5d)(\\x2e([^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\' +
                      'x5d\\x7f-\\xff]+|\\x5b([^\\x0d\\x5b-\\x5d\\x80-\\xff]|\\x5c[\\x00-\\x7f])*\\x5d))*$'),
  suggest: function(text, html){
    if(this._regexp.test(text)){
      return [ CmdUtils.makeSugg(text) ];
    }

    return [];
  }
};


var noun_type_date = {
  _name: "日付",

  default: function(){
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
   _name: "時刻",

   default: function(){
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

     text = time.toString("hh:mm tt");
     return [ CmdUtils.makeSugg(text, null, time) ];
   }
};

var noun_type_percentage = {
  _name: "割合",
  suggest: function( text, html ) {
    if (!text)
      return [ CmdUtils.makeSugg("100%", null, 1.0) ];
    var number = parseFloat(text);
    if (isNaN(number)) {
      return [];
    }
    if (number > 1 && text.indexOf(".") == -1)
      number = number / 100;
    text = number*100 + "%";
    return [ CmdUtils.makeSugg(text, null, number)];
  }
};

var noun_type_async_address = {
  _name: "住所(非同期)",
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

var noun_type_tab = {
  _name: "タブ名",

  _tabCache: null,

  // Returns all tabs from all windows.
  getTabs: function(){
    return Utils.tabs.get();
  },

  suggest: function( text, html ) {
    var suggestions  = [];
    var tabs = Utils.tabs.search(text, 5);

    for ( var tabName in tabs ){
      var tab = tabs[tabName];
      suggestions.push( CmdUtils.makeSugg(tabName, tab.document.URL, tab) );
    }

    return suggestions;
  }
};


var noun_type_searchengine = {
  _name: "検索エンジン",
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
    return Components.classes["@mozilla.org/browser/search-service;1"]
      .getService(Components.interfaces.nsIBrowserSearchService)
      .defaultEngine;
  }
};

var noun_type_tag = {
  _name: "タグリスト",
  suggest: function(fragment) {
    var allTags = Components.classes["@mozilla.org/browser/tagging-service;1"]
                    .getService(Components.interfaces.nsITaggingService)
                    .allTags;

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

var noun_type_geolocation = {
   _name : "地理位置情報",
   rankLast: true,
   default: function() {
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
        callback(CmdUtils.makeSugg(fullLocation));
				callback(CmdUtils.makeSugg(location.city));
				callback(CmdUtils.makeSugg(location.country));
			}
      var regexpHere = /here(\s)?.*/;
      if (regexpHere.test(fragment)) {
         CmdUtils.getGeoLocation(addAsyncGeoSuggestions);
      }
      return [CmdUtils.makeSugg(fragment)];
   }
};
