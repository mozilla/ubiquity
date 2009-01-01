defineVerb(
  {name: "locked-down-display-message",
   preview: "Test command that prints a message.",
   execute: function execute() { displayMessage("Hi there."); }}
);

defineVerb(
  {name: "locked-down-evil",
   preview: "Command that tries to do something evil but fails.",
   execute: function execute() {
     let Cc = Components.classes;
     displayMessage("You should never see this.");
   }}
);

defineVerb(
  {name: "locked-down-xhr",
   preview: "Command that tries to make an XMLHTTPRequest but fails.",
   execute: function execute() {
     var req = new XMLHttpRequest();
     displayMessage("You should never see this.");
   }}
);

defineVerb(
  {name: "locked-down-embolden",
   preview: "Command that tries make the current selection boldfaced.",
   execute: function execute() {
     setSelection("<b>" + getSelection() + "</b>");
   }}
);
