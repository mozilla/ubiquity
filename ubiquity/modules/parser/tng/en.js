// set up our parsers

NLParser2.parserFactories.en = function() {
  var en = new NLParser2.Parser('en');
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
