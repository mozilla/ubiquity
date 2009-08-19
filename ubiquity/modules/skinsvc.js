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
//so we don't open DB connections for simple functions like SkinSvc.addSkin()

var EXPORTED_SYMBOLS = ["SkinSvc"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/msgservice.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/coreubiquity.properties");

const SQLITE_FILE = "ubiquity_skin_memory.sqlite";

//Create database with default skins
const SQLITE_SCHEMA = (
  ("CREATE TABLE ubiquity_skin_memory(" +
   "  download_uri VARCHAR(256)," +
   "     local_uri VARCHAR(256));") +
  ["default", "experimental", "old", "custom"]
  .map(function(name) {
    var path = "chrome://ubiquity/skin/skins/" + name + ".css";
    return ("INSERT INTO ubiquity_skin_memory VALUES ('" +
            path + "', '" + path + "');");
  }).join(''));

var _gDatabaseConnection = null;

var _dirSvc = (Cc["@mozilla.org/file/directory_service;1"]
               .getService(Ci.nsIProperties));
var _storSvc = (Cc["@mozilla.org/storage/service;1"]
                .getService(Ci.mozIStorageService));
var Application = (Cc["@mozilla.org/fuel/application;1"]
                   .getService(Ci.fuelIApplication));

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

function SkinSvc(webJsm) {
  this._init();
  this.webJsm = webJsm;
}

SkinSvc.reset = function reset() {
  var file = _getDatabaseFile();
  if (file.exists())
    file.remove(false);
};

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
  } catch (e) {
    //errorToLocalize
    Cu.reportError("Ubiquity's SkinMemory database appears to " +
                                 "have been corrupted - resetting it.");
    if (file.exists()) {
      // remove corrupted database
      file.remove(false);
    }
    connection = _storSvc.openDatabase(file);
    connection.executeSimpleSQL(SQLITE_SCHEMA);
  }
  return connection;
};

SkinSvc.prototype = {
  SKIN_PREF : "extensions.ubiquity.skin",
  DEFAULT_SKIN: "chrome://ubiquity/skin/skins/experimental.css",
  CUSTOM_SKIN: "chrome://ubiquity/skin/skins/custom.css",

  _init: function _init() {
     this._connection = _connectToDatabase();
     this._msgService = new AlertMessageService();
   },

  _createStatement: function _createStatement(sql) {
     try {
       return this._connection.createStatement(sql);
     } catch (e) {
       throw new Error(this._connection.lastErrorString);
     }
  },

  _isLocalUrl : function _isLocalUrl(skinUrl) {
    var url = Utils.url(skinUrl);
    return url.scheme === "file" || url.scheme === "chrome";
  },
  //Navigate to chrome://ubiquity/skin/skins/ and get the folder
  _getSkinFolder: function _getSkinFolder() {
    var MY_ID = "ubiquity@labs.mozilla.com";
    var em = (Cc["@mozilla.org/extensions/manager;1"]
              .getService(Ci.nsIExtensionManager));
    var file = (em.getInstallLocation(MY_ID)
                .getItemFile(MY_ID, "chrome/skin/skins/default.css")
                .parent);
    return file;
  },
  //File should be nsILocalFile
  //and data is the string to be written to the file
  _writeToFile: function _writeToFile(file, data) {
    var foStream = (Cc["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Ci.nsIFileOutputStream));
    foStream.init(file, 0x02 | 0x08 | 0x20, 0644, 0);
    foStream.write(data, data.length);
    foStream.close();
  },

  _randomKey: function _randomKey() Math.random().toString(36).slice(-8),

  //Check if the skin from this URL has already been installed
  isInstalled: function isInstalled(url) {
    var selectSql = "SELECT COUNT(*) FROM ubiquity_skin_memory " +
                    "WHERE download_uri = ?1";
    var selStmt = this._createStatement(selectSql);
    selStmt.bindUTF8StringParameter(0, url);
    var count = 0;
    if (selStmt.executeStep()) {
      count = selStmt.getInt32(0);
    }
    selStmt.finalize();
    return count !== 0;
  },

  //Add a new skin record into the database
  addSkin: function addSkin(downloadUri, localUri) {
    var insertSql = "INSERT INTO ubiquity_skin_memory VALUES (?1, ?2)";
    var insStmt = this._createStatement(insertSql);
    insStmt.bindUTF8StringParameter(0, downloadUri);
    insStmt.bindUTF8StringParameter(1, localUri);
    insStmt.execute();
    insStmt.finalize();
  },

  deleteSkin: function deleteSkin(url) {
    var deleteSql = ("DELETE FROM ubiquity_skin_memory " +
                     "WHERE local_uri = ?1 OR download_uri = ?2");
    var delStmt = this._createStatement(deleteSql);
    delStmt.bindUTF8StringParameter(0, url);
    delStmt.bindUTF8StringParameter(1, url);
    delStmt.execute();
    delStmt.finalize();
  },

  get currentSkin() {
    return Application.prefs.getValue(this.SKIN_PREF, this.DEFAULT_SKIN);
  },

  _hackCssForBug466: function hackCssForBug466(cssPath, sss, action) {
    cssPath = cssPath.spec;
    if (cssPath === "chrome://ubiquity/skin/skins/experimental.css" &&
        Utils.OS === "Darwin") {
      let hackCss = "chrome://ubiquity/skin/skins/experimental-466hack.css";
      hackCss = Utils.url(hackCss);
      if (action === "register")
        sss.loadAndRegisterSheet(hackCss, sss.USER_SHEET);
      else {
        if (sss.sheetRegistered(hackCss, sss.USER_SHEET))
          sss.unregisterSheet(hackCss, sss.USER_SHEET);
      }
    }
  },

  _hackCssForBug717: function hackCssForBug717(cssPath, sss, action) {
    var appInfo = (Cc["@mozilla.org/xre/app-info;1"]
                   .getService(Ci.nsIXULAppInfo));
    var versionChecker = (Cc["@mozilla.org/xpcom/version-comparator;1"]
                          .getService(Ci.nsIVersionComparator));
    cssPath = cssPath.spec;
    if (cssPath === "chrome://ubiquity/skin/skins/default.css" &&
        Utils.OS === "Darwin" &&
        versionChecker.compare(appInfo.version, "3.1") < 0) {
      let hackCss = "chrome://ubiquity/skin/skins/default-717hack.css";
      hackCss = Utils.url(hackCss);
      if (action === "register") {
        sss.loadAndRegisterSheet(hackCss, sss.USER_SHEET);
      }
      else {
        if(sss.sheetRegistered(hackCss, sss.USER_SHEET))
          sss.unregisterSheet(hackCss, sss.USER_SHEET);
      }
    }
  },

  //Unregister any current skins
  //And load this new skin
  loadSkin: function loadSkin(newSkinPath) {
    var sss = (Cc["@mozilla.org/content/style-sheet-service;1"]
               .getService(Ci.nsIStyleSheetService));
    try {
      // Remove the previous skin CSS
      var oldCss = Utils.url(this.currentSkin);
      if(sss.sheetRegistered(oldCss, sss.USER_SHEET))
        sss.unregisterSheet(oldCss, sss.USER_SHEET);
      this._hackCssForBug466(oldCss, sss, "unregister");
      this._hackCssForBug717(oldCss, sss, "unregister");
    } catch (e) {
      // do nothing
    }

    //Load the new skin CSS
    var newCss = Utils.url(newSkinPath);
    sss.loadAndRegisterSheet(newCss, sss.USER_SHEET);
    Application.prefs.setValue(this.SKIN_PREF, newSkinPath);
    this._hackCssForBug466(newCss, sss, "register");
    this._hackCssForBug717(newCss, sss, "register");
  },

  //Change the skin and notify
  changeSkin: function changeSkin(newSkinPath) {
    try {
      this.loadSkin(newSkinPath);
      //errorToLocalize
      this._msgService.displayMessage("Your Ubiquity skin has been changed!");
    } catch (e) {
      this.loadSkin(this.DEFAULT_SKIN);
      var msg = "Error applying Ubiquity skin from " + newSkinPath;
      this._msgService.displayMessage(msg);
      Cu.reportError(msg + " : " + e);
    }
  },

  //Get all installed skins
  get skinList() {
    var selectSql = "SELECT local_uri, download_uri FROM ubiquity_skin_memory";
    var selStmt = this._createStatement(selectSql);
    var skinList = [];
    while (selStmt.executeStep())
      skinList.push({
        local_uri: selStmt.getUTF8String(0),
        download_uri: selStmt.getUTF8String(1)});
    selStmt.finalize();
    return skinList;
  },

  updateSkin: function updateSkin(downloadUri, localUri) {
    var self = this;
    try {
      function onSuccess(data) {
        //Navigate to chrome://ubiquity/skin/skins
        var file = self._getSkinFolder();
        //Select the local file for the skin
        var filename = localUri.substr(localUri.lastIndexOf("/") + 1);
        file.append(filename);
        //Write the updated CSS to the file
        self._writeToFile(file, data);
      }

      this.webJsm.jQuery.ajax({
        url: downloadUri,
        dataType: "text",
        success: onSuccess});
    } catch(e) {
      //errorToLocalize
      Cu.reportError("Error writing Ubiquity skin to file'" +
                     localUri + "': " + e);
    }
  },

  updateAllSkins: function updateAllSkins() {
    //Only have to update/download remote skins
    //Local skins are pointed at directly
    for each (var skin in this.skinList)
      if (skin.local_uri !== skin.download_uri)
        this.updateSkin(skin.download_uri, skin.local_uri);
  },

  loadCurrentSkin: function loadCurrentSkin() {
    try {
      this.loadSkin(this.currentSkin);
    } catch (e) {
      //If there's any error loading the current skin,
      //load the default and tell the user about the failure
      this.loadSkin(this.DEFAULT_SKIN);
      //errorToLocalize
      this._msgService.displayMessage("Loading your current skin failed." +
                                      " The default skin will be loaded.");
    }
  },

  install: function install(remote, local) {
    this.addSkin(remote, local);
    this.changeSkin(local);
    Utils.tabs.reload(/^chrome:\/\/ubiquity\/content\/settings\b/);
  },

  uninstall: function uninstall(url) {
    var {skinList} = this, found = false;
    for each (var {local_uri, download_uri} in skinList)
      if(local_uri === url || download_uri === url) {
        found = true;
        break;
      }
    if(!found || local_uri === download_uri)
      return;
    this.deleteSkin(url);
    var fph = (Cc["@mozilla.org/network/protocol;1?name=file"]
               .createInstance(Ci.nsIFileProtocolHandler));
    var file = fph.getFileFromURLSpec(url);
    file.remove(false);
    if(local_uri === this.currentSkin)
      this.changeSkin(this.DEFAULT_SKIN);
  },

  saveAs: function saveAs(cssText, defaultName) {
    const {nsIFilePicker} = Ci;
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(Utils.currentChromeWindow,
            L("ubiquity.skinsvc.saveyourskin"),
            nsIFilePicker.modeSave);
    fp.defaultString = defaultName || "";
    fp.appendFilter("CSS (*.css)", "*.css");
    var rv = fp.show();
    if (rv !== nsIFilePicker.returnOK &&
        rv !== nsIFilePicker.returnReplace)
      return null;
    var fos = (Cc["@mozilla.org/network/file-output-stream;1"]
               .createInstance(Ci.nsIFileOutputStream));
    this._writeToFile(fp.file, cssText);
    var {spec} = fp.fileURL;
    this.addSkin("data:,dev/null/" + this._randomKey(), spec);
    this.changeSkin(spec);
    return fp.file.path;
  }
}

SkinSvc.prototype.installToWindow = function installToWindow(window) {
  var self = this;

  function showNotification(targetDoc, skinUrl, mimetype) {
    Utils.notify({
      target: targetDoc,
      label: L("ubiquity.skinsvc.newskinfound"),
      value: "ubiquity_notify_skin_available",
      priority: "INFO_MEDIUM",
      buttons: [{
        accessKey: "I",
        callback: onSubscribeClick,
        label: L("ubiquity.skinsvc.installskin"),
      }]});
    function onSubscribeClick(notification, button) {
      function onSuccess(data) {
        //Navigate to chrome://ubiquity/skin/skins/
        var file = self._getSkinFolder();
        //Select a random name for the file
        var filename = self._randomKey() + ".css";
        //Create the new file
        file.append(filename);
        file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);
        //Write the downloaded CSS to the file
        self._writeToFile(file, data);

        var ios = (Cc["@mozilla.org/network/io-service;1"]
                   .getService(Ci.nsIIOService));
        var url = ios.newFileURI(file);
        //Add skin to DB and make it the current skin
        self.install(skinUrl, url.spec);
      }
      //Only file:// is considered a local url
      if (self._isLocalUrl(skinUrl))
        self.install(skinUrl, skinUrl);
      else {
        //Get the CSS from the remote file
        self.webJsm.jQuery.ajax({
          url: skinUrl,
          dataType: "text",
          success: onSuccess});
      }
    }
  }
  // Watch for any tags of the form <link rel="ubiquity-skin">
  // on pages and install the skin for them if they exist.
  window.addEventListener("DOMLinkAdded", function onLinkAdded({target}) {
    if (target.rel === "ubiquity-skin" &&
        !self.isInstalled(target.href))
    showNotification(target.ownerDocument,
                     target.href,
                     target.type);
  }, false);
};
