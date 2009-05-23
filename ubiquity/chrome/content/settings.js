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


Components.utils.import("resource://ubiquity/modules/skinsvc.js");
Components.utils.import("resource://ubiquity/modules/msgservice.js");
Components.utils.import("resource://ubiquity/modules/utils.js");

var skinService = new SkinSvc();

function onDocumentLoad() {
  const {CUSTOM_SKIN} = skinService;
  var skinList = skinService.getSkinList(), i = 0;
  for each (let {local_uri, download_uri} in skinList)
    if (local_uri !== CUSTOM_SKIN)
      createSkinElement(local_uri, download_uri, i++);
  createSkinElement(CUSTOM_SKIN, CUSTOM_SKIN, i);
  //If current skin is custom skin, auto-open the editor
  if(skinService.currentSkin === CUSTOM_SKIN)
    openSkinEditor();
}

// Thanks to code by Torisugari at 
// http://forums.mozillazine.org/viewtopic.php?p=921150#921150
function readFile(url){
  var ioService=Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
  var scriptableStream=Cc["@mozilla.org/scriptableinputstream;1"]
    .getService(Ci.nsIScriptableInputStream);

  var channel = ioService.newChannel(url,null,null);
  var input = channel.open();
  scriptableStream.init(input);
  var str = scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();
  return str.split("\n");
}

function createSkinElement(filepath, origpath, id){
  
  try{
    var lines = readFile(filepath);
  }catch(e){
    //If file cannot be read, just move on to the next skin
    return;
  }
  
  var skinMeta = {};
    
  //look for =skin= indicating start of metadata
  var foundMetaData = false;
  var l = 0;
  for(var x in lines){
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
  
  if(!skinMeta.name)
    skinMeta.name = filepath;
  if(!skinMeta.homepage)
    skinMeta.homepage = origpath;

  var skinId = "skin_" + id;
  
  $('#skin-list').append(
     '<div class="command" id="' + skinId + '">' +
     ('<input type="radio" name="skins" id="rad_' + skinId +
      '" value="' + filepath + '"></input>') +
     '<label class="label light" for="rad_'+ skinId + '">' +
     '<a class="name"/>' + 
     '<br/><span class="author"/><span class="license"/></label>' +  
     '<div class="email light"></div>' +
     '<div class="homepage light"></div></div>'
    );
   
  var skinEl = $('#' + skinId);
   
  //Add the name and onclick event
  skinEl.find('.name').text(skinMeta.name);
  skinEl.find('input').attr("onclick", ("skinService.changeSkin('" +
                                        filepath + "');"));
  
  //Make the current skin distinct
  var currentSkin = skinService.currentSkin;
  if (filepath == currentSkin) {
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
  
  skinEl.append(<a class="action" href={"view-source:" + filepath}
                target="_blank">[view source]</a>.toXMLString());
  filepath !== origpath && (
    $("<a class='action'>[uninstall]</a>")
    .click(function uninstall() {
      var before = skinService.currentSkin;
      skinService.uninstall(filepath);
      var after = skinService.currentSkin;
      if(before !== after)
        $("#skin-list input:radio").each(function() {
          if(this.value === after) {
            this.checked = true;
            return false;
          }
        });
      skinEl.slideUp();
    })
    .appendTo(skinEl.append(" ")));
}


function saveCustomSkin(){
  var data = $("#skin-editor").val();
  
  var MY_ID = "ubiquity@labs.mozilla.com";
  var em = Cc["@mozilla.org/extensions/manager;1"]
                     .getService(Ci.nsIExtensionManager);
  var file = em.getInstallLocation(MY_ID)
                .getItemFile(MY_ID, "chrome/skin/skins/custom.css");
                
  var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
  .createInstance(Ci.nsIFileOutputStream);
  foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
  foStream.write(data, data.length);
  foStream.close();
  
  var msgService = new AlertMessageService();
  msgService.displayMessage("Your skin has been saved!");

  if(skinService.currentSkin === skinService.CUSTOM_SKIN)
     skinService.loadCurrentSkin();
}

function pasteToGist(){
  var data = $("#skin-editor").val();
  var name = (/@name[ \t]+(.+)/(data) || 0)[1];
  var ext = ".css";
  Utils.openUrlInBrowser(
    "http://gist.github.com/gists/",
    ["file_" + key + "[gistfile1]=" + encodeURIComponent(val)
     for each([key, val] in Iterator({
       ext: ext,
       name: (name || "ubiquity-skin") + ext,
       contents: data,
     }))].join("&"));
}

function openSkinEditor(){
  //Readfile returns an array
  $('#editor-div').show();
  $("#skin-editor").val(readFile(skinService.CUSTOM_SKIN).join("\n")).focus();
  $('#edit-button').hide();
}
