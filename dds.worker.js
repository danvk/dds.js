;(function() {

var id = 1;
callbacks = {};

var worker = new Worker("worker.js");
worker.onmessage = function(e) {
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

var NEXT_PLAYER = {
  'N': 'E',
  'E': 'S',
  'S': 'W',
  'W': 'N'
};
// Given a PBN string, return a player -> string holding mapping, e.g.
// {N: 'AKQJ.984...', ...}
function parsePBNStrings(pbn) {
  var parts = pbn.split(' ');
  if (parts.length != 4) {
    throw 'PBN must have four hands (got ' + parts.length + ')';
  }

  var m = parts[0].match(/^([NSEW]):/);
  if (!m) {
    throw 'PBN must start with either "N:", "S:", "E:" or "W:"';
  }
  parts[0] = parts[0].slice(2);
  var player = m[1];
  var hands = {};
  parts.forEach(function(txt, i) {
    hands[player] = txt;
    player = NEXT_PLAYER[player];
  });
  return hands;
}


// Rotate the PBN string so that firstPlayer is first.
function rotatePBN(pbn, firstPlayer) {
  if (firstPlayer.length != 1 || 'NSEW'.indexOf(firstPlayer) == -1) {
    throw 'Invalid player: ' + firstPlayer;
  }
  var textHands = parsePBNStrings(pbn);
  var player = firstPlayer;
  var hands = [];
  do {
    hands.push(textHands[player]);
    player = NEXT_PLAYER[player];
  } while (player != firstPlayer);
  return firstPlayer + ':' + hands.join(' ');
}

function calcDDTableProgressive(board, callback) {
  // TODO: calculate the most interesting contracts first, e.g. start with the
  // declarer who has the most HCP.
  var strains = ['N', 'H', 'S', 'D', 'C'],
      declarers = ['N', 'W', 'S', 'E'];
  strains.forEach(function (strain) {
    declarers.forEach(function (declarer) {
      var thisPbn = rotatePBN(pbn, declarer);
      nextPlays(thisPbn, strain, []).then(function(result) {
        var score = Math.min.apply(null, result.plays.map(function(p) { return p.score; }));
        callback(declarer, strain, score);
      });
    });
  });
}

window.dds = {
  nextPlays: nextPlays,
  calcDDTable: calcDDTable,
  calcDDTableProgressive: calcDDTableProgressive
};

})();
