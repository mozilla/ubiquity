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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
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

var EXPORTED_SYMBOLS = ["annSvc"];

// Should be global to prevent slow opening of windows.
var annSvc;
if(annSvc == null)
    annSvc = new AnnSvc();  // Singleton

// Annotation service replacement using SQLite file for storage
function AnnSvc() {
  var ann = {};
  var urls = {};
  var self = this;

  var Ci = Components.interfaces;
  var Cc = Components.classes;

  var SQLITE_FILE = "ubiquity_annotation_memory.sqlite";

  var SQLITE_SCHEMA =
      "CREATE TABLE ubiquity_annotation_memory(" +
      "  uri VARCHAR(256)," +
      "  name VARCHAR(256)," +
      "  value MEDIUMTEXT," +
      " PRIMARY KEY (uri, name));";
  var _gDatabaseConnection = null;
  var _dirSvc = Cc["@mozilla.org/file/directory_service;1"]
                  .getService(Ci.nsIProperties);
  var _storSvc = Cc["@mozilla.org/storage/service;1"]
                   .getService(Ci.mozIStorageService);
  var _ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);

  _connectToDatabase = function () {
    // Only create a new connection if we don't already have one open.
    if (!_gDatabaseConnection) {
      var file = _dirSvc.get("Home", Ci.nsIFile);
      file.append("mozilla");
      if( !file.exists() || !file.isDirectory() ) {   // if it doesn't exist, create
        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
      }
      file.append(SQLITE_FILE);
      _gDatabaseConnection = openDatabase(file);
    }
    return _gDatabaseConnection;
  }

  self._createStatement = function (selectSql) {
    try {
      var selStmt = this._connection.createStatement(selectSql);
      return selStmt;
    } catch (e) {
      throw new Error("AnnSvc SQL error: " + this._connection.lastErrorString + " in " + selectSql);
    }
  }

  // Create DB connection and load all saved annotations
  self._init = function() {
    this._connection = _connectToDatabase();

    let selectSql = "SELECT uri, name, value " +
	      "FROM ubiquity_annotation_memory";
    var selStmt = this._createStatement(selectSql);
    try {
      while (selStmt.executeStep()) {
        let uri_spec = selStmt.getUTF8String(0);
        let name = selStmt.getUTF8String(1);
        let value = selStmt.getUTF8String(2);
        if (!ann[uri_spec]) {
          ann[uri_spec] = new Object();
          urls[uri_spec] = _ioSvc.newURI(uri_spec, null, null);
        }
        ann[uri_spec][name] = value;
      }
    } finally {
      selStmt.finalize();
    }
  }

  self.getPagesWithAnnotation = function(name) {
    var results = [];
    for (uri in ann)
      if (typeof(ann[uri][name]) != 'undefined')
        results.push(urls[uri]);
    return results;
  };

  self.pageHasAnnotation = function(uri, name) {
    if (ann[uri.spec] &&
        typeof(ann[uri.spec][name]) != 'undefined')
      return true;
    return false;
  };

  self.getPageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    return ann[uri.spec][name];
  };

  self.beginTransaction = function() {
    this._connection.beginTransaction();
  };

  self.commitTransaction = function() {
    this._connection.commitTransaction();
  };

  self.setPageAnnotation = function(uri, name, value, dummy,
                                    expiration) {
    if (!ann[uri.spec]) {
      ann[uri.spec] = new Object();
      urls[uri.spec] = uri;
    }
    ann[uri.spec][name] = value;
    let insertSql = "INSERT OR REPLACE INTO ubiquity_annotation_memory " +
                      "VALUES (?1, ?2, ?3)";
      var insStmt = this._createStatement(insertSql);
      try {
        insStmt.bindUTF8StringParameter(0, uri.spec);
        insStmt.bindUTF8StringParameter(1, name);
        insStmt.bindUTF8StringParameter(2, value);
        insStmt.execute();
      } finally {
        insStmt.finalize();
      }
  };

  self.removePageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    delete ann[uri.spec][name];

    // Delete from DB
    let updateSql = ("DELETE FROM ubiquity_annotation_memory " +
                     "WHERE uri = ?1 AND name = ?2");
    var updStmt = this._createStatement(updateSql);
    updStmt.bindUTF8StringParameter(0, uri);
    updStmt.bindUTF8StringParameter(1, name);
    updStmt.execute();
    updStmt.finalize();
  };

  openDatabase = function openDatabase(file) {
    /* If the pointed-at file doesn't already exist, it means the database
     * has never been initialized, so we'll have to do it now by running
     * the CREATE TABLE sql. */
    // openDatabase will create empty file if it's not there yet:
    var connection = null;
    try {
      connection = _storSvc.openDatabase(file);
      if (file.fileSize == 0 ||
          !connection.tableExists("ubiquity_annotation_memory")) {
        // empty file? needs initialization!
        connection.executeSimpleSQL(SQLITE_SCHEMA);
      }
    } catch(e) {
      Components.utils.reportError(
        "Ubiquity's AnnotationMemory database appears to have been corrupted - resetting it."
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

  this._init();
}
