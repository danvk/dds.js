var solve;
var Module = {};
var ddsReady = new Promise(function(resolve, reject) {
  Module['onRuntimeInitialized'] = function() {
    resolve(solve);
  };

  var memoryInitializer = 'out.js.mem';
  var xhr = Module['memoryInitializerRequest'] = new XMLHttpRequest();
  xhr.open('GET', memoryInitializer, true);
  xhr.responseType = 'arraybuffer';
  xhr.send(null);
  var script = document.createElement('script');
  script.src = "out.js";
  document.body.appendChild(script);
});

ddsReady = ddsReady.then(function() {
  solve = Module.cwrap('solve',
                       'string',
                       ['string', 'string', 'number', 'number']);
});

var SUITS = {'S': 0, 'H': 1, 'D': 2, 'C': 3};
var RANKS = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
             '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11,
             'Q': 12, 'K': 13, 'A': 14};
function packPlays(plays) {
  var buf = Module._malloc(8 * plays.length);
  for (var i = 0; i < plays.length; i++) {
    var p = plays[i];
    if (p.length != 2) {
      throw 'Invalid play: ' + p;
    }
    var suit = SUITS[p[1]],
        rank = RANKS[p[0]];
    Module.setValue(buf + i * 8, suit, 'i32');
    Module.setValue(buf + i * 8 + 4, rank, 'i32');
  }
  return buf;
}

/**
 * board is a PBN-formatted string (e.g. 'N:AKQJ.T98.76.432 ...')
 *       The first character indicates who leads this trick.
 * trump is 'S', 'H', 'C', 'D' or 'N'
 * plays is an array of 2-character cards, e.g. ['5D', '2D, 'QD']
 */
function nextPlays(board, trump, plays) {
  var cacheKey = JSON.stringify({board,trump,plays});
  var cacheValue = nextPlays.cache[cacheKey];
  if (cacheValue) return cacheValue;

  var playsPtr = packPlays(plays);
  var o = JSON.parse(solve(board, trump, plays.length, playsPtr));
  // ... free(playsPtr)
  nextPlays.cache[cacheKey] = o;
  // console.log(cacheKey, cacheValue);
  return o;
}
nextPlays.cache = {};
