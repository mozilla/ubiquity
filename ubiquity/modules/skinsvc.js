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

//MAJOR TODO: Split this module into SkinMemory and SkinSvc
//so we don't open DB connections for simple functions like SkinSvc.getCurrentSkin()

var EXPORTED_SYMBOLS = ["SkinSvc"];

Components.utils.import("resource://ubiquity/modules/msgservice.js");
Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/webjsm.js");


var Ci = Components.interfaces;
var Cc = Components.classes;

var SQLITE_FILE = "ubiquity_skin_memory.sqlite";

//Create database with two default skins
var SQLITE_SCHEMA =
    "CREATE TABLE ubiquity_skin_memory(" +
    "  download_uri VARCHAR(256)," +
    "  local_uri VARCHAR(256));"+
    "INSERT INTO ubiquity_skin_memory " +
    "VALUES ('chrome://ubiquity/skin/skins/default.css'," +
    "'chrome://ubiquity/skin/skins/default.css');" +
    "INSERT INTO ubiquity_skin_memory " +
    "VALUES ('chrome://ubiquity/skin/skins/experimental.css'," +
    "'chrome://ubiquity/skin/skins/experimental.css');" +
    "INSERT INTO ubiquity_skin_memory " +
    "VALUES ('chrome://ubiquity/skin/skins/old.css'," +
    "'chrome://ubiquity/skin/skins/old.css');" +
    "INSERT INTO ubiquity_skin_memory " +
    "VALUES ('chrome://ubiquity/skin/skins/custom.css'," +
    "'chrome://ubiquity/skin/skins/custom.css')";

var _gDatabaseConnection = null;

var _dirSvc = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);
var _storSvc = Cc["@mozilla.org/storage/service;1"]
                 .getService(Ci.mozIStorageService);
var Application = Cc["@mozilla.org/fuel/application;1"]
                 .getService(Ci.fuelIApplication);

function _getDatabaseFile() {
  var file = _dirSvc.get("ProfD", Ci.nsIFile);
  file.append(SQLITE_FILE);
  return file;
}

function _connectToDatabase() {
  // Only create a new connection if we don't already have one open.
  if (!_gDatabaseConnection) {
    // We want to put the file in the profile directory
    var file = _getDatabaseFile();
    _gDatabaseConnection = SkinSvc.openDatabase(file);
  }
  return _gDatabaseConnection;
}

function SkinSvc(window) {
  this._init();
  if(window){
    this._window = window;
    
    var webJsm =  new WebJsModule(function(){});
    webJsm.importScript("resource://ubiquity/scripts/jquery.js");
    this.webJsm = webJsm;
    
  }
}

SkinSvc.reset = function reset() {
  var file = _getDatabaseFile();
  if (file.exists())
    file.remove(false);
};

SkinSvc.prototype = {

  SKIN_PREF : "extensions.ubiquity.skin",
  DEFAULT_SKIN: "chrome://ubiquity/skin/skins/experimental.css",

  _init: function _init(){
     this._connection = _connectToDatabase();
     this._msgService = new AlertMessageService();
   },

  _createStatement: function _createStatement(sql) {
     try {
       var stmt = this._connection.createStatement(sql);
       return stmt;
     } catch (e) {
       throw new Error(this._connection.lastErrorString);
     }
  },

  _isLocalUrl : function _isLocalUrl(skinUrl) {
    var url = Utils.url(skinUrl);
    if (url.scheme == "file" || url.scheme == "chrome")
      return true;
    return false;
  },
  //Navigate to chrome://ubiquity/skin/skins/ and get the folder
  _getSkinFolder: function _getSkinFolder(){
    var MY_ID = "ubiquity@labs.mozilla.com";
    var em = Cc["@mozilla.org/extensions/manager;1"]
                       .getService(Ci.nsIExtensionManager);
    var file = em.getInstallLocation(MY_ID)
                  .getItemFile(MY_ID, "chrome/skin/skins/default.css")
                  .parent;
    return file;
  },
  //File should be nsILocalFile
  //and data is the string to be written to the file
  _writeToFile: function _writeToFile(file, data){
    var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Ci.nsIFileOutputStream);
    foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    foStream.write(data, data.length);
    foStream.close();
  },

  //Check if the skin from this URL has already been installed
  isInstalled: function isInstalled(url){
    var selectSql = "SELECT COUNT(*) FROM ubiquity_skin_memory " +
                    "WHERE download_uri = ?1";
    var selStmt = this._createStatement(selectSql);
    selStmt.bindUTF8StringParameter(0, url);
    var count = 0;
    if (selStmt.executeStep()) {
      count = selStmt.getInt32(0);
    }
    return (count != 0);
  },

  //Add a new skin record into the database
  addSkin: function addSkin(downloadUri, localUri){
    var insertSql = "INSERT INTO ubiquity_skin_memory " +
                     "VALUES (?1, ?2)";
    var insStmt = this._createStatement(insertSql);
    insStmt.bindUTF8StringParameter(0, downloadUri);
    insStmt.bindUTF8StringParameter(1, localUri);
    insStmt.execute();
    insStmt.finalize();
  },

  getCurrentSkin: function getCurrentSkin(){
    return Application.prefs.getValue(this.SKIN_PREF, this.DEFAULT_SKIN);
  },

  setCurrentSkin: function setCurrentSkin(skinPath){
    Application.prefs.setValue(this.SKIN_PREF, skinPath);
  },

  _hackCssForBug466: function hackCssForBug466(cssPath, sss,
                                               action) {
    var xulr = Components.classes["@mozilla.org/xre/app-info;1"]
                         .getService(Components.interfaces.nsIXULRuntime);

    cssPath = cssPath.spec;
    if (cssPath == "chrome://ubiquity/skin/skins/experimental.css" &&
        xulr.OS == "Darwin") {
      let hackCss = "chrome://ubiquity/skin/skins/experimental-466hack.css";
      hackCss = Utils.url(hackCss);
      if (action == "register")
        sss.loadAndRegisterSheet(hackCss, sss.USER_SHEET);
      else {
        if(sss.sheetRegistered(hackCss, sss.USER_SHEET))
          sss.unregisterSheet(hackCss, sss.USER_SHEET);
      }
    }
  },

  //Unregister any current skins
  //And load this new skin
  loadSkin: function loadSkin(newSkinPath){
    var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
      .getService(Ci.nsIStyleSheetService);

    try {
      // Remove the previous skin CSS
      var oldCss = Utils.url(this.getCurrentSkin());
      if(sss.sheetRegistered(oldCss, sss.USER_SHEET))
        sss.unregisterSheet(oldCss, sss.USER_SHEET);
      this._hackCssForBug466(oldCss, sss, "unregister");
    } catch(e) {
      // do nothing
    }

    //Load the new skin CSS
    var newCss = Utils.url(newSkinPath);
    sss.loadAndRegisterSheet(newCss, sss.USER_SHEET);
    this._hackCssForBug466(newCss, sss, "register");
  },

  //Change the SKIN_PREF to the new skin
  //And load it as the current skin
  changeSkin: function changeSkin(newSkinPath){
    try {
      this.loadSkin(newSkinPath);
      this.setCurrentSkin(newSkinPath);
      this._msgService.displayMessage("Your Ubiquity skin has been changed!");
    } catch(e) {
      this.loadSkin(this.DEFAULT_SKIN);
      this.setCurrentSkin(this.DEFAULT_SKIN);
      Components.utils.reportError("Error applying Ubiquity skin from'" +
                                    newSkinPath + "': " + e);
      this._msgService.displayMessage("Error applying Ubiquity skin from " + newSkinPath);
    }
  },

  //Get all installed skins
  getSkinList: function getSkinList(){
    var selectSql = "SELECT local_uri, download_uri FROM ubiquity_skin_memory";
    var selStmt = this._createStatement(selectSql);
    var skinList = [];
    while (selStmt.executeStep()) {
      var temp = [];
      temp["local_uri"] = selStmt.getUTF8String(0);
      temp["download_uri"] = selStmt.getUTF8String(1);
      skinList.push(temp);
    }
    return skinList;
  },

  updateSkin: function updateSkin(local_uri, download_uri){
    var self = this;
    try {
      function onSuccess(data) {
        //Navigate to chrome://ubiquity/skin/skins
        var file = self._getSkinFolder();
        //Select the local file for the skin
        var filename = local_uri.substr(local_uri.lastIndexOf("/") + 1);
        file.append(filename);
        //Write the updated CSS to the file
        self._writeToFile(file, data);
      }

      this.webJsm.jQuery.ajax({url: download_uri,
          dataType: "text",
          success: onSuccess});
    } catch(e) {
      Components.utils.reportError("Error writing Ubiquity skin to file'" +
                                    local_uri + "': " + e);
    }

  },

  updateAllSkins: function updateAllSkins(){
    var skinList = this.getSkinList();
    //Only have to update/download remote skins
    //Local skins are pointed at directly
    for each(var skin in skinList){
      if(!this._isLocalUrl(skin["download_uri"])){
        this.updateSkin(skin["local_uri"], skin["download_uri"]);
      }
    }
  }

}


SkinSvc.prototype.installToWindow = function installToWindow() {

  var self = this;
  var window = this._window;

  function showNotification(targetDoc, skinUrl, mimetype) {

    // Find the <browser> which contains notifyWindow, by looking
    // through all the open windows and all the <browsers> in each.
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    var enumerator = wm.getEnumerator(Utils.appWindowType);
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

      function onSubscribeClick(notification, button) {
          function onSuccess(data) {

            //Navigate to chrome://ubiquity/skin/skins/
            var file = self._getSkinFolder();

            //Select a random name for the file
            var filename = Math.random().toString() + ".css";
            //Create the new file
            file.append(filename);
            file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

            //Write the downloaded CSS to the file
            self._writeToFile(file, data);

            var ios = Cc["@mozilla.org/network/io-service;1"]
                                .getService(Ci.nsIIOService);
            var url = ios.newFileURI(file);

            //Add skin to DB and make it the current skin
            self.addSkin(skinUrl, url.spec);
            self.changeSkin(url.spec);
          }

          //Only file:// is considered a local url
          if(self._isLocalUrl(skinUrl)){
            //Add skin to DB and make it the current skin
            self.addSkin(skinUrl, skinUrl);
            self.changeSkin(skinUrl);
          }else{
            //Get the CSS from the remote file
            self.webJsm.jQuery.ajax({url: skinUrl,
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
  // on pages and install the skin for them if they exist.
  function onLinkAdded(event) {
    if (event.target.rel != "ubiquity-skin"
        || self.isInstalled(event.target.href))
      return;

    onPageWithSkin(event.target.baseURI,
                   event.target.href,
                   event.target.ownerDocument,
                   event.target.type);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);

};

//Static functions

SkinSvc.openDatabase = function openDatabase(file) {
  /* If the pointed-at file doesn't already exist, it means the database
   * has never been initialized, so we'll have to do it now by running
   * the CREATE TABLE sql. */

  var connection = null;
  try {
    connection = _storSvc.openDatabase(file);
    if (file.fileSize == 0 ||
        !connection.tableExists("ubiquity_skin_memory")) {
      // empty file? needs initialization!
      connection.executeSimpleSQL(SQLITE_SCHEMA);
    }
  } catch(e) {
    Components.utils.reportError(
      "Ubiquity's SkinMemory database appears to have been corrupted - resetting it."
      );
    if (file.exists()) {
      // remove currupt database
      file.remove(false);
    }
    connection = _storSvc.openDatabase(file);
    connection.executeSimpleSQL(SQLITE_SCHEMA);
  }
  return connection;
};
