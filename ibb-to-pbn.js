/**
 * Load the image at `path` (relative to the current page).
 * This returns a Promise for an HTMLImageElement.
 */
function loadImage(path) {
  return new Promise((resolve, reject) => {
    var img = document.createElement('img');
    img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c);
    };
    img.src = path;
  });
};

/**
 * Takes a canvas and a key -> [x1, y1, x2, y2] mapping.
 * Returns a key -> canvas mapping with the sliced images.
 * Slices are inclusive on both ends, e.g. x1=1 x2=2 will produce a 2px wide
 *   slice.
 */
function sliceImage(canvas, boxes) {
  return _.mapObject(boxes, (box, key) => {
    var [x1, y1, x2, y2] = box;
    var sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = x2 - x1 + 1;
    sliceCanvas.height = y2 - y1 + 1;
    var ctx = sliceCanvas.getContext('2d');
    ctx.drawImage(canvas,
                  x1, y1, x2 - x1 + 1, y2 - y1 + 1,
                  0, 0, x2 - x1 + 1, y2 - y1 + 1);
    return sliceCanvas;
  });
};

/**
 * takes a canvas and returns a 1d array of whether pixels are foreground.
 * "foreground" is very specific to iBridgeBaron screenshots.
 */
function binarize(canvas) {
  var out = Array(canvas.width * canvas.height);
  var w = canvas.width,
      h = canvas.height,
      d = canvas.getContext('2d').getImageData(0, 0, w, h).data;

  for (var i = 0, n = 0; i < d.length; i+=4, n++) {
    var r = d[i + 0],
        g = d[i + 1],
        b = d[i + 2];

    // 0,0,0 = black
    // 232,236,196 = background
    // 229,0,28 = red
    var blackErr = (r + g + b) / 3,
        redErr = (Math.abs(r - 229) + g + Math.abs(b - 28)) / 3;

    // 231, 87, 84 = red  2 + 87 + 56  => 145/3 ~= 48
    // 229, 15, 34 = red  0 + 15 + 6  => 21/3 = 7
    // 236, 220, 187 = bad  7 + 220 + 159

    // 26, 26, 23 = black
    // 13, 13, 11 = black

    // 136, 134, 113 = bad

    out[n] = (blackErr < 30 || redErr < 50) ? 1 : 0;
  }

  // clear out a 4x4 area around each corner. If there's anything there, it's
  // likely to be an artifact.
  var zero = (x, y) => { out[w * y + x] = 0; };
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      zero(x, y);
      zero(w - 1 - x, y);
      zero(x, h - 1 - y);
      zero(w - 1 - x, h - 1 - y);
    }
  }

  return out;
}

/**
 * Returns a new binary array which is 1 where a and b differ.
 */
function binaryDiff(a, b) {
  if (a.length != b.length) {
    throw `Length mismatch: ${a.length} != ${b.length}`;
  }

  var d = Array(a.length);
  for (var i = 0; i < a.length; i++) {
    d[i] = a[i] != b[i] ? 1 : 0;
  }
  return d;
}

/**
 * Given a binary array (e.g. output of binarize()), return a B&W canvas.
 */
function binaryToCanvas(pixels, width) {
  if (!(width > 0)) {
    throw `Invalid width: ${width}`;
  }
  if (pixels.length % width != 0) {
    throw `Invalid width: ${width} does not divide ${pixels.length}`;
  }
  var canvas = document.createElement('canvas');
  var height = pixels.length / width;
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext('2d');
  var imageData = ctx.createImageData(width, height);
  var d = imageData.data;
  for (var i = 0, n = 0; i < pixels.length; i++, n += 4) {
    var v = pixels[i] ? 0 : 255;
    d[n] = d[n + 1] = d[n + 2] = v;
    d[n + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Shift a binary array representing an image by (dx, dy).
 * Returns a new array, leaving the original untouched.
 */
function binaryShift(pixels, width, dx, dy) {
  if (!(width > 0)) {
    throw `Invalid width: ${width}`;
  }
  if (pixels.length % width != 0) {
    throw `Invalid width: ${width} does not divide ${pixels.length}`;
  }
  var height = pixels.length / width;
  var out = Array(pixels.length);
  for (var i = 0; i < out.length; i++) out[i] = 0;

  for (var y = 0; y < height; y++) {
    var ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (var x = 0; x < width; x++) {
      var nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      out[ny * width + nx] = pixels[y * width + x];
    }
  }
  return out;
}

/**
 * Calculates the RMSE between two arrays.
 */
function rmse(arr1, arr2) {
  if (arr1.length != arr2.length) {
    throw `Size mismatch ${arr1.length} != ${arr2.length}`;
  }

  var mse = 0,
      n = arr1.length;
  for (var i = 0; i < n; i++) {
    var v = arr1[i] - arr2[i];
    mse += v * v;
  }
  mse /= n;
  return Math.sqrt(mse);
};


/**
 * Find the best matches according to RMSE
 *
 * targets = Array<{
 *   pixels: number[],
 *   shifts?: Array<number[]>
 *   width: number,
 *   ...
 * }>
 *
 * If `shifts` is present, only the lowest RMSE shift is considered.
 */
function bestMatches(pixels, targets) {
  let scores = targets.map(target => {
    var score = target.shifts ?
        _.min(target.shifts.map(shift => rmse(pixels, shift))) :
        rmse(pixels, target.pixels);
    return _.extend({}, target, {rmse: score});
  });
  return _.sortBy(scores, 'rmse');
}

/**
 * Returns the margin by which scores[0].rmse is the best, excluding others for
 * which scores[*].property is identical to scores[0].property.
 */
function marginBy(scores, property) {
  let best = scores[0].rmse,
      secondBest = _.find(scores, s => s[property] != scores[0][property]).rmse;
  return (secondBest - best) / best;
}


// Convert a numeric rank to a single character PBN rank (e.g. 10 --> 'T').
function rankToPBN(rank) {
  if (rank >= 2 && rank < 10) return '' + rank;
  else if (rank == 10) return 'T';
  else if (rank == 11) return 'J';
  else if (rank == 12) return 'Q';
  else if (rank == 13) return 'K';
  else if (rank == 14) return 'A';
  throw `Invalid rank: ${rank}`;
}

// value order for the suits
const SUIT_ORDER = {'S': 0, 'H': 1, 'D': 2, 'C': 3};

// Performs sanity checks on the matches structure in recognizeHand.
// - are all the cards accounted for?
// - are the hands correctly ordered?
// Returns a list of errors (or the empty list if it checks out).
function sanityCheckMatches(matches): string[] {
  var errors = [];
  // Are all the cards matched exactly once?
  let cardCounts = {};  // e.g. AS
  for (let suit in SUIT_ORDER) {
    for (let rank of _.range(2, 15)) {
      cardCounts[rankToPBN(rank) + suit] = [];
    }
  }
  for (let playerPos in matches) {
    let player = playerPos[0],
        pos = Number(playerPos.slice(1)),
        match = matches[playerPos],
        suit = match.suit,
        rank = match.rank;
    cardCounts[rankToPBN(rank) + suit].push(playerPos);
  }

  for (let card in cardCounts) {
    let count = cardCounts[card].length;
    if (count == 0) {
      console.warn(`Missing ${card}`);
    } else if (count > 1) {
      var holders = cardCounts[card].join(', ');
      errors.push(`Multiple matches of ${card} (${holders})`);
    }
  }

  // Is everyone's hand in order?
  // There is no firm ordering of the suits. If a trump suit is set, then the
  // hands are re-ordered to put it first.
  for (let player of ['N', 'E', 'S', 'W']) {
    for (let pos of _.range(1, 13)) {
      let a = matches[player + (pos - 1)],
          b = matches[player + pos];
      if (a.suit == b.suit && a.rank < b.rank) {
        var aTxt = rankToPBN(a.rank) + a.suit,
            bTxt = rankToPBN(b.rank) + b.suit;
        errors.push(`${player} is out of order: ${aTxt} < ${bTxt}`);
      }
    }
  }
  return errors;
}

// Convert the matches structure (in recognizeHand) to PBN. North is always first.
function matchesToPBN(matches) {
  var holdings = [];
  for (let player of ['N', 'E', 'S', 'W']) {
    var bySuit = _.chain(_.range(0, 13))
                  .map(pos => matches[player + pos])
                  .groupBy('suit')
                  .mapObject(cards => cards.map(
                        card => rankToPBN(card.rank)).join(''))
                  .value();
                  // looks like {S:'KQT9', H:'9876', ...}

    // We need the empty strings to correctly handle void suits.
    bySuit = _.chain(_.extend({S: '', H: '', D: '', C: ''}, bySuit))
                  .pairs()
                  .sortBy(([suit]) => SUIT_ORDER[suit])
                  .map(([suit, text]) => text)
                  .join('.')
                  .value();
    holdings.push(bySuit);
  }
  return 'N:' + holdings.join(' ');
}

// Boxes to split apart the rank and suit.
// Recognition works much better when these are done independently.
var slices = {
  'NS': {'rank': [0, 0, 51, 59], 'suit': [0, 60, 51, 120]},
  'EW': {'rank': [0, 0, 41, 50], 'suit': [42, 0, 73, 50]}
};

/**
 * Load reference data. Returns a promise for the reference.
 */
function loadReferenceData(nsBlackPath, nsRedPath) {
  return Promise.all([
    loadImage(nsBlackPath),
    loadImage(nsRedPath)
  ]).then(([blackImage, redImage]) => {
    // NS have all the red cards in one image, all the black in the other.
    var nsBlackSuits = {N: 'S', E: 'D', S: 'C', W: 'H'};
    var nsRedSuits =   {N: 'H', E: 'C', S: 'D', W: 'S'};

    // This is the reference structure which is returned. It contains examples
    // of what each suit and rank look like in both N/S and E/W positions.
    var ref = {
      'NS': {ranks: [], suits: []},
      'EW': {ranks: [], suits: []}
    };

    // Add a single card from one of the reference images to the `ref` object.
    var recordCard = function(card, position, isNorthBlack) {
      var player = position[0];
      var isNS = (player == 'S' || player == 'N'),
          side = isNS ? 'NS' : 'EW';
      var posNum = Number(position.slice(1));
      var rank = 14 - posNum;
      var cardSlices = sliceImage(card, slices[side]),
          rankSlice = cardSlices.rank,
          suitSlice = cardSlices.suit;
      var suitPixels = binarize(suitSlice),
          rankPixels = binarize(rankSlice);

      // Only the rank images are shifted. There are enough copies of the suit
      // images that this isn't needed for them. The N/S images are shifted
      // left/right while E/W images are shifted up/down.
      var dx = isNS ? 1 : 0,
          dy = isNS ? 0 : 1;
      var shifts = [
        binaryShift(rankPixels, rankSlice.width, -dx, -dy),
        rankPixels,
        binaryShift(rankPixels, rankSlice.width, +dy, +dy)
      ];
      var suit = isNorthBlack ? nsBlackSuits[player] : nsRedSuits[player];
      var rankEl = {pixels: rankPixels, shifts, rank, width: rankSlice.width, height: rankSlice.height};
      var suitEl = {suit, pixels: suitPixels, width: suitSlice.width, height: suitSlice.height};

      ref[side].ranks.push(rankEl);
      ref[side].suits.push(suitEl);
    };

    var cardsBlackNorth = sliceImage(blackImage, ibbBoxes6);
    var cardsRedNorth = sliceImage(redImage, ibbBoxes6);
    _.each(cardsBlackNorth, (card, position) => {
      recordCard(card, position, true);
    });
    _.each(cardsRedNorth, (card, position) => {
      recordCard(card, position, false);
    });

    return ref;
  });
}

/**
 * Given a screenshot of an iBridgeBaron hand, attempt to recognize the cards.
 *
 * Returns:
 * {
 *   pbn: string,
 *   margin: number,
 *   errors: string[],
 *   matches: Object[]
 * }
 *
 * Higher margins indicate greater confidence. If errors is non-empty, then the
 * board does not represent a complete hand.
 */
function recognizeHand(handImage, ref) {
  var w = handImage.width,
      h = handImage.height;
  if (w != 750 || h != 1334) {
    throw `Invalid screenshot: expected 750x1334, got ${w}x${h}`;
  }
  console.time('recognizeHand');
  var cards = sliceImage(handImage, ibbBoxes6);

  var matches = {};
  for (var pos in cards) {
    var player = pos[0];
    var isNS = (player == 'S' || player == 'N');
    var cardSlices = sliceImage(cards[pos], slices[isNS ? 'NS' : 'EW']),
        rankSlice = cardSlices.rank,
        suitSlice = cardSlices.suit;
    var suitPixels = binarize(suitSlice),
        rankPixels = binarize(rankSlice);
    var refs = isNS ? ref.NS : ref.EW;

    var suitMatches = bestMatches(suitPixels, refs.suits);
    var rankMatches = bestMatches(rankPixels, refs.ranks);

    matches[pos] = {
      suit: suitMatches[0].suit,
      suitStats: {
        rmse: suitMatches[0].rmse,
        margin: marginBy(suitMatches, 'suit')
      },
      rank: rankMatches[0].rank,
      rankStats: {
        rmse: rankMatches[0].rmse,
        margin: marginBy(rankMatches, 'rank')
      }
    };
  }

  var margin = _.min(_.map(matches,
        m => Math.min(m.suitStats.margin / m.suitStats.rmse,
                      m.rankStats.margin / m.rankStats.rmse)));

  console.timeEnd('recognizeHand');
  return {
    pbn: matchesToPBN(matches),
    margin,
    errors: sanityCheckMatches(matches),
    matches
  };
}

// Export these functions globally for now.
_.extend(window, { ibb: {
  loadImage,
  sliceImage,
  rmse,
  binarize,
  binaryToCanvas,
  binaryDiff,
  binaryShift,
  matchesToPBN,
  sanityCheckMatches,
  bestMatches,
  marginBy,
  loadReferenceData,
  recognizeHand
}});
