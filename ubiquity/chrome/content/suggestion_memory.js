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

/* Schema in sqlite will be like:
 *
 * CREATE TABLE ubiquity_suggestion_memory(
 *   id_string VARCHAR(256),
 *   input VARCHAR(256),
 *   suggestion VARCHAR(256),
 *   score INTEGER
 * );
 *
 * */

/* The tricky bit is, we can only call 'remember' on execute... so cmds
 * which you "use" by looking at the preview will not be remembered.  I
 * don't have any good way to fix this.
 */

function SuggestionMemory(id) {
  // Id is a unique string which will keep this suggestion memory
  // distinct from the others in the database when persisting.
  this._init(id);
}
SuggestionMemory.prototype = {
  _init: function(id) {
    let sql = "SELECT input, suggestion, score FROM ubiquity_suggestion_memory"
      + " WHERE id_string == " + id + ";";
    // TODO execute this sql and use it to populate this._table.

    this._id = id;
    this._table = {};
  },

  remember: function(input, chosenSuggestion) {
    /* increase the strength of the association between this input and
       the chosen suggestion. */

    let sql = "";

    if (!this._table[input])
      this._table[input] = {};

    if (!this._table[input][chosenSuggestion]) {
      this._table[input][chosenSuggestion] = 1;
      sql = "INSERT INTO ubiquity_suggestion_memory VALUES ('" + this._id +
	"','" + input + "','" + chosenSuggestion + "',1);";
    }
    else {
      let score = this._table[input][chosenSuggestion] + 1;
      this._table[input][chosenSuggestion] = score;
      sql = "UPDATE ubiquity_suggestion_memory SET score = " + score +
      " WHERE input = " + input + " AND suggestion = " + chosenSuggestion +
      " AND id_string = " + this._id + ";";
    }

    // TODO execute this sql.
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

