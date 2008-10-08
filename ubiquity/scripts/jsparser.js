/* Copyright 2008 Christian Sonne <cers@geeksbynature.dk>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


// NOTE: in some cases, RE's might trick this parser...
// var one=/7/*9*/44/ will produce "var one=/744/"
var JSParser = function(script) {
  const PLAIN_STATE     = 0;
  const DQUOTE_STATE    = 1;
  const SQUOTE_STATE    = 2;
  const PCOMMENT_STATE  = 3;
  const MLCOMMENT_STATE = 4;
  const PMLEND_STATE    = 5;
    
  this.data   = script.split("").reverse();
  this.output = "";
  this.state  = PLAIN_STATE;
  this.clean  = function() {
    var chr; var next;
    while ((chr = this.data.pop()) != null) {
      if (chr == "\x5c") {// \ (escape)
        if (this.state == PCOMMENT_STATE) {
          this.output += "/";
          this.state = PLAIN_STATE;
        }
        next = this.data.pop();
        if (this.state != MLCOMMENT_STATE)
            this.output += chr+next;
      } else
        switch (this.state) {
          case PLAIN_STATE:
            switch (chr) {
              case "\x22": // "
                this.state = DQUOTE_STATE;
                this.output += chr;
                break;
              case "\x27": // '
                this.state = SQUOTE_STATE;
                this.output += chr;
                break;
              case "/":
                this.state = PCOMMENT_STATE;
                break;
              default:
                this.output += chr;
                break;
            } break;
          case PCOMMENT_STATE:
            switch (chr) {
              case "/": // encountered single line comment
                this.state = PLAIN_STATE;
                while (true) {
                  next = this.data.pop();
                  if (next == null || next == undefined)
                    break;
                  if (next == "\n") {
                    this.output += next;
                    break;
                  }
                }
                break;
              case "*": // encoutered multi line comment
                this.state = MLCOMMENT_STATE;
                break;
              default: // not a comment after all
                this.state = PLAIN_STATE;
                this.output += "/";
                this.data.push(chr);
                break;
              }; break;
            case DQUOTE_STATE:
              if (chr == "\x22") // "
                this.state = PLAIN_STATE;
              this.output += chr;
              break;
            case SQUOTE_STATE:
              if (chr == "\x27") // '
                this.state = PLAIN_STATE;
              this.output += chr;
              break;
            case MLCOMMENT_STATE:
              if (chr == "*")
                this.state = PMLEND_STATE;
              break;
            case PMLEND_STATE:
              if (chr == "/")
                this.state = PLAIN_STATE;
              break;
            default:
              window.alert("error occured! - no state!");
              break;
          }
    }
    if (this.state == PCOMMENT_STATE)
      this.output += "/";
    return this.output;
  }
};
