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

function getGmailContacts( callback ) {
  var url = "http://mail.google.com/mail/contacts/data/export";
  var params = Utils.paramsToString({
    exportType: "ALL",
    out: "CSV"
  });

  Utils.ajaxGet(url + params, function(data) {
    data = data.split("\n");

    var contacts = {};
    for each( var line in data ) {
      var splitLine = line.split(",");

      var name = splitLine[0];
      var email = splitLine[1];

      contacts[name] = email;
    }

    callback(contacts);
  }, function() {
    // probably not logged in - fail gracefully
    callback({});
  });
}

var noun_type_contact = {
  _name: "contact",
  contactList: null,
  callback:function(contacts) {
    noun_type_contact.contactList = contacts;
  },
  suggest: function(text, html) {
    if (noun_type_contact.contactList == null) {
      getGmailContacts( noun_type_contact.callback);
      return [];
    }

    if( text.length < 2 ) return [];

    var suggestions  = [];
    for ( var c in noun_type_contact.contactList ) {
      if (c.match(text, "i"))
	suggestions.push(CmdUtils.makeSugg(noun_type_contact.contactList[c]));
    }

   if(/[A-Za-z0-9_.-]+@([A-Za-z0-9_.-]+\.)+[A-Za-z]{2,4}/.test(text)){
      suggestions.push(CmdUtils.makeSugg(text));
   }

    return suggestions.splice(0, 5);
  }
};

var noun_arb_text = {
  _name: "text",
  rankLast: true,
  suggest: function( text, html ) {
    return [ CmdUtils.makeSugg(text, html) ];
  }
};

var noun_type_date = {
  _name: "date",
  suggest: function( text, html )  {
    if (typeof text != "string") {
      return [];
    }
    if (text == "") {
      // If input is blank, suggest today's date
      return this.suggest("today");
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

   default: function(){
     var time = Date.parse("now");
     var text = time.toString("hh:mm tt");
     return CmdUtils.makeSugg(text, null, time);
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
}

var noun_type_percentage = {
  _name: "percentage",
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

// TODO this is a really crappy implementation for async address detection
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
    for( x in noun_type_address.knownAddresses) {
      if (noun_type_address.knownAddresses[x] == text) {
	return [ CmdUtils.makeSugg(text) ];
      }
    }
    noun_type_address.maybeAddress = text;
    isAddress( text, noun_type_address.callback );
    return [];
  }
};


var LanguageCodes = {
  'arabic' : 'ar',
  'chinese' : 'zh',
  'chinese_traditional' : 'zh-TW',
  'danish' : 'da',
  'dutch': 'nl',
  'english' : 'en',
  'finnish' : 'fi',
  'french' : 'fr',
  'german' : 'de',
  'greek' : 'el',
  'hindi' : 'hi',
  'italian' : 'it',
  'japanese' : 'ja',
  'korean' : 'ko',
  'norwegian' : 'no',
  'polish' : 'pl',
  'portugese' : 'pt-PT',
  'romanian' : 'ro',
  'russian' : 'ru',
  'spanish' : 'es',
  'swedish' : 'sv'
};

var noun_type_language =  {
  _name: "language",

  suggest: function( text, html ) {
    var suggestions = [];
    for ( var word in LanguageCodes ) {
      // Do the match in a non-case sensitive way
      if ( word.indexOf( text.toLowerCase() ) > -1 ) {
	// Use the 2-letter language code as the .data field of the suggestion
        var sugg = CmdUtils.makeSugg(word, word, LanguageCodes[word]);
      	suggestions.push( sugg );
      }
    }
    return suggestions;
  }
};


var noun_type_tab = {
  _name: "tab name",

  // Returns all tabs from all windows.
  getTabs: function(){
    var tabs = {};

    for( var j=0; j < Application.windows.length; j++ ) {
      var window = Application.windows[j];
      for (var i = 0; i < window.tabs.length; i++) {
        var tab = window.tabs[i];
        tabs[tab.document.title] = tab;
      }
    }

    return tabs;
  },

  suggest: function( text, html ) {
    var suggestions  = [];
    var tabs = noun_type_tab.getTabs();

    //TODO: implement a better match algorithm
    for ( var tabName in tabs ) {
      if (tabName.match(text, "i"))
        suggestions.push( CmdUtils.makeSugg(tabName) );
    }
    return suggestions.splice(0, 5);
  }
};


var noun_type_searchengine = {
  _name: "search engine",
  suggest: function(fragment) {
    var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
      .getService(Components.interfaces.nsIBrowserSearchService);
    var engines = searchService.getVisibleEngines({});

    if (!fragment) {
      return engines.map(function(engine) {
        return CmdUtils.makeSugg(engine.name, null, engine);
      });
    }

    fragment = fragment.toLowerCase();
    var suggestions = [];

    for(var i = 0; i < engines.length; i++) {
      if(engines[i].name.toLowerCase().indexOf(fragment) > -1) {
        suggestions.push(CmdUtils.makeSugg(engines[i].name, null, engines[i]));
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
  _name: "tag-list",
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
   _name : "geolocation",
   rankLast: true,
   default : function(){
     var location = CmdUtils.getGeoLocation();
     var locString = location.city + "," + location.country;
     return CmdUtils.makeSugg( locString );
   },

   suggest: function(fragment){
      /* LONGTERM TODO: try to detect whether fragment is anything like a valid location or not,
       * and don't suggest anything for input that's not a location.
       */
      var regexp = /here(\s)?.*/;
      if(regexp.test(fragment)){
         var suggestions = [];
         var location = CmdUtils.getGeoLocation();
         var loc = location.city + "," + location.country;
         suggestions.push(CmdUtils.makeSugg(loc));
         suggestions.push(CmdUtils.makeSugg(location.city));
         suggestions.push(CmdUtils.makeSugg(location.country));
         suggestions.push(CmdUtils.makeSugg(fragment));
         return suggestions;
      }

      return [CmdUtils.makeSugg(fragment)];
   }
};

var noun_type_url = {
  /* TODO longterm, noun_type_url could suggest URLs you've visited before, by querying
   * the awesomebar's data source
   */
  _name : "url",
  _rankLast: true,
  suggest: function(fragment) {
    var regexp = /(ftp|http|https):\/\/(\w+:{01}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    // alternately: /[A-Za-z0-9_.-]+:\/\/([A-Za-z0-9_.-])/

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