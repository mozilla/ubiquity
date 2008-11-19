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
  // Find all skins in chrome/skin/skins
  while(file.hasMoreElements()){
    var entry = file.getNext();
    entry.QueryInterface(Components.interfaces.nsIFile);
    
    // open an input stream from file    
    if(entry.isFile()){
      var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                              .createInstance(Components.interfaces.nsIFileInputStream);
      istream.init(entry, 0x01, 0444, 0);
      istream.QueryInterface(Components.interfaces.nsILineInputStream);

      // read lines into array
      var line = {}, lines = [], hasmore;
      do {
        hasmore = istream.readLine(line);
        lines.push(line.value); 
      } while(hasmore);
      
      istream.close();
      
      var skinMeta = {};
      //TODO: extracting filename only properly
      skinMeta.filename = entry.leafName.split(".")[0]; 
      console.log(skinMeta.filename);

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
            var field = temp.substring( 0 , temp.indexOf(" "));
            var value = temp.substring(temp.indexOf(" ") + 1);
            switch(field) {
              case 'name':
                skinMeta.name = value;
              case 'author':
                skinMeta.author = value;
              case 'homepage':
                skinMeta.homepage = value;
              case 'email':
                skinMeta.email = value;
              case 'license':
                skinMeta.license = value;
            }
          }

          if(line.indexOf("=/skin=") != -1){
            break;
          }
        }

        $('#skin-list').append(
           '<li class="command" id="skin_' + skinMeta.name + '">' +
           '<a class="name" onClick="changeSkin(\''+skinMeta.filename +'\');">' + skinMeta.name + '</a>' +
           '<div class="light"><span class="author">by <a href="mailto:' + skinMeta.email + '">' + 
           skinMeta.author  + '</a></span><span class="license"> - licensed as ' + skinMeta.license + ' </span></div>' +
           '<div class="homepage light"><a href="' + skinMeta.homepage  + '">' + skinMeta.homepage + 
           '</a></div' + '</li>'
         );

      }else{
         $('#skin-list').append(
             '<li class="command" id="skin_' + skinMeta.filename + '">' +
             '<a class="name" onClick="changeSkin(\''+skinMeta.filename +'\');">' + skinMeta.filename + '</a>' +
             '</li>'
          );
      }
    } 
  }
}

function changeSkin(newSkinName) {
  $('#error').empty();
  
  try {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);

    var oldSkinName = Application.prefs.getValue("extensions.ubiquity.skin", "default");
    var skinFolderUrl = "chrome://ubiquity/skin/skins/";
    
    var browserCss = Utils.url(skinFolderUrl + newSkinName + ".css");    
    sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
    
    try {
      // this can fail and the rest still work
      var oldBrowserCss = Utils.url(skinFolderUrl + oldSkinName + ".css");
      if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
        sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
    } catch(e) {
      // do nothing
    }
    
    Application.prefs.setValue("extensions.ubiquity.skin", newSkinName);
    $('input#useskin').attr('disabled','disabled');
  } catch(e) {
    $('#error').text('Error applying skin: ' + skin_id);
    Components.utils.reportError("Error applying Ubiquity skin '" + skin_id + "': " + e);
  }
  
  $('#notify').text("Skin changed to " + newSkinName);
}