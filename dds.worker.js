;(function() {

var id = 1;
callbacks = {};

var worker = new Worker("worker.js");
worker.onmessage = function(e) {
  console.log('Worker responded', e);
  var id = e.data.id;
  if (!id) {
    console.error('Message without id:', e);
    throw 'Received message without id!';
  }
  if (!callbacks[id]) {
    throw 'Message id without callback: ' + id;
  }
  callbacks[id](e);
  delete callbacks[id];
};

function makeCallback(resolve, reject) {
  return function(e) {
    if (e.data) {
      resolve(e.data.result);
    } else {
      reject({action: action, params: params, message: e});
    }
  };
}

function nextPlays(board, trump, plays) {
  return new Promise(function(resolve, reject) {
    var newId = id++;
    callbacks[newId] = makeCallback(resolve, reject);
    worker.postMessage({
      action: 'nextPlays',
      params: [board, trump, plays],
      id: newId
    });
  });
}

// Ideally this would fire a callback many times as new results become available.
function calcDDTable(board) {
  return new Promise(function(resolve, reject) {
    var newId = id++;
    callbacks[newId] = makeCallback(resolve, reject);
    worker.postMessage({
      action: 'calcDDTable',
      params: [board],
      id: newId
    });
  });
}

window.dds = {
  nextPlays: nextPlays,
  calcDDTable: calcDDTable
};

})();
