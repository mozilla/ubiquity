/*CmdUtils.CreateAlias({
  names: ["anglicize"],
  verb: "translate",
  arguments: { goal: { input: "English" } },
  icon: "resource://ubiquity/chrome/skin/icons/union_jack.ico"
});*/

CmdUtils.CreateCommand({
  names: ["germanize"],
  arguments: [{role: "object", nountype: noun_arb_text},
              {role: "source", nountype: noun_type_lang_google}],
  preview: function germanize_preview(pblock, args) {
    args.goal = { input: "German", summary: "German", data: "de" };
    CmdUtils.previewCommand(pblock, 'translate', args);
  },
  execute: function germanize_execute(args) {
    args.goal = { input: "German", summary: "German", data: "de" };
    CmdUtils.executeCommand('translate', args);
  }
});