function getGmailContacts( callback ) {
  var url = "http://mail.google.com/mail/contacts/data/export";
  var params = Utils.paramsToString({
    exportType: "ALL",
    out: "CSV"
  });

  Utils.ajaxGet(url + params , function(data) {
    data = data.split("\n");

    var contacts = {};
    for each( var line in data ) {
      var splitLine = line.split(",");

      var name = splitLine[0];
      var email = splitLine[1];

      contacts[name] = email;
    }

    callback(contacts);
  });
}

var noun_type_contact = {
  _name: "contact",
  contactList: null,
  callback:function(contacts) {
    noun_type_contact.contactList = contacts;
  },
  match:function( fragment ) {
    if (noun_type_contact.contactList == null) {
      getGmailContacts( noun_type_contact.callback);
      return false;
    }
    for ( var c in noun_type_contact.contactList ) {
      if (c.match(fragment, "i"))
	    return true;
    }
    return false;
  },
  suggest: function( fragment ) {
    if (noun_type_contact.contactList == null) {
      getGmailContacts( noun_type_contact.callback);
      return [];
    }

    if( fragment.length < 3 ) return [];

    var suggestions  = [];
    for ( var c in noun_type_contact.contactList ) {
      if (c.match(fragment, "i"))
	      suggestions.push(noun_type_contact.contactList[c]);
    }
    return suggestions.splice(0, 5);
  }
};

var noun_arb_text = {
 _name: "text",
 match: function( fragment ) {
    return true;
  },
 suggest: function( fragment ) {
    return [ fragment ];
  }
};

var noun_type_date = {
  _name: "date",
  match: function( fragment ) {
    return (this.suggest(fragment).length > 0 );
  },
  suggest: function( fragment )  {
    if (typeof fragment != "string") {
      return [];
    }
    if (fragment == "") {
      // If input is blank, suggest today's date
      return [ Date.parse("today") ];
    }

    if (!fragment) {
      return [];
    }
    var date = Date.parse( fragment );
    if (!date) {
      return [];
    }
    return [ date ];
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
  match: function( fragment ) {
    for( x in noun_type_address.knownAddresses) {
      if (noun_type_address.knownAddresses[x] == fragment) {
	return true;
      }
    }
    noun_type_address.maybeAddress = fragment;
    isAddress( fragment, noun_type_address.callback );
    return false;
  },
  suggest: function( fragment ) {
    isAddress( fragment, noun_type_address.callback );
    for( x in noun_type_address.knownAddresses) {
      if (noun_type_address.knownAddresses[x] == fragment) {
	return [ fragment ];
      }
    }
    noun_type_address.maybeAddress = fragment;
    isAddress( fragment, noun_type_address.callback );
    return [];
  }
};

// TODO replace this with ???
var noun_type_math = {
  match: function( fragment ) {

  },
  suggest: function( fragment ) {

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

  match:function( fragment ) {
    return noun_type_tab.suggest( fragment ).length > 0;
  },

  suggest: function( fragment ) {
    var suggestions  = [];
    var tabs = noun_type_tab.getTabs();

    //TODO: implement a better match algorithm
    for ( var tabName in tabs ) {
      if (tabName.match(fragment, "i"))
	      suggestions.push( tabName );
    }
    return suggestions.splice(0, 5);
  }
}
