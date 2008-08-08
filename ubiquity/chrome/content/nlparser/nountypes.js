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

var PersonNounType = {
  _name: "contact",
  contactList: null,
  callback:function(contacts) {
    PersonNounType.contactList = contacts;
  },
  match:function( fragment ) {
    if (PersonNounType.contactList == null) {
      getGmailContacts( PersonNounType.callback);
      return false;
    }
    for ( var c in PersonNounType.contactList ) {
      if (c.match(fragment, "i"))
	    return true;
    }
    return false;
  },
  suggest: function( fragment ) {
    if (PersonNounType.contactList == null) {
      getGmailContacts( PersonNounType.callback);
      return [];
    }

    if( fragment.length < 3 ) return [];

    var suggestions  = [];
    for ( var c in PersonNounType.contactList ) {
      if (c.match(fragment, "i"))
	      suggestions.push(PersonNounType.contactList[c]);
    }
    return suggestions.splice(0, 5);
  }
};

var arbText = {
  // a singleton object which can be used in place of a NounType.
 _name: "text",
 match: function( fragment ) {
    return true;
  },
 suggest: function( fragment ) {
    return [ fragment ];
  }
};

var arbHtml = {
  _name: "html",
  expectsHtmlSelection: true,
  match: function( fragment ) {
    return true;
  },
  suggest: function( fragment ) {
    return [ fragment ];
  }
};

var DateNounType = {
  _name: "date",
  match: function( fragment ) {
    return (this.suggest(fragment).length > 0 );
  },
  suggest: function( fragment )  {
    dump("Suggesting date for " + fragment +".\n");
    if (!fragment) {
      dump("Nothin!\n");
      return [];
    }
    var date = Date.parse( fragment );
    if (!date) {
      dump("Totally not a date!\n");
      return [];
    }
    dump("Returning " + date + "\n");
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
var AddressNounType = {
  _name: "address",
  knownAddresses: [],
  maybeAddress: null,
  callback: function( isAnAddress ) {
    if (isAnAddress) {
      AddressNounType.knownAddresses.push( AddressNounType.maybeAddress );
    }
    AddressNounType.maybeAddress = null;
  },
  match: function( fragment ) {
    for( x in AddressNounType.knownAddresses) {
      if (AddressNounType.knownAddresses[x] == fragment) {
	return true;
      }
    }
    AddressNounType.maybeAddress = fragment;
    isAddress( fragment, AddressNounType.callback );
    return false;
  },
  suggest: function( fragment ) {
    isAddress( fragment, AddressNounType.callback );
    for( x in AddressNounType.knownAddresses) {
      if (AddressNounType.knownAddresses[x] == fragment) {
	return [ fragment ];
      }
    }
    AddressNounType.maybeAddress = fragment;
    isAddress( fragment, AddressNounType.callback );
    return [];
  }
};

// TODO replace this with ???
var MathNounType = {
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

var languageNounType = new NounType( "language", Languages );


// arbText and arbHtml are last on purpose, so that when we're looking for
// a nountype to match our input, we'll hit the specific ones before the catch-alls.
function getNounList() {
  return [AddressNounType,
          languageNounType,
          PersonNounType,
          MathNounType,
          DateNounType,
          arbText,
          arbHtml];
}
