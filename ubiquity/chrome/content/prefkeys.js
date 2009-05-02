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
    var keyCombo = this.getKeyCombo();
    var keyText = keyCombo[0] + "+" 
                  + keyCombo[1]
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
                          
  },
  
  getKeyCombo : function(){
    var defaultKeyModifier = "ALT";
    //default key modifier for windows is CTRL
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                               .getService(Components.interfaces.nsIXULRuntime);
    if(xulRuntime.OS == "WINNT"){
      defaultKeyModifier = "CTRL";
    }
    
    var keyCode = Application.prefs.getValue(this.KEYCODE_PREF, 32);
    var keyModifier = Application.prefs.getValue(this.KEYMODIFIER_PREF, defaultKeyModifier);
    return [keyModifier, this._convertToText(keyCode)];
  }
}
