// set up fake verbs

var verbs = {
  add: {
    names: { 
      da: ['tilføj', 'indsæt'],
      en: ['add'],
      ja: ['追加する','追加しろ','追加して','ついかする','ついかしろ','ついかして'],
      pt: ['adicionar', 'incluir', 'marcar']
    },
    arguments: [
      {role: 'object', nountype: 'arb'},
      {role: 'time', nountype: 'time'},
      {role: 'goal', nountype: 'service'}
    ]
  },
  buy: {
    names: {
      da: ['køb'],
      en: ['buy','purchase'],
      ja: ['買う','買え','買って','かう','かえ','かって'],
      pt: ['comprar', 'compre']
    },
    arguments: [
      {role: 'object', nountype: 'arb'},
      {role: 'source', nountype: 'service'},
      {role: 'instrument', nountype: 'service'}
    ]
  },
  say: {
    names: {
      da: ['sig'],
      en: ['say'],
      ja: ['言う','言え','言って','いう','いえ','いって'],
      pt: ['dizer', 'diga']
    },
    arguments: [
      {role: 'object', nountype: 'arb'}
    ]
  },
  move: {
    names: {
      da: ['flyt'],
      en: ['move'],
      ja: ['動かす','動かせ','動かして','うごかす','うごかせ','うごかして','移す','移せ','移して','うつす','うつせ','うつして'],
      pt: ['ir', 'vá', 'vai']
    },
    arguments: [
      {role: 'object', nountype: 'arb'},
      {role: 'source', nountype: 'city'},
      {role: 'goal', nountype: 'city'}
    ]
  },
  translate: {
    names: {
      da: ['oversæt'],
      en: ['translate'],
      ja: ['訳す','訳せ','訳して','やくす','やくせ','やくして'],
      pt: ['traduzir', 'traduza']
    },
    arguments: [
      {role: 'source', nountype: 'language'},
      {role: 'goal', nountype: 'language'},
      {role: 'object', nountype: 'arb'}
    ]
  }
};
