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
 *   Aza Raskin <aza@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyu@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <blair@theunfocused.net>
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

// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

const Help = "about:ubiquity";
const Editor = "chrome://ubiquity/content/editor.html";
const CmdList = "chrome://ubiquity/content/cmdlist.html";
const Settings = "chrome://ubiquity/content/settings.html";
const BugReport = "chrome://ubiquity/content/report-bug.html";

XML.prettyPrinting = XML.ignoreWhitespace = false;

CmdUtils.CreateCommand({
  names: ["help", "about", "?"],
  icon: "chrome://ubiquity/skin/icons/help.png",
  description: "" + (
    <>Takes you to the Ubiquity <a href={Help}>main help page</a>.<br/>
      Or, enter the name of a command to get help on that command.</>),
  arguments: noun_type_command,
  preview: function(pblock, {object}) {
    pblock.innerHTML = object.html || this.description;
  },
  execute: function({object: {text}}) {
    if (text)
      Utils.openUrlInBrowser(CmdList + "##" + text);
    else
      Utils.focusUrlInBrowser(Help);
  }
});

CmdUtils.CreateCommand({
  name: "command-editor",
  icon: "chrome://ubiquity/skin/icons/plugin_edit.png",
  description: "" + (
    <>Takes you to the Ubiquity <a href={Editor}>command editor</a> page.</>),
  execute: Editor,
});

CmdUtils.CreateCommand({
  name: "command-list",
  icon: "chrome://ubiquity/skin/icons/application_view_list.png",
  description: "" + (
    <>Opens <a href={CmdList}>the list</a>
      of all Ubiquity commands available and what they all do.</>),
  execute: CmdList,
});

CmdUtils.CreateCommand({
  names: ["settings", "skin-list"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
    <>Takes you to the <a href={Settings}>Settings</a> page,
      where you can change your skin, key combinations, etc.</>),
  execute: Settings,
});

CmdUtils.CreateCommand({
  name: "report-bug",
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
    <>Takes you to the <a href={BugReport}>Bug Report</a> page.</>),
  execute: BugReport,
});

var ubiquityLoad_commandHistory = (function() {{}
const
Name = "command-history",
PHistory = "extensions.ubiquity.history.",
PBin = PHistory + "bin",
PMax = PHistory + "max",
DefaultMax = 42,
Sep = "\n",
{prefs} = Application;
CmdUtils.CreateCommand({
  names: [Name, "vita"],
  arguments: {object: noun_arb_text},
  description: "Accesses your command history.",
  help: "" + (
    <ul style="list-style-image:none">
    <li>Use accesskey or click to reclaim.</li>
    <li>Type to filter.</li>
    <li>Execute to delete all matched histories.</li>
    <li>Edit <a href="about:config"><code>{PMax}</code></a> to
      set max number of histories.</li></ul>),
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  execute: function(args) {
    var bin = Utils.trim(prefs.getValue(PBin, ""));
    if (!bin) return;
    if (text) {
      var rem = this._get(args.object.text, true).join(Sep);
      if (rem.length === bin.length) return;
      prefs.setValue(PBin, rem);
      this._say("Deleted matched histories. Click here to undo.",
                function() { prefs.setValue(PBin, bin) });
    } else
      this._say('Type "^" to delete all.');
  },
  preview: function(pbl, args) {
    var his = this._get(args.object.text);
    if (!his[0]) {
      pbl.innerHTML = "<i>No histories match.</i>" + this.help;
      return;
    }
    pbl.innerHTML = this._css + his.reduce(this._lay, <ol class={Name}/>);
    jQuery("ol", pbl)[0].addEventListener("focus", this._recall, true);
  },
  _lay: function(ol, h, i) {
    var k = i < 35 ? (i+1).toString(36) : "0-^@;:[],./\\"[i - 35] || "_";
    return ol.appendChild(
      <li><nobr><label for={i}>
        <button id={i} accesskey={k} value={h}>{k}</button>
        <code>{h}</code>
      </label></nobr></li>);
  },
  _say: function(txt, cb) {
    displayMessage({
      icon: this.icon, title: Name, text: txt, onclick: cb});
  },
  _get: function(txt, rev) {
    var bin = Utils.trim(prefs.getValue(PBin, ""));
    if (!bin) return [];
    var his = bin.split(Sep);
    if (txt) {
      try { var re = RegExp(txt, "i") }
      catch(e){ re = RegExp(txt.replace(/\W/g, "\\$&"), "i") }
      his = his.filter(function(h) h && rev ^ re.test(h));
    }
    return his;
  },
  _recall: function reclaim(ev) {
    var {target} = ev;
    if (target.nodeName !== "BUTTON") return;
    target.blur();
    target.disabled = true;
    var {gUbiquity} = context.chromeWindow;
    gUbiquity.__textBox.value = target.value;
    gUbiquity.__delayedProcessInput();
  },
  _css: <style><![CDATA[
    ol {margin: 0; padding: 2px}
    li {list-style-type: none}
    label:hover {cursor: pointer; font-weight: bold}
    button {
      padding: 0; border-width: 1px;
      font: bold 108% "Consolas",monospace; text-transform: uppercase;
    }
    ]]></style>,
});
return function UL_commandHistory(U) {
  U.__msgPanel.addEventListener("popuphidden", function saveEntry() {
    var ent = Utils.trim(U.__textBox.value);
    if (!ent) return;
    var his = prefs.getValue(PBin, "").split(Sep), idx = his.indexOf(ent);
    if (~idx) his.unshift(his.splice(idx, 1));
    else {
      var max = prefs.getValue(PMax, DefaultMax);
      if (his.unshift(ent) > max) his.length = max;
    }
    prefs.setValue(PBin, his.join(Sep));
  }, false);
};
})();

function startup_openUbiquityWelcomePage() {
  if (Components.utils.import("resource://ubiquity/modules/setup.js", null)
      .UbiquitySetup.isNewlyInstalledOrUpgraded)
    Utils.focusUrlInBrowser(Help);
}

function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}
