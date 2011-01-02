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
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

feed.title  = _("Built-in Commands");
feed.author = _("Ubiquity Team");

// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

const Help = "about:ubiquity";
const Editor = "about:ubiquity?editor";
const CmdList = "about:ubiquity?cmdlist";
const Support = "about:ubiquity?support";
const Settings = "about:ubiquity?settings";
const BugReport = (
  "http://getsatisfaction.com/mozilla/products/mozilla_ubiquity");

const {prefs} = Utils;

Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/cmdhistory.js");

XML.prettyPrinting = XML.ignoreWhitespace = false;

CmdUtils.CreateCommand({
  names: ["help", "about", "?"],
  icon: "chrome://ubiquity/skin/icons/help.png",
  description: String(
    <>Takes you to the Ubiquity <a href={Help}>main help page</a>.<br/>
      Or, enter the name of a command to get help on that command.</>),
  argument: noun_type_command,
  preview: function help_preview(pblock, {object: {data}}) {
    (data || this).previewDefault(pblock);
  },
  execute: function help_execute({object: {data}}) {
    if (data)
      Utils.openUrlInBrowser(CmdList + "#" + data.id);
    else
      Utils.focusUrlInBrowser(Help);
  },
});

CmdUtils.CreateCommand({
  names: ["open", "show"],
  argument: CmdUtils.mixNouns(
    "?",
    CmdUtils.NounType("ubiquity pages", {
      "Help": Help,
      "Settings": Settings,
      "Command List": CmdList,
      "Command Editor": Editor,
      "Support": Support,
      "Bug Report": BugReport,
    }),
    noun_type_awesomebar),
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: String(
    <>Opens one of the Ubiquity documentation/settings pages.</>),
  preview: function open_preview(pb, {object: {text, data}}) {
    if (!data) return void this.previewDefault(pb);

    pb.innerHTML = (
      typeof data === "string"
      ? _("Opens the Ubiquity ${goal} page.", {goal: text.link(data)})
      : (<div id="open"><img src={data.favicon}
         /> {data.title}<p><code>{data.url}</code></p></div>));
  },
  execute: function open_execute({object: {data}}) {
    Utils.openUrlInBrowser(data ? data.url || data : Settings);
  },
});

CmdUtils.CreateCommand({
  names: ["write Ubiquity commands",
          "edit Ubiquity commands",
          "hack Ubiquity",
          "Command Editor"],
  icon: "chrome://ubiquity/skin/icons/plugin_edit.png",
  description: String(
    <>Takes you to the Ubiquity <a href={Editor}>command editor</a> page.</>),
  execute: Editor,
});

CmdUtils.CreateCommand({
  names: ["list Ubiquity commands", "Command List"],
  icon: "chrome://ubiquity/skin/icons/application_view_list.png",
  description: String(
    <>Opens <a href={CmdList}>the list</a>
      of all Ubiquity commands available and what they all do.</>),
  execute: CmdList,
});

CmdUtils.CreateCommand({
  names: ["change Ubiquity settings",
          "change Ubiquity preferences"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: String(
    <>Takes you to the <a href={Settings}>settings</a> page,
    where you can change your skin, key combinations, etc.</>),
  execute: Settings,
});

CmdUtils.CreateCommand({
  names: ["get support"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: String(
    <>Takes you to the <a href={Support}>support</a> page,
    where you can report bugs, get troubleshooting help, etc.</>),
  execute: Support,
});

CmdUtils.CreateCommand({
  names: ["report bug"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: String(
    <>Takes you to the <a href={BugReport}>bug report</a> page.</>),
  execute: BugReport,
});

CmdUtils.CreateCommand({
  names: ["change skin"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "Changes your Ubiquity skin.",
  argument: noun_type_skin,
  execute: function chskin_execute({object: {data: skin}}) {
    if (skin) {
      skin.pick();
      Utils.tabs.reload(/^about:ubiquity\?settings\b/);
    }
    else Utils.focusUrlInBrowser(Settings);
  },
  preview: function chskin_preview(pb, {object: {html}}) {
    pb.innerHTML = (
      html
      ? _("Changes to ${name}.", {name: html.bold()})
      : this.previewDefault());
  },
});

(function ToggleCommand(names, desc, nt, disabled, tmpl) {
  CmdUtils.CreateCommand({
    names: names,
    icon: "chrome://ubiquity/skin/icons/favicon.ico",
    description: desc,
    argument: nt,
    execute: function xable_cmd_execute({object: {text, data: cmd}}) {
      if (cmd) {
        cmd.disabled = disabled;
        displayMessage(text, this);
      }
    },
    preview: function xable_cmd_preview(pb, {object: {html, data: cmd}}) {
      pb.innerHTML = (
        cmd
        ? (CmdUtils.renderTemplate(tmpl, {name: "<b>" + html + "</b>"}) +
           "<hr/>" + cmd.previewDefault())
        : this.description);
    }
  });
  return ToggleCommand;
})
(["disable command"],
 ("Disables a Ubiquity command, so that it will no longer " +
  "show up in the suggestion list."),
 noun_type_enabled_command,
 true,
 _("Disables ${name}."))
(["enable command"],
 "Re-enables a Ubiquity command that you disabled.",
 noun_type_disabled_command,
 false,
 _("Enables ${name}."));

CmdUtils.CreateCommand({
  names: ["command history", "vita"],
  arguments: {"object filter": noun_arb_text},
  description: "Accesses your command history.",
  help: String(
    <ul style="list-style-image:none">
    <li>Use accesskey or click to reuse.</li>
    <li>Type to filter.</li>
    <li>Execute to delete all matched histories.</li>
    <li>Edit <a href="about:config"><code>{CommandHistory.PREF_MAX}</code></a
      > to set max number of histories.</li></ul>),
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  execute: function cmdh_execute({object: {text}}) {
    var bin = CommandHistory.get();
    if (!bin.length) return;
    if (text) {
      var rem = this._filter(bin, text, true);
      if (rem.length === bin.length) return;
      CommandHistory.set(rem);
      this._say(_("Deleted matched histories. Click here to undo."),
                function cmdh__undo() { CommandHistory.set(bin) });
    }
    else this._say(_('Type "^" to delete all.'));
  },
  preview: function cmdh_preview(pb, args) {
    var his = this._filter(CommandHistory.get(), args.object.text);
    if (!his.length) {
      pb.innerHTML = "<em>" + _("No histories match.") + "</em>" + this.help;
      return;
    }
    CmdUtils.previewList(
      pb,
      ["" + <span> <code>{h}</code> </span> for each (h in his)],
      function cmdh__reuse(i) {
        context.chromeWindow.gUbiquity.preview(his[i]);
      });
  },
  _say: function cmdh__say(txt, cb) {
    displayMessage({text: txt, onclick: cb}, this);
  },
  _filter: function cmdh__filter(his, txt, rev) {
    if (txt) {
      var re = Utils.regexp(txt, "i");
      his = [h for each (h in his) if (rev ^ re.test(h))];
    }
    return his;
  },
});

function startup_openUbiquityWelcomePage() {
  if (UbiquitySetup.isNewlyInstalledOrUpgraded)
    Utils.focusUrlInBrowser(Help);
}
