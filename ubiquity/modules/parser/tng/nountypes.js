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

// set up noun type cache

var nounCache = {};

// set up noun type detectors

var nounTypes = [
  { _name: 'text',
    suggest: function(x) [ { text:x, html:x, score:0.7 } ] },
  { _name: 'contact',
    list: ['John','Mary','Bill'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  },
  { _name: 'city',
    list: ['San Francisco', 'San Diego', 'Tokyo', 'Boston'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  },
  { _name: 'time',
    suggest: function(x) {
    if (x.search(/^\d+ ?\w+$/i) >= 0) 
      return [ { text:x, html:x, score:1 } ];    
    else
      return [];
  } },
  { _name: 'number',
    suggest: function(x) {
    if (x.search(/^\d+$/) >= 0) 
      return [ { text:x, html:x, score:1 } ];    
    else
      return [];
  } },
  { _name: 'service',
    list: ['Google', 'Yahoo', 'calendar'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  },
  { _name: 'language',
    list: ['English','French','Japanese','Chinese'],
    suggest: function(x) { 
      let suggestions = [];
      x = x.toLowerCase();
      for each (let candidate in this.list) {
        if (x == candidate.toLowerCase()) {
          suggestions.push({ text:candidate, html:candidate, score:1 });
          continue;
        }
        if (candidate.toLowerCase().indexOf(x) > -1) {
          suggestions.push({ text:candidate, html:candidate, score:0.9 });
          continue;
        }
      }
      return suggestions;
    }
  }
];
