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
 *   Lech Deregowski <unattended@gmail.com>
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

/* ********** USAGE **************
 *
 * When included, this file just makes our string vars in the locale-specific
 * ubiquity.properties file globally visible for all other scripts called
 * within about:Ubiquity pages.
 *
 * Existing strings in .js files should be replaced with something like
 * the following:
 *
 * _ubundle.GetStringFromName("ubiquity.grouping.uniquestringname")
 * While original strings get moved to the appropriate .properties file.
 *
 * Currently we're only using one .properties file which is enough for us
 * within the about pages.
 *
 * ********** Suggestion *********
 *
 * I don't doubt something like this is necessary elsewhere, so might be
 * useful to create a similar core file and link to it from your scripts
 * when needed to import your strings. It's cleaner in the long-run, this
 * way we don't have dozens of these vars in all file headers everywhere.
 *
 * *******************************/

var ubiquitylocalBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
var _ubundle = ubiquitylocalBundle.createBundle("chrome://ubiquity/locale/aboutubiquity.properties");
var _utbundle = ubiquitylocalBundle.createBundle("chrome://ubiquity/locale/aboutubiquitytutorial.properties");