
CmdUtils.CreateCommand({
  names: ["germanize"],
  icon: "resource://ubiquity/chrome/skin/icons/german_flag.png",
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

CmdUtils.CreateAlias({
  names: ["anglicize"],
  verb: "translate",
  givenArgs: { goal: "English" },
  icon: "resource://ubiquity/chrome/skin/icons/union_jack.ico"
});
