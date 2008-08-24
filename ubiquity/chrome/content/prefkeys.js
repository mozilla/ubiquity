var PrefKeys = {
  
  KEYCODE_PREF : "extensions.ubiquity.keycode",
  KEYMODIFIER_PREF : "extensions.ubiquity.keymodifier",
  
  _convertToText : function(aKeyCode){
    if(aKeyCode == 32){
      return "SPACE";
    }else{
      return String.fromCharCode(aKeyCode);
    }
  },
  
  onLoad : function(){

    var defaultKeyModifier = "ALT";
    //default key modifier for windows is CTRL
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                               .getService(Components.interfaces.nsIXULRuntime);
    if(xulRuntime.OS == "WINNT"){
      defaultKeyModifier = "CTRL";
    }
    
    var keyCode = Application.prefs.getValue(this.KEYCODE_PREF, 32);
    var keyModifier = Application.prefs.getValue(this.KEYMODIFIER_PREF, defaultKeyModifier);
    
    var keyText = keyModifier + "+" 
                  + this._convertToText(keyCode) 
                  + " (Click here to change)";
    $("#keyInputBox").val(keyText);
  },
	
  onKeyChange : function(aEvent){

    aEvent.preventDefault();
    aEvent.stopPropagation();

    var keyCode = parseInt(aEvent.keyCode);		
    var keyModifier = (aEvent.altKey) ? "ALT"
                    : (aEvent.ctrlKey) ? "CTRL"
                    : (aEvent.shiftKey) ? "SHIFT"
                    : (aEvent.metaKey) ? "META"
                    : "";

    if(keyModifier == ""){
      $("#keyNotify").text("You must have a modifier like SHIFT, CTRL, ALT or META");
      return;
    }
  
    // Only alphanumeric keys are allowed as shortcuts because 
    // it does not seem to possible to get keycodes properly for 
    // combinations like "shift+]". In this case, pressing "shift+]"
    // will set the keycode to be that of "}" and displaying "shift+}"
    // when the user intended "shift+]" is non-intuitive. Besides,
    // different keyboard layouts might cause problems. SPACE(32) is
    // allowed as a special case below.
    if(((48 > keyCode) || (keyCode > 90)) && (keyCode != 32)){
      //if only shift, alt, ctrl or meta is pressed, don't display warning
      if([16,17,18,224].indexOf(keyCode) == -1){
    	  $("#keyNotify").text("Only alphanumeric keys or space are allowed");
      }
      return;
    }

    Application.prefs.setValue(this.KEYCODE_PREF, keyCode);
    Application.prefs.setValue(this.KEYMODIFIER_PREF, keyModifier);
    var keyText = keyModifier + "+" 
                  + this._convertToText(keyCode) 
                  + " (Click here to change)";
    $("#keyInputBox").val(keyText).blur();
	  $("#keyNotify").text("Your key has been changed to " 
	                        + keyModifier + "+" 
                          + this._convertToText(keyCode));                          
                          
  }
}
