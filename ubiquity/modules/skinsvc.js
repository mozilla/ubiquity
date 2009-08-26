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
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

var EXPORTED_SYMBOLS = ["SkinSvc"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/dbutils.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

const {Application} = Utils;
const SKIN_ROOT = "chrome://ubiquity/skin/skins/";
const SKIN_PREF = "extensions.ubiquity.skin";

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/coreubiquity.properties");

var gConnection = connect();
var gMetaDict = {};

function connect() DbUtils.connectLite(
  "ubiquity_skin_memory",
  { download_uri: "VARCHAR(256)",
    local_uri   : "VARCHAR(256)" },
  [let (path = SKIN_ROOT + name + ".css") [path, path]
   for each (name in ["default", "experimental", "old", "custom"])]);

function SkinSvc(webJsm, msgService) {
  this._webJsm = webJsm;
  this._msgService = msgService;
}

SkinSvc.SkinProto = {
  get metaData() SkinSvc.readMetaData(this),
};

SkinSvc.readMetaData = function SS_readMetaData(
  {css, downloadUrl, localUrl, noCache}) {
  if (!noCache && localUrl in gMetaDict) return gMetaDict[localUrl];
  var metaData = gMetaDict[localUrl] = {name: localUrl};
  css || (css = Utils.getLocalUrl(localUrl, "utf-8"));
  //look for =skin= ~ =/skin= indicating metadata
  var [, data] = /=skin=\s*([^]+)\s*=\/skin=/(css) || 0;
  if (data)
    while(/^[ \t]*@(\w+)[ \t]+(.+)/mg.test(data))
      metaData[RegExp.$1] = Utils.trim(RegExp.$2);
  if (!("homepage" in metaData) && /^https?:/.test(downloadUrl))
    metaData.homepage = downloadUrl;
  return metaData;
};

SkinSvc.reset = function SS_reset() {
  var {databaseFile} = gConnection;
  gConnection.close();
  databaseFile.exists() && databaseFile.remove(false);
  gConnection = connect();
};

SkinSvc.prototype = {
  PREF: SKIN_PREF,
  DEFAULT_SKIN: SKIN_ROOT + "experimental.css",
  CUSTOM_SKIN : SKIN_ROOT + "custom.css",
  
  _createStatement: function SS__createStatement(sql) {
     try {
       return gConnection.createStatement(sql);
     } catch (e) {
       throw new Error(gConnection.lastErrorString);
     }
  },

  _isLocalUrl: function SS__isLocalUrl(skinUrl)
    /^(?:file|chrome)$/.test(Utils.url(skinUrl).scheme),

  //Navigate to chrome://ubiquity/skin/skins/ and get the folder
  _getSkinFolder: function SS__getSkinFolder() {
    var MY_ID = "ubiquity@labs.mozilla.com";
    var em = (Cc["@mozilla.org/extensions/manager;1"]
              .getService(Ci.nsIExtensionManager));
    var file = (em.getInstallLocation(MY_ID)
                .getItemFile(MY_ID, "chrome/skin/skins/default.css")
                .parent);
    return file;
  },

  // file: nsILocalFile / data: string
  _writeToFile: function SS__writeToFile(file, data) {
    try {
      var foStream = (Cc["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Ci.nsIFileOutputStream));
      foStream.init(file, 0x02 | 0x08 | 0x20, 0644, 0);
      foStream.write(data, data.length);
      foStream.close();
    } catch (e) {
      //errorToLocalize
      Cu.reportError("Error writing Ubiquity skin to " + file.path +
                     "\n" + e);
    }
  },

  _writeToLocalUrl: function SS__writeToLocalUrl(url, data) {
    var file = this._getSkinFolder();
    file.append(url.slice(url.lastIndexOf("/") + 1));
    this._writeToFile(file, data);
    SkinSvc.readMetaData({css: data, localUrl: url, noCache: true});
  },

  _randomKey: function SS__randomKey() Math.random().toString(36).slice(-8),

  _hackCssForBug466: function SS__hackCssForBug466(cssPath, sss, action) {
    if (cssPath.spec === "chrome://ubiquity/skin/skins/experimental.css" &&
        Utils.OS === "Darwin") {
      let hackCss =
        Utils.url("chrome://ubiquity/skin/skins/experimental-466hack.css");
      if (action === "register")
        sss.loadAndRegisterSheet(hackCss, sss.USER_SHEET);
      else if (sss.sheetRegistered(hackCss, sss.USER_SHEET))
        sss.unregisterSheet(hackCss, sss.USER_SHEET);
    }
  },

  _hackCssForBug717: function SS__hackCssForBug717(cssPath, sss, action) {
    if (cssPath.spec === "chrome://ubiquity/skin/skins/default.css" &&
        Utils.OS === "Darwin" &&
        let (VC = (Cc["@mozilla.org/xpcom/version-comparator;1"]
                   .getService(Ci.nsIVersionComparator)),
             XULAI = (Cc["@mozilla.org/xre/app-info;1"]
                      .getService(Ci.nsIXULAppInfo))
             ) VC.compare(XULAI.version, "3.1") < 0) {
      let hackCss =
        Utils.url("chrome://ubiquity/skin/skins/default-717hack.css");
      if (action === "register")
        sss.loadAndRegisterSheet(hackCss, sss.USER_SHEET);
      else if (sss.sheetRegistered(hackCss, sss.USER_SHEET))
        sss.unregisterSheet(hackCss, sss.USER_SHEET);
    }
  },

  //Check if the skin from this URL has already been installed
  isInstalled: function SS_isInstalled(url) {
    var selStmt = this._createStatement(
      "SELECT COUNT(*) FROM ubiquity_skin_memory " +
      "WHERE download_uri = ?1");
    selStmt.bindUTF8StringParameter(0, url);
    var count = selStmt.executeStep() ? selStmt.getInt32(0) : 0;
    selStmt.finalize();
    return count !== 0;
  },

  //Add a new skin record into the database
  addSkin: function SS_addSkin(downloadUrl, localUrl) {
    var insStmt = this._createStatement(
      "INSERT INTO ubiquity_skin_memory VALUES (?1, ?2)");
    insStmt.bindUTF8StringParameter(0, downloadUrl);
    insStmt.bindUTF8StringParameter(1, localUrl);
    insStmt.execute();
    insStmt.finalize();
  },

  deleteSkin: function SS_deleteSkin(url) {
    var delStmt = this._createStatement(
      "DELETE FROM ubiquity_skin_memory " +
      "WHERE local_uri = ?1 OR download_uri = ?2");
    delStmt.bindUTF8StringParameter(0, url);
    delStmt.bindUTF8StringParameter(1, url);
    delStmt.execute();
    delStmt.finalize();
  },

  //Unregister any current skins
  //And load this new skin
  loadSkin: function SS_loadSkin(newSkinPath) {
    var sss = (Cc["@mozilla.org/content/style-sheet-service;1"]
               .getService(Ci.nsIStyleSheetService));
    try {
      // Remove the previous skin CSS
      var oldCss = Utils.url(this.currentSkin);
      if (sss.sheetRegistered(oldCss, sss.USER_SHEET))
        sss.unregisterSheet(oldCss, sss.USER_SHEET);
      this._hackCssForBug466(oldCss, sss, "unregister");
      this._hackCssForBug717(oldCss, sss, "unregister");
    } catch (e) {} // do nothing
    //Load the new skin CSS
    var newCss = Utils.url(newSkinPath);
    sss.loadAndRegisterSheet(newCss, sss.USER_SHEET);
    Application.prefs.setValue(this.SKIN_PREF, newSkinPath);
    this._hackCssForBug466(newCss, sss, "register");
    this._hackCssForBug717(newCss, sss, "register");
  },

  //Change the skin and notify
  changeSkin: function SS_changeSkin(newSkinPath) {
    try {
      this.loadSkin(newSkinPath);
      this._msgService.displayMessage(L("ubiquity.skinsvc.skinchanged"));
    } catch (e) {
      this.loadSkin(this.DEFAULT_SKIN);
      //errorToLocalize
      var msg = "Error applying Ubiquity skin from " + newSkinPath;
      this._msgService.displayMessage(msg);
      Cu.reportError(msg + " : " + e);
    }
  },

  updateSkin: function SS_updateSkin(downloadUrl, localUrl) {
    var self = this;
    this._webJsm.jQuery.get(downloadUrl, null, function onSuccess(data) {
      self._writeToLocalUrl(localUrl, data);
    }, "text");
  },

  updateAllSkins: function SS_updateAllSkins() {
    //Only have to update/download remote skins
    //Local skins are pointed at directly
    for each (var skin in this.skinList)
      if (skin.localUrl !== skin.downloadUrl)
        this.updateSkin(skin.downloadUrl, skin.localUrl);
  },

  loadCurrentSkin: function SS_loadCurrentSkin() {
    try {
      this.loadSkin(this.currentSkin);
    } catch (e) {
      //If there's any error loading the current skin,
      //load the default and tell the user about the failure
      this.loadSkin(this.DEFAULT_SKIN);
      //errorToLocalize
      this._msgService.displayMessage(
        "Loading your current skin failed. The default skin will be loaded.");
    }
  },

  install: function SS_install(remote, local) {
    this.addSkin(remote, local);
    this.changeSkin(local);
    Utils.tabs.reload(/^chrome:\/\/ubiquity\/content\/settings\b/);
  },

  uninstall: function SS_uninstall(url) {
    var {skinList} = this;
    EACH_SKIN: {
      for each (var {localUrl, downloadUrl} in skinList)
        if (localUrl !== downloadUrl &&
            localUrl === url || downloadUrl === url)
          break EACH_SKIN;
      return;
    }
    this.deleteSkin(url);
    var file = (Cc["@mozilla.org/network/protocol;1?name=file"]
                .createInstance(Ci.nsIFileProtocolHandler)
                .getFileFromURLSpec(localUrl));
    file.remove(false);
    if (localUrl === this.currentSkin)
      this.changeSkin(this.DEFAULT_SKIN);
  },

  saveCustomSkin: function SS_saveCustomSkin(cssText) {
    this._writeToLocalUrl(this.CUSTOM_SKIN, cssText);
  },

  saveAs: function SS_saveAs(cssText, defaultName) {
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
    this._writeToFile(fp.file, cssText);
    var {spec} = fp.fileURL;
    this.addSkin("data:,dev/null/" + this._randomKey(), spec);
    this.changeSkin(spec);
    SkinSvc.readMetaData({css: cssText, localUrl: spec, noCache: true});
    return fp.file.path;
  },

  get currentSkin SS_getCurrentSkin() {
    return Application.prefs.getValue(this.SKIN_PREF, this.DEFAULT_SKIN);
  },

  get skinList SS_getSkinList() {
    var list = [];
    var selStmt = this._createStatement(
      "SELECT local_uri, download_uri FROM ubiquity_skin_memory");
    while (selStmt.executeStep())
      list.push({
        localUrl: selStmt.getUTF8String(0),
        downloadUrl: selStmt.getUTF8String(1),
        __proto__: SkinSvc.SkinProto,
      });
    selStmt.finalize();
    return list;
  },
};

SkinSvc.prototype.installToWindow = function installToWindow(window) {
  var self = this;
  function showNotification(targetDoc, skinUrl) {
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
      if (self._isLocalUrl(skinUrl)) self.install(skinUrl, skinUrl);
      else self._webJsm.jQuery.get(skinUrl, null, function onSuccess(data) {
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
        var {spec} = ios.newFileURI(file);
        //Add skin to DB and make it the current skin
        self.install(skinUrl, spec);
        SkinSvc.readMetaData({
          css: data, downloadUrl: skinUrl, localUrl: spec, noCache: true});
      }, "text");
    }
  }
  // Watch for any tags of the form <link rel="ubiquity-skin">
  // on pages and install the skin for them if they exist.
  window.addEventListener("DOMLinkAdded", function onLinkAdded({target}) {
    if (target.rel === "ubiquity-skin" && !self.isInstalled(target.href))
      showNotification(target.ownerDocument, target.href);
  }, false);
};
