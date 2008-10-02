# Script to automatically insert the tri-license header in all
# applicable source code files, generating the list of contributors
# by chronologically examining the file changelog.

import os
import sys

import mercurial
import mercurial.ui
import mercurial.localrepo

LICENSE_PRE = """\
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
"""

LICENSE_POST = """
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

"""

LICENSE_TEMPLATE = " *   %s"

WILDCARD_ALIASES = {
    'jonathandicarlo' : 'Jono DiCarlo <jdicarlo@mozilla.com>',
    'aza' : 'Aza Raskin <aza@mozilla.com>',
    'varmaa' : 'Atul Varma <atul@mozilla.com>',
    'avarma' : 'Atul Varma <atul@mozilla.com>',
    }

ALIASES = {
    'Atul Varma <varmaa@toolness.com>' : 'Atul Varma <atul@mozilla.com>',
    'Aza Raskin <azaaza@gmail.com>' : 'Aza Raskin <aza@mozilla.com>'
    }

FILE_EXCEPTIONS = ["jquery.js",
                   "date.js",
                   "sample-cmd.js",
                   "preferences.js"]

def get_contributors(repo, file):
    fctx = repo.filectx(file, "tip")
    end = fctx.filerev()
    users = []
    names = {}
    for i in range(0, end+1):
        user = fctx.filectx(i).user()
        username = user.split('@')[0]
        if username in WILDCARD_ALIASES:
            user = WILDCARD_ALIASES[username]
        elif user in ALIASES:
            user = ALIASES[user]
        name = user.split(' <')[0]
        if name not in names:
            names[name] = True
            users.append(user)
    return users

if __name__ == '__main__':
    ui = mercurial.ui.ui()
    repo = mercurial.localrepo.localrepository(ui, os.getcwd())

    for dirpath, dirnames, filenames in os.walk('.'):
        filenames = [filename for filename in filenames
                     if filename not in FILE_EXCEPTIONS]
        for filename in filenames:
            if os.path.splitext(filename)[1] == '.js':
                fullpath = os.path.join(dirpath, filename)
                contents = open(fullpath, "r").read()
                if not contents.startswith(LICENSE_PRE):
                    hgpath = fullpath[2:]
                    print "Setting license for %s." % hgpath
                    lines = []
                    for user in get_contributors(repo, hgpath):
                        lines.append(LICENSE_TEMPLATE % user)
                    lines = "\n".join(lines)
                    new_contents = "".join([LICENSE_PRE,
                                            lines,
                                            LICENSE_POST,
                                            contents])
                    open(fullpath, "w").write(new_contents)
