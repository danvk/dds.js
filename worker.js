var Module = {};
importScripts('out.js', 'dds.js');

onmessage = function(e) {
  var data = e.data;
  switch (data.action) {
    case 'nextPlays':
      result = nextPlays.apply(null, data.params);
      postMessage({
        id: data.id,
        action: data.action,
        params: data.params,
        result: result
      });
      break;

    case 'calcDDTable':
      result = calcDDTable.apply(null, data.params);
      postMessage({
        id: data.id,
        action: data.action,
        params: data.params,
        result: result
      });
      break;

    default:
      throw 'Unknown action: ' + data.action;
  }
};
