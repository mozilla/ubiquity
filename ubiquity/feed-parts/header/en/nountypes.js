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
 
 var noun_type_emailservice = {
   _name: "email service",
   suggest: function(text, html) {

     var providers = ["googleapps", "gmail", "yahoo"];
     var suggestions = [];
     //match based on input
     for(var i = 0; i < providers.length; i++) {
       var provider = providers[i];
       if (provider.match(text, "i")){
         suggestions.push(CmdUtils.makeSugg(provider, null, provider));
       }
     }
     return suggestions;
   },
   default: function() {
     //TODO: find a better way to pick the default
     return CmdUtils.makeSugg("gmail", null, "gmail");
   }
};

function getGmailContacts( callback ) {
  var url = "http://mail.google.com/mail/contacts/data/export";
  var params = {
    exportType: "ALL",
    out: "VCARD"
  };
  
  jQuery.get(url, params, function(data) {
    data = data.split("\n");
    var contacts = [];
    var name="";
    var email="";
    var incard=false;
    
    for each( var line in data ) {

      if (line.indexOf(" ") == 0) {
        // a folded line, need to remove space and
        // attach to previous line
        if (linevar.length > 0) {
          lineval = lineval + line.slice(1);
        }
      } else {
        var colonIndex = line.indexOf(":");
        var linevar = line.slice(0, colonIndex);
        var lineval = line.slice(colonIndex + 1);
        if (linevar == "BEGIN") {
          // new card, reset values
          incard = true;
          name = "";
          email = "";
        } else if (linevar == "FN" || linevar.indexOf("FN;") == 0) {
          name = lineval;
        } else if (linevar == "EMAIL" || linevar.indexOf("EMAIL;") == 0) {
          email = lineval;
        } else if (linevar == "END") {
          // end of card, store it
          var contact = {};
          if (incard) {
            contact["name"] = name;
            contact["email"] = email;
            contacts.push(contact);
          }
          incard = false;
          name = "";
          email = "";
        }
      }
      
    }
    


    callback(contacts);
  }, "text");
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

var noun_type_contact = {
  _name: "contact",
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

    if( text.length < 1 ) return [];

    var suggestions  = [];
    for ( var c in noun_type_contact.contactList ) {
      var contact = noun_type_contact.contactList[c];
      
      if ((contact["name"].match(text, "i")) || (contact["email"].match(text, "i"))){
	      suggestions.push(CmdUtils.makeSugg(contact["email"]));
	    }
    }

    var suggs = noun_type_email.suggest(text, html);
    // TODO the next line would be a lot clearer as an if() {} statement.
    suggs.length > 0 ? suggestions.push(suggs[0]) : null;

    return suggestions.splice(0, 5);
  }
};

/*
 * Noun that matches only emails based on the regexp
 * found on http://iamcal.com/publish/articles/php/parsing_email by Cal Henderson
 * This regexp is RFC822 compilant.
 */
var noun_type_email = {
  _name: "email",
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

var noun_arb_text = {
  _name: "text",
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

var noun_type_date = {
  _name: "date",

  default: function(){
     var date = Date.parse("today");
     var text = date.toString("dd MM, yyyy");
     return CmdUtils.makeSugg(text, null, date);
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
};

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

/*
 * Noun type for searching links on the awesomebar database.
 * Right now, the suggestion returned is:
 *  -- text: title of the url
 *  -- html: the link
 *  -- data: the favicon
 *
 *  The code is totally based on Julien Couvreur's insert-link command (http://blog.monstuff.com/archives/000343.html)
 */
noun_type_awesomebar = {

  _getHistoryLinks: function(partialSearch, onSearchComplete) {
        function AutoCompleteInput(aSearches) {
            this.searches = aSearches;
        }
        AutoCompleteInput.prototype = {
            constructor: AutoCompleteInput,

            searches: null,

            minResultsForPopup: 0,
            timeout: 10,
            searchParam: "",
            textValue: "",
            disableAutoComplete: false,
            completeDefaultIndex: false,

            get searchCount() {
                return this.searches.length;
            },

            getSearchAt: function(aIndex) {
                return this.searches[aIndex];
            },

            onSearchBegin: function() {},
            onSearchComplete: function() {},

            popupOpen: false,

            popup: {
                setSelectedIndex: function(aIndex) {},
                invalidate: function() {},

                // nsISupports implementation
                QueryInterface: function(iid) {
                    if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsIAutoCompletePopup)) return this;

                    throw Components.results.NS_ERROR_NO_INTERFACE;
                }
            },

            // nsISupports implementation
            QueryInterface: function(iid) {
                if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsIAutoCompleteInput)) return this;

                throw Components.results.NS_ERROR_NO_INTERFACE;
            }
        }

        var controller = Components.classes["@mozilla.org/autocomplete/controller;1"].getService(Components.interfaces.nsIAutoCompleteController);

        var input = new AutoCompleteInput(["history"]);
        controller.input = input;

        input.onSearchComplete = function() {
            onSearchComplete(controller);
        };

        controller.startSearch(partialSearch);
  },

  _getLinks: function(controller, callback) {
      var links = [];

      for (var i = 0; i < controller.matchCount; i++) {
        var url = controller.getValueAt(i);
        var title = controller.getCommentAt(i);
        if (title.length == 0) { title = url; }

        var favicon = controller.getImageAt(i);

        callback( CmdUtils.makeSugg(url, title, favicon) );
    }
  },
  name: "url",
  _links: null,
  suggest: function(part, html, callback){
      var onSearchComplete = function(controller) {
         noun_type_awesomebar._getLinks(controller, callback);
      };

      this._getHistoryLinks(part, onSearchComplete);
  }
};


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
  },
  
  // Returns the language name for the given lang code.
  getLangName: function(langCode) {
	var code = langCode.toLowerCase();
	for ( var word in LanguageCodes ) {
		if (code == LanguageCodes[word].toLowerCase()) {
			return word;
		}
	}
	return null;
  }
};


var noun_type_tab = {
  _name: "tab name",

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
   default: function() {
		var location = CmdUtils.getGeoLocation();
		if (!location) {
			// TODO: there needs to be a better way of doing this,
			// as default() can't currently return null
			return {text: "", html: "", data: null, summary: ""};
		}
		var fullLocation = location.city + ", " + location.country;
		return CmdUtils.makeSugg(fullLocation);
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

var noun_type_url = {
  /* TODO longterm, noun_type_url could suggest URLs you've visited before, by querying
   * the awesomebar's data source
   */
  _name : "url",
  rankLast: true,
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

  default: function() {
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

Components.utils.import("resource://ubiquity/modules/setup.js");

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

noun_type_twitter_user = {
   _name: "twitter username",
   suggest: function(sugg, html){
     var passwordManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
     var logins = passwordManager.findLogins({}, "https://twitter.com", "", "");

     var suggs = [];

     for(var x = 0; x < logins.length; x++){
        var login = logins[x];
	     if(login.username.indexOf(sugg) != -1){
           suggs.push(CmdUtils.makeSugg(login.username, null, login));
        }
     }

     if(suggs.length == 0) suggs.push(CmdUtils.makeSugg(sugg, null, null));

     return suggs;
     
   },
}

noun_type_number = {
   suggest : function(sugg){
      return sugg.match("^[0-9]{1,}$") ? [CmdUtils.makeSugg(sugg)] : []
   },
   default : function(){
      return CmdUtils.makeSugg("1");
   }
}


function getBookmarklets(callback) {
  
  var bookmarklets = {};
  
  var Ci = Components.interfaces;
  var Cc = Components.classes;
  
  var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                  .getService(Ci.nsINavBookmarksService);
  var history = Cc["@mozilla.org/browser/nav-history-service;1"]
                .getService(Ci.nsINavHistoryService);
 
  var query = history.getNewQuery();
 
  // Specify folders to be searched
  var folders = [bookmarks.toolbarFolder, bookmarks.bookmarksMenuFolder,
                 bookmarks.unfiledBookmarksFolder];
  query.setFolders(folders, folders.length);
  
  var options = history.getNewQueryOptions();
  options.queryType = options.QUERY_TYPE_BOOKMARKS
 
  // Specify terms to search for, matches against title, URL and tags
  query.searchTerms = "javascript";
 
  var result = history.executeQuery(query, options);
  
  // The root property of a query result is an object representing the folder you specified above.
  var resultContainerNode = result.root;
  // Open the folder, and iterate over it's contents.
  resultContainerNode.containerOpen = true;
  for (var i=0; i < resultContainerNode.childCount; ++i) {
    var childNode = resultContainerNode.getChild(i);
 
    // Accessing properties of matching bookmarks
    var title = childNode.title;
    var uri = childNode.uri;
    
    if(uri.substring(0,11) == "javascript:") {
      bookmarklets[title.toLowerCase().replace(/ /g,'-')] = uri;
    }
  }
    
  callback(bookmarklets);
}

var noun_type_bookmarklet = {
  _name: "bookmarklet",
  bookmarkletList: null,
  callback: function(bookmarklets){
    noun_type_bookmarklet.bookmarkletList = bookmarklets;
  },
  suggest: function( text, html )  {
    
    if (noun_type_bookmarklet.bookmarkletList == null) {
      getBookmarklets(noun_type_bookmarklet.callback);
      return [];
    }

    bookmarklets = noun_type_bookmarklet.bookmarkletList;

    var suggestions  = [];
    for ( var c in bookmarklets) {
      if (c.match(text, "i"))
	      suggestions.push(CmdUtils.makeSugg(c, "", bookmarklets[c]));
    }
    
    return suggestions.splice(0, 5);
      
  }
};