Components.utils.import("resource://ubiquity/modules/nountypes.js");

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
