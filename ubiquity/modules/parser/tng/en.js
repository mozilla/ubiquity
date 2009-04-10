// set up our parsers
var EXPORTED_SYMBOLS = ["makeEnParser"];

Components.utils.import("resource://ubiquity/modules/parser/tng/parser.js");

function makeEnParser() {
  var en = new Parser('en');
  en.anaphora = ["this", "that", "it", "selection", "him", "her", "them"];
  en.roles = [
    {role: 'goal', delimiter: 'to'},
    {role: 'source', delimiter: 'from'},
    {role: 'time', delimiter: 'at'},
    {role: 'time', delimiter: 'on'},
    {role: 'instrument', delimiter: 'using'},
    {role: 'instrument', delimiter: 'with'}
  ];
  en.branching = 'right';
  en.examples = ['b socks using google add',
  'add meeting to calendar at 1 pm',
  'from Tokyo to San Francisco', 'purchase this from google'];

  return en;
};
