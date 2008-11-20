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


function SkinInstaller() {
  if (SkinInstaller.__singleton)
    return SkinInstaller.__singleton;

  SkinInstaller.__install(window);
  SkinInstaller.__singleton = this;
  return SkinInstaller.__singleton;
}

SkinInstaller.changeSkin = function changeSkin(newSkinPath) {
  try {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    //Load the new skin CSS 
    var browserCss = Utils.url(newSkinPath);
    sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
    
    try {
      // Remove the previous skin CSS
      var oldBrowserCss = Utils.url(Application.prefs.getValue("extensions.ubiquity.skin",
                                    "default"));
      if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
        sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
    } catch(e) {
      // do nothing      
    }
    
    Application.prefs.setValue("extensions.ubiquity.skin", newSkinPath);
    //TODO: Find a better way to call displayMessage
    window.gUbiquity.__cmdManager
          .__msgService.displayMessage("Your Ubiquity skin has been changed!");
    
  } catch(e) {
    Components.utils.reportError("Error applying Ubiquity skin from'" + 
                                  newSkinPath + "': " + e);
    window.gUbiquity.__cmdManager
           .__msgService.displayMessage("Error applying Ubiquity skin from " + newSkinPath);
  } 
}

SkinInstaller.__install = function SkinInstaller_install(window) {
    
  function showNotification(targetDoc, commandsUrl, mimetype) {
    
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    // Find the <browser> which contains notifyWindow, by looking
    // through all the open windows and all the <browsers> in each.
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    var tabbrowser = null;
    var foundBrowser = null;

    while (!foundBrowser && enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      tabbrowser = win.getBrowser();
      foundBrowser = tabbrowser.getBrowserForDocument(targetDoc);
    }

    // Return the notificationBox associated with the browser.
    if (foundBrowser) {
      var box = tabbrowser.getNotificationBox(foundBrowser);
      var BOX_NAME = "ubiquity_notify_skin_available";
      var oldNotification = box.getNotificationWithValue(BOX_NAME);
      if (oldNotification)
        box.removeNotification(oldNotification);

      function isLocalUrl(commandsUrl) {
        var url = Utils.url(commandsUrl);
        if (url.scheme == "file")
          return true;
        return false;
      }

      function onSubscribeClick(notification, button) {
          function onSuccess(data) {
        
            //Navigate to chrome://ubiquity/skin/skins/
            var MY_ID = "ubiquity@labs.mozilla.com";
            var em = Cc["@mozilla.org/extensions/manager;1"]
                               .getService(Ci.nsIExtensionManager);
            var file = em.getInstallLocation(MY_ID)
                          .getItemFile(MY_ID, "chrome/skin/skins/default.css")
                          .parent;
            //Select a random name for the file
            var filename = Math.random().toString() + ".css";
            //Create the new file
            file.append(filename);
            file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
            //Write the downloaded CSS to the file
            var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Ci.nsIFileOutputStream);
            foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
            foStream.write(data, data.length);
            foStream.close();          
            SkinInstaller.changeSkin("file://" + file.path);
          }

          //Only file:// is considered a local url
          if(isLocalUrl(commandsUrl)){
            //Install it by adding to the local skins list
            const LOCALSKINLIST_PREF = "extensions.ubiquity.localskinlist";
            var localSkins = Application.prefs.getValue(LOCALSKINLIST_PREF, "");
            localSkins += "|" + commandsUrl;
            Application.prefs.setValue(LOCALSKINLIST_PREF, localSkins);
            SkinInstaller.changeSkin(commandsUrl);
          }else{
            //Get the CSS from the remote file
            jQuery.ajax({url: commandsUrl,
              dataType: "text",
              success: onSuccess});
          }
      }

      var buttons = [
      {accessKey: null,
        callback: onSubscribeClick,
        label: "Install...",
        popup: null}
        ];
      box.appendNotification(
        ("This page contains a Ubiquity skin.  " +
        "If you'd like to install the skin, please " +
        "click the button to the right."),
        BOX_NAME,
        "chrome://ubiquity/skin/icons/favicon.ico",
        box.PRIORITY_INFO_MEDIUM,
        buttons
      );
          
    } else {
      Components.utils.reportError("Couldn't find tab for document");
    }
  }

  function onPageWithSkin(pageUrl, skinUrl, document, mimetype) {
      showNotification(document, skinUrl, mimetype);
  }

  // Watch for any tags of the form <link rel="ubiquity-skin">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (event.target.rel != "ubiquity-skin")
      return;

    onPageWithSkin(event.target.baseURI,
                   event.target.href,
                   event.target.ownerDocument,
                   event.target.type);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);

};
