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
                        .map( function(){ return jQuery(this).text().toLowerCase() } )
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


var Languages = [
  'Arabic',
  'Chinese',
  'Chinese Traditional',
  'Danish',
  'Dutch',
  'English',
  'Finnish',
  'French',
  'German',
  'Greek',
  'Hindi',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Polish',
  'Portuguese',
  'Russian',
  'Spanish',
  'Swedish'
];

var noun_type_language = new CmdUtils.NounType( "language", Languages );

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
