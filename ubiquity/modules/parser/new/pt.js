/***** BEGIN LICENSE BLOCK *****
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
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Felipe Gomes <felipc@gmail.com>
 *   Fernando Takai <fernando.takai@gmail.com>    
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

function makeParser() {
  var pt = new Parser('pt');
  pt.roles = [
    {role: 'goal', delimiter: 'à'},
    {role: 'goal', delimiter: 'ao'},
    {role: 'goal', delimiter: 'a'},
    {role: 'goal', delimiter: 'até'},
    {role: 'goal', delimiter: 'em'},
    {role: 'goal', delimiter: 'no'},
    {role: 'goal', delimiter: 'na'},
    {role: 'goal', delimiter: 'pra'},
    {role: 'goal', delimiter: 'para'},

    {role: 'source', delimiter: 'de'},
    {role: 'source', delimiter: 'des'},
    {role: 'source', delimiter: 'do'},
    {role: 'source', delimiter: 'da'},

    {role: 'location', delimiter: 'em'},

    {role: 'time', delimiter: 'às'},
    {role: 'time', delimiter: 'de'},
    {role: 'time', delimiter: 'a'},
    {role: 'time', delimiter: 'as'},

    {role: 'instrument', delimiter: 'com'},
    {role: 'instrument', delimiter: 'usando'},
    {role: 'instrument', delimiter: 'pelo'},
    {role: 'instrument', delimiter: 'pela'},
    {role: 'instrument', delimiter: 'no'},
    {role: 'instrument', delimiter: 'na'},
    
    {role: 'format', delimiter: 'em'},

    {role: 'modifier', delimiter: 'de'},
    {role: 'modifier', delimiter: 'para'},

    {role: 'alias', delimiter: 'como'}

  ];
  pt.branching = 'right';
  pt.anaphora = ['isto', 'isso', 'aquilo'];

  /* this removes the definite article (all gender and number variations),
     removing it from the argument and putting it on the prefix */
  pt.argumentNormalizer = new RegExp("(^(o|a|os|as)\\s+)(.*)$", "i");
  pt.normalizeArgument = function(input) {
    let matches = input.match(this.argumentNormalizer);
    if (matches != null)
      return [{prefix:matches[1], newInput:matches[3], suffix:''}];
    return [];
  };

  return pt;
};
