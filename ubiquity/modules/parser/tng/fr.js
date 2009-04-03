// set up our parsers

var fr = new Parser('fr');
fr.roles = [
  {role: 'goal', delimiter: 'à'},
  {role: 'goal', delimiter: 'a'},
  {role: 'goal', delimiter: 'à la'},
  {role: 'goal', delimiter: 'au'},
  {role: 'goal', delimiter: 'aux'},
  {role: 'source', delimiter: 'de'},
  {role: 'source', delimiter: 'des'},
  {role: 'time', delimiter: 'à'},
  {role: 'time', delimiter: 'a'},
  {role: 'instrument', delimiter: 'avec'},
  {role: 'instrument', delimiter: 'sur'}
];
fr.branching = 'right';
fr.examples = ['b les chaussettes avec google', 
'de Tokyo à San Francisco'];
fr.clitics = [
  {clitic: 'le', role: 'object'},
  {clitic: 'les', role: 'object'}
];