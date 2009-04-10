
NLParser2.parserFactories.ja = function() {
  var ja = new NLParser2.Parser('ja');
  ja.anaphora = ["これ", "それ", "あれ"];
  ja.roles = [
    {role: 'object', delimiter: 'を'},
    {role: 'goal', delimiter: 'に'},
    {role: 'source', delimiter: 'から'},
    {role: 'time', delimiter: 'に'},
    {role: 'instrument', delimiter: 'で'},
    //{role: 'instrument', delimiter: 'に'},

    // 「の」は何でもOK
    {role: 'goal', delimiter: 'の'},
    {role: 'source', delimiter: 'の'},
    {role: 'time', delimiter: 'の'},
    {role: 'object', delimiter: 'の'}
  ];
  ja.branching = 'left';
  ja.wordBreaker = function(input) {
    return input.replace(eval('/('+[role.delimiter for each (role in ja.roles)].join('|')+')/g'),' $1 ');
  };
  ja.usespaces = false;
  ja.joindelimiter = '';
  ja.examples = ['くつしたをgooでかって',
  '1pmの会議をcalに追加',
  'tokからbostonに'];

  return ja;
};