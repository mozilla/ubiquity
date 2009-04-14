var EXPORTED_SYMBOLS = ["cloneObject"];

// cloneObject function, from http://bytes.com/topic/javascript/answers/715567-deep-cloning-object

var cloneObject = function (obj) {
  if (obj == null)
    return null;
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
