// set up our parsers
var EXPORTED_SYMBOLS = ["makePtParser"];

Components.utils.import("resource://ubiquity/modules/parser/tng/parser.js");

function makePtParser() {
  var pt = new Parser('pt');
  pt.roles = [
    {role: 'goal', delimiter: 'à'},
    {role: 'goal', delimiter: 'ao'},
    {role: 'goal', delimiter: 'a'},
    {role: 'goal', delimiter: 'até'},
    {role: 'goal', delimiter: 'em'},
    {role: 'goal', delimiter: 'no'},
    {role: 'goal', delimiter: 'na'},
    {role: 'goal', delimiter: 'pra'},
    {role: 'goal', delimiter: 'para'},

    {role: 'source', delimiter: 'de'},
    {role: 'source', delimiter: 'des'},
    {role: 'source', delimiter: 'do'},
    {role: 'source', delimiter: 'da'},

    {role: 'time', delimiter: 'às'},
    {role: 'time', delimiter: 'de'},
    {role: 'time', delimiter: 'a'},
    {role: 'time', delimiter: 'as'},

    {role: 'instrument', delimiter: 'com'},
    {role: 'instrument', delimiter: 'usando'},
    {role: 'instrument', delimiter: 'pela'},
    {role: 'instrument', delimiter: 'pelo'},
    {role: 'instrument', delimiter: 'na'},
    {role: 'instrument', delimiter: 'no'}
  ];

  pt.branching = 'right';

  pt.anaphora = ['isto', 'isso', 'aquilo'];

  pt.examples = ['marcar reunião às 2pm ao calendar',
    'comprar meias pelo Google',
    'traduza Olá Mundo de English pra French',
    'ir de San Franscisco à Tokyo',
    'diga Redescubra a web',
    'diga isto'];

  return pt;
};
