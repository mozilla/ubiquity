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

var skins = {};

function onDocumentLoad() {
    
  //Get the extension folder
  var extension = "ubiquity@labs.mozilla.com";
  var file = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager)
            .getInstallLocation(extension)
            .getItemFile(extension, "install.rdf")
            .parent.directoryEntries;
  // Get into chrome/skin/skins
  // TODO: find a better way to navigate folders
  var dirs = ['chrome','skin','skins'];
  for(i in dirs) {
  	while(file.hasMoreElements()){
  	  var entry = file.getNext();
  	  entry.QueryInterface(Components.interfaces.nsIFile);
  	  if(entry.leafName == dirs[i]) {
  	    file = entry.directoryEntries;
  		  break;
  	  }
  	}
  }
  // Find all skins in chrome/skin/skins (remote skins have been downloaded here)
  while(file.hasMoreElements()){
    var entry = file.getNext();
    entry.QueryInterface(Components.interfaces.nsIFile);
    
    if(entry.isFile()){
      createSkinElement(entry);
    } 
  }
  
  //Handle local skins (stored in preference)
  var localSkins = Application.prefs.getValue("extensions.ubiquity.localskinlist", "").split("|");
  for(var i=0;i<localSkins.length;i++){
    if(localSkins[i] != ""){
      var url = Utils.url(localSkins[i]);
      var file = url.QueryInterface(Components.interfaces.nsIFileURL)
                    .file;
      createSkinElement(file);
    }
  }
  
}

//reads a local file and returns the contents as a string
function readFile(file){
  
  var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                          .createInstance(Components.interfaces.nsIFileInputStream);
  istream.init(file, 0x01, 0444, 0);
  istream.QueryInterface(Components.interfaces.nsILineInputStream);

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
  skinMeta.filepath = "file://" + file.path;
    
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
  
  if(foundMetaData){
    
    for(var i=l; i<lines.length; i++){
      var line = jQuery.trim(lines[i]);
      if(line.indexOf("@") != -1){
        
        var temp = line.substring(line.indexOf("@") + 1);
        var field = jQuery.trim(temp.substring( 0 , temp.indexOf(" ")));
        var value = jQuery.trim(temp.substring(temp.indexOf(" ") + 1));
                
        switch(field) {
          case 'name':
            skinMeta.name = value;
            break;
          case 'author':
            skinMeta.author = value;
            break;
          case 'homepage':
            skinMeta.homepage = value;
            break;
          case 'email':
            skinMeta.email = value;
            break
          case 'license':
            skinMeta.license = value;
            break;
        }
      }

      if(line.indexOf("=/skin=") != -1){
        break;
      }
    }
        
    if(!skinMeta.name){
      skinMeta.name = skinMeta.filename;
    }

    //TODO: Make everything optional
    $('#skin-list').append(
       '<li class="command" id="skin_' + skinMeta.name + '">' +
       '<a class="name" onClick="changeSkin(\''+ skinMeta.filepath +'\',\'' + skinMeta.name + '\');">' + 
       skinMeta.name + '</a>' +
       (skinMeta.author ? 
       '<div class="light"><span class="author">by <a href="mailto:' + skinMeta.email + '">' + 
       skinMeta.author  + '</a></span></div>' : "") +  
       (skinMeta.license ? '<div class="light"><span class="license"> - licensed as ' + skinMeta.license + ' </span></div>' : '') 
       + (skinMeta.homepage ? '<div class="homepage light"><a href="' + skinMeta.homepage  + '">' + skinMeta.homepage + 
       '</a></div>' : "") + '</li>'
     );

  }else{
     $('#skin-list').append(
         '<li class="command" id="skin_' + skinMeta.filename + '">' +
         '<a class="name" onClick="changeSkin(\''+ skinMeta.filepath +'\',\'' + skinMeta.filename + '\');">' + 
         skinMeta.filename + '</a>' +
         '</li>'
      );
  }
}

function changeSkin(newSkinPath, newSkinName) {
  
  try {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    //Load the new skin CSS 
    var browserCss = Utils.url(newSkinPath);
    sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
    
    try {
      // Remove the previous skin CSS
      var oldBrowserCss = Utils.url(Application.prefs.getValue("extensions.ubiquity.skin", "default"));
      if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
        sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
    } catch(e) {
      // do nothing      
    }
    
    Application.prefs.setValue("extensions.ubiquity.skin", newSkinPath);
    $('#notify').text("Skin changed to " + newSkinName);
    
  } catch(e) {
    $('#notify').text('Error applying skin: ' + newSkinName);
    Components.utils.reportError("Error applying Ubiquity skin '" + newSkinName + "': " + e);
  }
  
}