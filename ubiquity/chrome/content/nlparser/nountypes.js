function NounType( name, expectedWords ) {
  this._init( name, expectedWords );
}
NounType.prototype = {
  _init: function( name, expectedWords ) {
    this._name = name;
    this._expectedWords = expectedWords; // an array
  },

  match: function( fragment ) {
    var suggs = this.suggest( fragment );
    // klugy!
    if ( suggs.length > 0 ) {
      return true;
    }
    return false;
  },

  suggest: function( fragment ) {
    // returns (ordered) array of suggestions
    if (!fragment) {
      return [];
    }
    var suggestions = [];
    for ( var x in this._expectedWords ) {
      word = this._expectedWords[x];
      if ( word.indexOf( fragment ) > -1 ) {
	suggestions.push( word );
	// TODO sort these in order of goodness
	// todo if fragment is multiple words, search for each of them
	// separately within the expected word.
      }
    }
    return suggestions;
  }
};

var anyWord = {
  // a singleton object which can be used in place of a NounType.
 _name: "text",
 match: function( fragment ) {
    return true;
  },
 suggest: function( fragment ) {
    return [ fragment ];
  }
};

var DateNounType = {
  match: function( fragment ) {
    return (this.suggest(fragment).length > 0 );
  },
  suggest: function( fragment )  {
    if (!fragment) {
      return [];
    }
    var date = Date.parse( fragment );
    if (!date) {
      return [];
    }
    return [ "parsed date: " + date.toString() ];
  }
};

var AddressNounType = {
  match: function( fragment ) {

  },
  suggest: function( fragment ) {
    
  }
};