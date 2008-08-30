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
    if (! this._table[input][chosenSuggestion])
      return 0;
    return this._table[input][chosenSuggestion];
  }
};

