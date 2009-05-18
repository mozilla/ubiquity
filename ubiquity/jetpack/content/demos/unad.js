Blacklist = function(){
  this._getRules( "http://easylist.adblockplus.org/easylist.txt" );
};

Blacklist.prototype = {
  _rules: [],
  
  _ruleToRegExp: function(text){
    if( text[0] == "!" || text[0] == "[" || text[0] == "@") return null;
    if( text.match(/\$/) ) return null;

  	var regexp;
  	if (text[0] == "/" && text[text.length - 1] == "/")   // filter is a regexp already
  	{
  		regexp = text.substr(1, text.length - 2);
  	}
  	else
  	{
  		regexp = text.replace(/\*+/g, "*")        // remove multiple wildcards
  								 .replace(/(\W)/g, "\\$1")    // escape special symbols
  								 .replace(/\\\*/g, ".*")      // replace wildcards by .*
  								 .replace(/^\\\|/, "^")       // process anchor at expression start
  								 .replace(/\\\|$/, "$")       // process anchor at expression end
  								 .replace(/^(\.\*)/,"")       // remove leading wildcards
  								 .replace(/(\.\*)$/,"");      // remove trailing wildcards 
  	}

  	if (regexp == "") return null; 

  	return new RegExp(regexp);    
  },
  
  _addRule: function( text ){
    var rule = this._ruleToRegExp(text);
    if( rule ) this._rules.push(rule);    
  },
  
  _getRules: function( url ){
    var self = this;
    $.get( url, function(data){
      data = data.split("\n");
      for each( line in data ) self._addRule( line );
      self._addRule( "doubleclick" );
    });
  },
  
  match: function( url ){
    for each( rule in this._rules){
      if( rule.exec(url) ){
        return true;
        
      }
    }
    return false;
  }
}

var blacklist = new Blacklist();

function removeAds(){
  var doc = Jetpack.tabs.focused.contentDocument;
  $(doc).find("[src]").filter(function(){
    var el = $(this);
    if( el && blacklist.match(el.attr("src")) ){
      el.remove();
    }    
  });
}


Jetpack.statusBar.append({
  url: "unad.html",
  onReady: function(widget){
    var state = "off";
    
    $(widget).click(function(){
      if( state == "off" ){
        removeAds();
        Jetpack.tabs.onReady( removeAds );
        clicker = "on";
      } else {
        Jetpack.tabs.onReady.unbind( removeAds );
        var win = Jetpack.tabs.focused.contentWindow;
        win.location.assign( win.location );
        clicker = "off";
      }
    });
  },  
  width: 42
})