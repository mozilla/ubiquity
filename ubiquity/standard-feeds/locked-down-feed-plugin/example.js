CmdUtils.CreateCommand(
  {names: ["locked down display message"],
   preview: "Prints a message.",
   execute: function execute() { displayMessage("Hi there."); }}
);

CmdUtils.CreateCommand(
  {names: ["locked down echo"],
   help: "Echoes your input",
   arguments: [{nountype: /.*/, role: 'object'},
               {nountype: /.*/, role: 'goal'}],
   execute: function execute(args) {
     displayMessage(args.object.text + " to " + args.goal.text);
   }}
);

CmdUtils.CreateCommand(
  {names: ["locked down evil components"],
   preview: "Tries to access <tt>Components.classes</tt> but fails.",
   execute: function execute() {
     var Cc = Components.classes;
     displayMessage("You should never see this.");
   }}
);

CmdUtils.CreateCommand(
  {names: ["locked down evil xhr"],
   preview: "Tries to make an <tt>XMLHTTPRequest</tt> but fails.",
   execute: function execute() {
     var req = new XMLHttpRequest();
     displayMessage("You should never see this.");
   }}
);

CmdUtils.CreateCommand(
  {names: ["locked down evil xss"],
   preview: ("Tries to make a cross-site scripting attack " +
             "but fails. Select some text on a webpage and try " +
             "it out."),
   execute: function execute() {
     CmdUtils.setSelection(
       ('<div onclick="alert(\'You should never see this.\')">' +
        '<b>Click me and nothing should happen.</b></div>')
     );
   }}
);

CmdUtils.CreateCommand(
  {names: ["locked down embolden"],
   preview: "Tries to make the current selection boldfaced.",
   execute: function execute() {
     CmdUtils.setSelection("<b>" + CmdUtils.getSelection() + "</b>");
   }}
);
