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

let EXPORTED_SYMBOLS = ["StylishFeedPlugin"];

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/codesource.js");
Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");
Components.utils.import("resource://ubiquity/modules/collection.js");

function StylishFeedPlugin(feedManager, messageService, webJsm) {
  
  var self = this;
  
  this.type = "stylish-update-url";
  //errorToLocalize
  this.notify_message = "This page contains a Stylish userstyle " + 
                        "which Ubiquity can run. " +
                        "If you'd like to subscribe to it, please " +
                        "click the button to the right.";

  this.onSubscribeClick = function SFP_onSubscribeClick(targetDoc,
                                                        commandsUrl,
                                                        mimetype) {
    feedManager.addSubscribedFeed({url: targetDoc.location.href,
                                   title: targetDoc.title,
                                   sourceUrl: commandsUrl,
                                   type: this.type,
                                   canAutoUpdate: true});
    //errorToLocalize
    messageService.displayMessage("Succesfully subscribed to Userstyle!");
                                                            
  };

  this.makeFeed = function SFP_makeFeed(baseFeedInfo, eventHub) {
    return new SFPFeed(baseFeedInfo, eventHub, messageService);
  };

  feedManager.registerPlugin(this);
}

function SFPFeed(baseFeedInfo, eventHub, messageService) {
                   
   let self = this;
   
   let Application = Components.classes["@mozilla.org/fuel/application;1"]
                     .getService(Components.interfaces.fuelIApplication);
   
   // Private instance variables.
   let codeSource;
   if (RemoteUriCodeSource.isValidUri(baseFeedInfo.srcUri))
     codeSource = new RemoteUriCodeSource(baseFeedInfo);
   else
     codeSource = new LocalUriCodeSource(baseFeedInfo.srcUri.spec);
   
   let codeCache;
   let currentContext = null;
   
   function reset(){
     self.pageLoadFuncs = [];
   }
   
   self.nounTypes = [];
   self.commands = {};
   
   self.refresh = function refresh() {
     let code = codeSource.getCode();
          
     if (code != codeCache) {
       reset();
       codeCache = code;
       
       function addStyle(doc, css) {
         var head, style;
         head = doc.getElementsByTagName("head")[0];
         if (!head) { 
           return;
         }
         style = doc.createElement("style");
         style.type = "text/css";
         style.innerHTML = css;
         head.appendChild(style); 
       }
      
       //We are assuming here that there's no way for the CSS to do something harmful.
       self.pageLoadFuncs.push(function(doc){
         addStyle(doc, code.replace("\n", "" , "gi").replace("\"", "\\\"" , "gi") + "\n")}
       );
       eventHub.notifyListeners("feed-change", baseFeedInfo.uri);
      }
   };

   // Initialization.
   reset();
   
   self.__proto__ = baseFeedInfo;
   
}