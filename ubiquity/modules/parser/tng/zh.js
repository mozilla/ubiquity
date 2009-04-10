// set up our parsers

NLParser2.parserFactories.zh = function() {

  var zh = new NLParser2.Parser('zh');
  zh.roles = [
    {role: 'goal', delimiter: '到'},
    {role: 'source', delimiter: '从'},
    //  {role: 'time', delimiter: 'at'},
    //  {role: 'time', delimiter: ''},
    {role: 'instrument', delimiter: '用'}
    ];
  zh.branching = 'right';
  zh.wordBreaker = function(input) {
  return input.replace(eval('/('+[role.delimiter for each (role in zh.roles)].join('|')+')/g'),' $1 ');
  };
  zh.usespaces = false;
  zh.joindelimiter = '';
  return zh;

};