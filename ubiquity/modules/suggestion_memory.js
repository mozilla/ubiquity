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

var Ci = Components.interfaces;
var Cc = Components.classes;
var EXPORTED_SYMBOLS = ["SuggestionMemory"];

var SQLITE_FILE = "ubiquity_suggestion_memory.sqlite";
/* In this schema, one row represents that fact that for the
 * named suggestionMemory object identified by (id_string),
 * it happened (score) number of times that the user typed in
 * the string (input) and, out of all the suggested completions,
 * the one the user chose was (suggestion).
 */
var SQLITE_SCHEMA =
    "CREATE TABLE ubiquity_suggestion_memory(" +
    "  id_string VARCHAR(256)," +
    "  input VARCHAR(256)," +
    "  suggestion VARCHAR(256)," +
    "  score INTEGER);";
var _databaseConnection = null;
var _dirSvc = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);
var _storSvc = Cc["@mozilla.org/storage/service;1"]
                 .getService(Ci.mozIStorageService);

function _getDBFile() {
  var file;

  /* In production code: get the profile directory as a nsIFile
   object, and "append" to it to make the object point to the
   profiledirector/sqlitefile */
  try {
    // We really want to put the file in the profile directory:
    file = _dirSvc.get("ProfD", Ci.nsIFile);
  } catch( ex ) {
    // But if the profile directory is unavailable (which happens
    // when running tests from xpcshell) we can use the temp dir instead.
    file = _dirSvc.get("TmpD", Ci.nsIFile);
  }
  file.append(SQLITE_FILE);
  return file;
}

function _connectToDatabase() {
  // Only create a new connection if we don't already have one open.
  if (!_databaseConnection) {
    var file = _getDBFile();
    /* If the pointed-at file doesn't already exist, it means the database
     * has never been initialized, so we'll have to do it now by running
     * the CREATE TABLE sql. */
    // openDatabase will create empty file if it's not there yet:
    _databaseConnection = _storSvc.openDatabase(file);
    if (file.fileSize == 0) { // empty file? needs initialization!
      _databaseConnection.executeSimpleSQL(SQLITE_SCHEMA);
    }
  }
  return _databaseConnection;
}
// TODO: when and how do we need to close our database connection?

function SuggestionMemory(id) {
  /* Id is a unique string which will keep this suggestion memory
   distinct from the others in the database when persisting.
   mockFileObj is an nsIFile object to be used instead of the real file,
   for unit-testing purposes; leave it out in production code.*/

  this._init(id);
}
SuggestionMemory.prototype = {
  _init: function(id) {
    this._connection = _connectToDatabase();
    this._id = id;
    this._table = {};
    /* this._table is a JSON kind of object with a format like this:
     * {
     *   "input1" : {
     *                "suggestion1" : 3,
     *                "suggestion2" : 4
     *              }
     *   "input2" : {
     *                "suggestion3" : 1
     *              }
     * }
     */

    /* So now, get everything from the database that matches our ID,
     * and turn each row into an entry in this._table:
     */
    let selectSql = "SELECT input, suggestion, score " +
		    "FROM ubiquity_suggestion_memory " +
                    "WHERE id_string == ?1";
    this._selStmt = this._connection.createStatement(selectSql);
    this._selStmt.bindUTF8StringParameter(0, this._id);
    while (this._selStmt.executeStep()) {
      let input = this._selStmt.getUTF8String(0);
      let suggestion = this._selStmt.getUTF8String(1);
      let score = this._selStmt.getUTF8String(2);
      if (!this._table[input])
	this._table[input] = {};
      this._table[input][suggestion] = score;
    }
    this._selStmt.reset();

    /* Compile the insert and update statements that we'll need later: */
    let insertSql = "INSERT INTO ubiquity_suggestion_memory " +
                    "VALUES (?1, ?2, ?3, 1)";
    this._insStmt = this._connection.createStatement(insertSql);
    let updateSql = "UPDATE ubiquity_suggestion_memory " +
		    "SET score = ?1 " +
                    "WHERE id_string = ?2 AND input = ?3 AND suggestion = ?4";
    this._updStmt = this._connection.createStatement(updateSql);
  },

  remember: function(input, chosenSuggestion) {
    /* increase the strength of the association between this input and
       the chosen suggestion. */

    let sql = "";

    if (!this._table[input])
      this._table[input] = {};

    if (!this._table[input][chosenSuggestion]) {
      this._table[input][chosenSuggestion] = 1;
      this._insStmt.bindUTF8StringParameter(0, this._id);
      this._insStmt.bindUTF8StringParameter(1, input);
      this._insStmt.bindUTF8StringParameter(2, chosenSuggestion);
      this._insStmt.execute();
    }
    else {
      let score = this._table[input][chosenSuggestion] + 1;
      this._table[input][chosenSuggestion] = score;
      this._updStmt.bindInt32Parameter(0, score);
      this._updStmt.bindUTF8StringParameter(1, this._id);
      this._updStmt.bindUTF8StringParameter(2, input);
      this._updStmt.bindUTF8StringParameter(3, chosenSuggestion);
      this._updStmt.execute();
    }
  },

  getScore: function(input, suggestion) {
    /* Return the number of times that this suggestion has been associated
       with this input. */
    if (!this._table[input])
      return 0;
    if (! this._table[input][suggestion])
      return 0;
    return this._table[input][suggestion];
  }
};

// Static functions.

SuggestionMemory.wipeDB = function wipeDB() {
  // Should really only be used by unit tests...
  var file = _getDBFile();
  if (file.exists())
    file.remove(false);
};
