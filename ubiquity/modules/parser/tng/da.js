// set up our parsers
var EXPORTED_SYMBOLS = ["makeDaParser"];

Components.utils.import("resource://ubiquity/modules/parser/tng/parser.js");

function makeDaParser() {
  var da = new Parser('da');
  da.roles = [
    {role: 'goal', delimiter: 'til'},
    {role: 'source', delimiter: 'fra'},
    {role: 'time', delimiter: 'klokken'},
    {role: 'time', delimiter: 'på'},
    {role: 'time', delimiter: 'den'},
    {role: 'instrument', delimiter: 'med'},
    {role: 'instrument', delimiter: 'gennem'}
  ];
  da.branching = 'right';
  da.examples = ['k socks med google tilføj',
  'tilføj meeting til calendar klokken 1 pm',
  'fra Tokyo til San Francisco'];

  return da;
};
