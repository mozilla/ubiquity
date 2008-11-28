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
 
var Cc = Components.classes;
var Ci = Components.interfaces;

function onDocumentLoad() {
  
  var MY_ID = "ubiquity@labs.mozilla.com";
  var em = Cc["@mozilla.org/extensions/manager;1"]
                     .getService(Ci.nsIExtensionManager);
  var file = em.getInstallLocation(MY_ID)
                .getItemFile(MY_ID, "chrome/skin/skins/default.css")
                .parent.directoryEntries;
                
  // Find all skins in chrome/skin/skins (remote skins have been downloaded here)
  while(file.hasMoreElements()){
    var entry = file.getNext();
    entry.QueryInterface(Ci.nsIFile);
    if(entry.isFile()){
      createSkinElement(entry);
    } 
  }
  
  //Handle local skins (stored in preference)
  var localSkins = Application.prefs.getValue("extensions.ubiquity.localskinlist", "").split("|");
  for(var i=0;i<localSkins.length;i++){
    if(localSkins[i] != ""){
      var url = Utils.url(localSkins[i]);
      var file = url.QueryInterface(Ci.nsIFileURL)
                    .file;
      createSkinElement(file);
    }
  }
}

//reads a local file and returns the contents as a string
function readFile(file){
  
  var istream = Cc["@mozilla.org/network/file-input-stream;1"]
                          .createInstance(Ci.nsIFileInputStream);
  istream.init(file, 0x01, 0444, 0);
  istream.QueryInterface(Ci.nsILineInputStream);

  // read lines into array
  var line = {}, lines = [], hasmore;
  do {
    hasmore = istream.readLine(line);
    lines.push(line.value); 
  } while(hasmore);
  
  istream.close();
  
  return lines;
}

function createSkinElement(file){
  
  var lines = readFile(file);
  
  var skinMeta = {};
  skinMeta.filename = file.leafName; 
  //get the path to the file
  var ios = Cc["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
  var url = ios.newFileURI(file);
  skinMeta.filepath = url.spec;
    
  //look for =skin= indicating start of metadata
  var foundMetaData = false;
  var l = 0;
  for(x in lines){
    l = x;
    var line = lines[x];
    if(line.indexOf("=skin=") != -1){
      foundMetaData = true;
      break;
    }
  }
  
  //extract the metadata
  if(foundMetaData){
    for(var i=l; i<lines.length; i++){
      var line = jQuery.trim(lines[i]);
      if(line.indexOf("@") != -1){
        
        var temp = line.substring(line.indexOf("@") + 1);
        var field = jQuery.trim(temp.substring( 0 , temp.indexOf(" ")));
        var value = jQuery.trim(temp.substring(temp.indexOf(" ") + 1));
        skinMeta[field] = value;
      }

      if(line.indexOf("=/skin=") != -1){
        break;
      }
    }
  }
  
  if(!skinMeta.name){
    skinMeta.name = skinMeta.filename;
  }
  
  //TODO: Find a better way to have unique ids
  // +, # and some other characters will still screw up the id
  var skinId = ("skin_" + skinMeta.name).replace(/ /g, "_").replace(/\./g, "");
  
  $('#skin-list').append(
     '<div class="command" id="' + skinId + '">'+
     '<input type="radio" name="skins" id="rad_'+ skinId +'"></input>' +
     '<label class="label light" for="rad_'+  skinId + '">' +
     '<a class="name"/>' + 
     '<br/><span class="author"/><span class="license"/></label>' +  
     '<div class="email light"></div>' +
     '<div class="homepage light"></div></div>'
   );
   
   var skinEl = $('#skin-list').find('#' + skinId);
   
   //Add the name and onclick event
   skinEl.find('.name').text(skinMeta.name);
   skinEl.find('.label').attr("onclick", "changeSkin('"+ skinMeta.filepath + "','" + skinMeta.name + "');");
   
   //Make the current skin distinct
   var currentSkin = Application.prefs.getValue("extensions.ubiquity.skin", "default");
   if(skinMeta.filepath == currentSkin){
     skinEl.find('#rad_' + skinId).attr('checked','true');
   }
   
   if(skinMeta.author) {
     skinEl.find('.author').text("by " + skinMeta.author);
   }
   
   if(skinMeta.email){
     skinEl.find('.email').html("email: <a href='mailto:" + skinMeta.email  + 
                                    "'>" + skinMeta.email + "</a>");
   }
   
   if(skinMeta.license){
     skinEl.find('.license').text(" licensed as " + skinMeta.license);
   }
   
   if(skinMeta.homepage){
     skinEl.find('.homepage').html("<a href='" + skinMeta.homepage  + 
                                    "'>" + skinMeta.homepage + "</a>");
   }
}

function changeSkin(newSkinPath, newSkinName) {
  
  try {
    var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
      .getService(Ci.nsIStyleSheetService);
    try {
      // Remove the previous skin CSS
      var oldBrowserCss = Utils.url(Application.prefs.getValue("extensions.ubiquity.skin", "default"));
      if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
        sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
    } catch(e) {
      // do nothing      
    }

    //Load the new skin CSS 
    var browserCss = Utils.url(newSkinPath);
    sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
    
    Application.prefs.setValue("extensions.ubiquity.skin", newSkinPath);
    $('#notify').text("Skin changed to " + newSkinName);
    
    
  } catch(e) {
    $('#notify').text('Error applying skin: ' + newSkinName);
    Components.utils.reportError("Error applying Ubiquity skin '" + newSkinName + "': " + e);
  }
  
}