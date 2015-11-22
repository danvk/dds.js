/**
 * JavaScript wrapper for libdds, the bridge double dummy solver.
 *
 * To use:
 *
 *   <script>
 *   var Module = {};
 *   </script>
 *   <script src="out.js"></script>
 *   <script src="dds.js"></script>
 */
(function() {
var _solveBoard = Module.cwrap('solve',
                              'string',
                              ['string', 'string', 'number', 'number']);
var _calcDDTable = Module.cwrap('generateDDTable', 'string', ['string']);

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

  console.time('SolveBoard');
  var playsPtr = packPlays(plays);
  var o = JSON.parse(_solveBoard(board, trump, plays.length, playsPtr));
  console.timeEnd('SolveBoard');
  // ... free(playsPtr)
  nextPlays.cache[cacheKey] = o;
  // console.log(cacheKey, o);
  return o;
}
nextPlays.cache = {};

/**
 * board is a PBN-formatted string (e.g. 'N:AKQJ.T98.76.432 ...')
 * Returns an object mapping strain -> player -> makeable tricks, e.g.
 * {'N': {'N': 1, 'S': 2, 'E': 3, 'W': 4}, 'S': { ... }, ...}
 */
function calcDDTable(board) {
  var v = calcDDTable.cache[board];
  if (v) return v;
  console.time('CalcDDTable');
  v = JSON.parse(_calcDDTable(board));
  console.timeEnd('CalcDDTable');
  calcDDTable.cache[board] = v;
  return v;
}
calcDDTable.cache = {};

window.calcDDTable = calcDDTable;
window.nextPlays = nextPlays;

})();
