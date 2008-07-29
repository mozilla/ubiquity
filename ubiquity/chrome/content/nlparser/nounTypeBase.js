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
      // Do the match in a non-case sensitive way
      var word = this._expectedWords[x].toLowerCase();
      if ( word.indexOf( fragment.toLowerCase() ) > -1 ) {
      	suggestions.push( word );
      	// TODO sort these in order of goodness
      	// todo if fragment is multiple words, search for each of them
      	// separately within the expected word.
      }
    }
    return suggestions;
  }
};
