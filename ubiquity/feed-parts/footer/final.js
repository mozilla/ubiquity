(function finalize(me) {
  var {hasRunOnce} = globals;
  for (let name in new Iterator(me, true)) {
    let _index = name.indexOf("_", 3);
    if (_index < 0) continue;

    let func = me[name];
    if (typeof func !== "function") continue;

    switch (name.slice(0, _index)) {
      case "cmd": CmdUtils.CreateCommand({
        __proto__: func,
        name: func.name.slice(_index + 1).replace("_", " ", "g"),
        execute: func,
      }); continue;
      case "startup": hasRunOnce || func(); continue;
      case "pageLoad": pageLoadFuncs.push(func); continue;
      case "ubiquityLoad": ubiquityLoadFuncs.push(func); continue;
    }
  }
  globals.hasRunOnce = true;
})(this);
