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
 *   Atul Varma <atul@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
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

var EXPORTED_SYMBOLS = ["finishCommand"];

// Default delay to wait before calling a preview function, in ms.
const DEFAULT_PREVIEW_DELAY = 150;

function finishCommand(srcCommand) {
  var cmd = {};

  // what are these for? -satyr
  /*
  var propsToInherit = [
    "DOLabel",
    "DOType",
    "DODefault",
    "author",
    "homepage",
    "contributors",
    "license",
    "description",
    "help",
    "synonyms"
  ];

  propsToInherit.forEach(
    function CS_copyProp(prop) {
      if (!srcCommand[prop])
        cmd[prop] = null;
    });
   */

  if (srcCommand.previewDelay == null)
    cmd.previewDelay = DEFAULT_PREVIEW_DELAY;

  if (!srcCommand.modifiers)
    cmd.modifiers = {};

  if (!srcCommand.modifierDefaults)
    cmd.modifierDefaults = {};

  // if it doesn't take any arguments
  if (!srcCommand.DOType && !srcCommand.modifiers) {
    // enable use in parser 2
    cmd.names = {en: [srcCommand.name]};
    cmd.arguments = [];
  }

  cmd.__proto__ = srcCommand;

  return cmd;
}
