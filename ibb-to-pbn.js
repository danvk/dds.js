function loadImage(fname) {
  return new Promise((resolve, reject) => {
    var img = document.createElement('img');
    img.src = fname;
    img.onload = function () {
        var c = document.createElement('canvas');
        c.width = 750; // iPhone 6 screenshot size
        c.height = 1334;
        c.getContext("2d").drawImage(img, 0, 0, 
                           750, 1334);
        resolve(c);
    }
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

// takes a canvas and returns a 1d array of whether pixels are foreground.
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

    // var abserr = Math.abs(d[i + 0] - 232) +
    //              Math.abs(d[i + 1] - 236) +
    //              Math.abs(d[i + 2] - 196);
    // out[n] = (abserr > 20) ? 1 : 0;
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
    throw 'Size mismatch';
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

function rankToPBN(rank) {
  if (rank >= 2 && rank < 10) return '' + rank;
  else if (rank == 10) return 'T';
  else if (rank == 11) return 'J';
  else if (rank == 12) return 'Q';
  else if (rank == 13) return 'K';
  else if (rank == 14) return 'A';
  throw `Invalid rank: ${rank}`;
}

// order in which iBridgeBaron displays the suits
const SUIT_ORDER = {'S': 0, 'H': 1, 'C': 2, 'D': 3};

// - are all the cards accounted for?
// - are the hands correctly ordered?
function sanityCheckMatches(matches) {
  // Are all the cards matched exactly once?
  let cardCounts = {};  // e.g. AS
  for (let suit in SUIT_ORDER) {
    for (let rank of _.range(2, 15)) {
      cardCounts[rankToPBN(rank) + suit] = 0;
    }
  }
  for (let playerPos in matches) {
    let player = playerPos[0],
        pos = Number(playerPos.slice(1)),
        match = matches[playerPos],
        suit = match.suit,
        rank = match.rank;
    cardCounts[rankToPBN(rank) + suit] += 1;
  }

  for (let card in cardCounts) {
    let count = cardCounts[card];
    if (count == 0) {
      console.warn(`Missing ${card}`);
    } else if (count > 1) {
      console.warn(`Multiple matches of ${card} (${count}x)`);
    }
  }

  // Is everyone's hand in order?
  for (let player of ['N', 'E', 'S', 'W']) {
    for (let pos of _.range(1, 13)) {
      let a = matches[player + (pos - 1)],
          b = matches[player + pos],
          aSuit = SUIT_ORDER[a.suit],
          bSuit = SUIT_ORDER[b.suit];
      if (aSuit > bSuit || (aSuit == bSuit && a.rank < b.rank)) {
        var aTxt = rankToPBN(a.rank) + a.suit,
            bTxt = rankToPBN(b.rank) + b.suit;
        console.warn(`${player} is out of order: ${aTxt} < ${bTxt}`);
      }
    }
  }
}

function matchesToPBN(matches) {
  var holdings = [];
  for (let player of ['N', 'E', 'S', 'W']) {
    var bySuit = _.chain(_.range(0, 13))
                  .map(pos => matches[player + pos])
                  .groupBy('suit')
                  .mapObject(cards => cards.map(
                        card => rankToPBN(card.rank)).join(''))
                  // {S:'KQT9', H:'9876', ...}
                  .pairs()
                  .sortBy(([suit]) => SUIT_ORDER[suit])
                  .map(([suit, text]) => text)
                  .join('.')
                  .value();
    holdings.push(bySuit);
  }
  return 'N:' + holdings.join(' ');
}

// Export these functions globally for now.
_.extend(window, {loadImage, sliceImage, rmse, binarize, binaryToCanvas, binaryDiff, binaryShift, matchesToPBN, sanityCheckMatches});
