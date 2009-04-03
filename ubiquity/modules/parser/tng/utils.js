// power set function, from http://www.bushong.net/dave/comparisons/powerset.html
function p(l){if(!l.length)return[[]];var a=[];var s=p(l.slice(1));for(var i=0;i<s.length;i++)a.push(s[i],[l[0]].concat(s[i]));return a}

// cloneObject function, from http://bytes.com/topic/javascript/answers/715567-deep-cloning-object

function cloneObject(obj) {
  var c = obj instanceof Array ? [] : {};
  for (var i in obj) {
    var prop = obj[i];
    if (typeof prop == 'object') {
      if (prop instanceof Array) {
        c[i] = [];
        for (var j = 0; j < prop.length; j++) {
          if (typeof prop[j] != 'object') {
            c[i].push(prop[j]);
          } else {
            c[i].push(cloneObject(prop[j]));
          }
        }
      } else {
        c[i] = cloneObject(prop);
      }
    } else {
       c[i] = prop;
    }
  }
  return c;
}

// TODO: order by descending order of length of prefixes
function matchString(arr) {
  // construct a regexp to match the 
  var prefixes = [];
  for each (var a in arr) {
    for (var i=1;i<=a.length;i++) {
      prefixes.push(a.slice(0,i));
    }
  }
  return prefixes.reverse().join('|');
}

function allNames(verbs) {
  for each (verb in verbs) {
    for each (name in (verb.names[mylang.lang] || verb.names.en)) {
      yield name;
    }
  }
}

function names(verb) {
  for each (name in (verb.names[mylang.lang] || verb.names.en)) {
    yield name;
  }
}

function compareByScoreDesc(a,b) {
    return b.score - a.score;
}
