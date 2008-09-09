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

function loadSkinsXML(skinNames) {
  var skins = {};
  for(i in skinNames) {
    skinName = skinNames[i];
    var req = new XMLHttpRequest();
    //TODO: what if there's no skin.xml
    req.open("GET", "chrome://ubiquity/skin/skins/"+skinName+"/skin.xml", false);
    req.overrideMimeType("text/xml");
    req.send(null);
    if (req.status == 0){
        skins[skinName] = $(req.responseXML.childNodes[0]);
    }
  }
  return skins || null;
}

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
  // Find all directories (skins) in chrome/skin/skins
  var skinNames = [];
  while(file.hasMoreElements()){
    var entry = file.getNext();
    entry.QueryInterface(Components.interfaces.nsIFile);
    skinNames.push(entry.leafName);
  }
    
  var skinsXML = loadSkinsXML(skinNames);
  if(skinsXML == null) {
    $("#skin-list").append('<strong>Error loading list of skins.</strong>');
    return;
  }
    
  for(s in skinsXML) {
    var skin = skinsXML[s];
    var skinMeta = {
      'id' : s,
      'name': s,
      'author': {
        'name': skin.find('author').text(),
        'email': skin.find('author').attr('email'),
        'homepage': skin.find('author').attr('homepage')
      },
      'license': skin.find('license').text(),
      'description': skin.find('description').text()
    };
    //TODO: Highlight current skin
    $('#skin-list').append(
      '<li class="command" id="skin_' + skinMeta.id + '">' +
      '<a class="name" onClick="changeSkin(\''+skinMeta.name +'\');">' + skinMeta.name + '</a>' +
      '<span class="description"/>' +
      '<div class="light"><span class="author"/><span class="license"/></div>' +
      '<div class="homepage light"/>' +
      '</li>'
    );
    var skinElement = $(document.getElementById("skin_" + skinMeta.id));
    if(skinMeta.description)
      skinElement.find(".description").html(skinMeta.description);
    else
      skinElement.find(".description").empty();
    if(skinMeta.author)
      skinElement.find(".author").html(formatCommandAuthor(skinMeta.author));
    else
      skinElement.find(".author").empty();
    if(skinMeta.license)
      skinElement.find(".license").html(' - licensed as ' + skinMeta.license);
    else
      skinElement.find(".license").empty();
  }
  
  $('input#useskin').attr('disabled','disabled');
}

function changeSkin(newSkinName) {
  $('input#useskin').attr('disabled','disabled');
  $('#error').empty();
  
  try {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);

    var oldSkinName = Application.prefs.getValue("extensions.ubiquity.skin", "default");
    var skinFolderUrl = "chrome://ubiquity/skin/skins/";
    var oldBrowserCss = Utils.url(skinFolderUrl + oldSkinName + "/browser.css");
    var oldPreviewCss = Utils.url(skinFolderUrl + oldSkinName + "/preview.css");
    
    var browserCss = Utils.url(skinFolderUrl + newSkinName + "/browser.css");
    var previewCss = Utils.url(skinFolderUrl + newSkinName + "/preview.css");
    
    sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
    sss.loadAndRegisterSheet(previewCss, sss.USER_SHEET);
    
    try {
      // this can fail and the rest still work
      if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
        sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
      if(sss.sheetRegistered(oldPreviewCss, sss.USER_SHEET))
        sss.unregisterSheet(oldPreviewCss, sss.USER_SHEET);
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

$(document).ready(onDocumentLoad);
