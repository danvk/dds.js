// expand until pixels with a different color.
function floodFill(ctx, x, y) {
  var im = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  var w = im.width;
  var data = im.data;
  var idx = (x, y) => 4 * (y * w + x);
  var tIdx = idx(x, y);
  var target = [
    data[tIdx + 0],
    data[tIdx + 1],
    data[tIdx + 2]
  ];
  var isMatch = ([x, y]) => {
    var tIdx = idx(x, y);
    return (data[tIdx + 0] == target[0] &&
            data[tIdx + 1] == target[1] &&
            data[tIdx + 2] == target[2]);
  };

  var neighbors = (x, y) => ([
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
  ]);

  var uniq = array => {
    var out = [];
    for (var i = 0; i < array.length; i++) {
      if (i == 0 ||
          (array[i][0] != out[out.length - 1][0] ||
           array[i][1] != out[out.length - 1][1])) {
        out.push(array[i]);
      }
    }
    return out;
  };
  var sortCoords = array => {
    array.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };

  var fill = [[x, y]],
      count = fill.length,
      lastCount = 0;
  while (count > lastCount) {
    var newFill = _.flatten(fill.map(([x, y]) => neighbors(x, y)), true);
    newFill = newFill.filter(isMatch);
    lastCount = count;
    fill = fill.concat(newFill);
    sortCoords(fill);
    fill = uniq(fill);
    count = fill.length;
  }

  for (var [x, y] of fill) {
    var xyIdx = idx(x, y);
    data[xyIdx + 0] = 0;
    data[xyIdx + 1] = 0;
    data[xyIdx + 2] = 255;
  }
  return fill;
}

var extremes = pixels => {
  var xs = pixels.map(xy => xy[0]),
      ys = pixels.map(xy => xy[1]);
  return [
    _.min(xs),
    _.min(ys),
    _.max(xs),
    _.max(ys)
  ];
};

// loadImage('ns-black.png').then(image => {
//   var cnv = document.getElementById('cnv');
//   var ctx = cnv.getContext('2d');
//   ctx.drawImage(image, 0, 0);
// 
//   var positions = _.keys(ibbBoxes6);
// 
//   var refinedBoxes = {};
// 
//   var fill = () => {
//     var pos = positions.splice(0, 1)[0];
//     var box = ibbBoxes6[pos];
//     var x = box[0] + 5,
//         y = box[1] + 5;
//     var flood = floodFill(ctx, x, y);
// 
//     box = extremes(flood);
//     ctx.strokeStyle = 'blue';
//     ctx.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
// 
//     refinedBoxes[pos] = box;
// 
//     if (positions.length) {
//       window.setTimeout(fill, 0);
//     } else {
//       console.log(refinedBoxes);
//     }
//   };
// 
//   fill();
// });

Promise.all([
  loadImage('ns-black.png'),
  loadImage('ns-red.png')
]).then(([blackImage, redImage]) => {
  var div = document.getElementById('root');
  var cardsBlackNorth = sliceImage(blackImage, ibbBoxes6);
  var cardsRedNorth = sliceImage(redImage, ibbBoxes6);

  var nsBlackSuits = {N: 'S', E: 'D', S: 'C', W: 'H'};
  var nsRedSuits = {N: 'H', E: 'C', S: 'D', W: 'S'};

  var cardsNS = [];
  var cardsEW = [];

  var recordCard = function(card, position, isNorthBlack) {
    var player = position[0];
    var isNS = (player == 'S' || player == 'N');
    var posNum = Number(position.slice(1));
    var rank = 14 - posNum;
    var pixels = binarize(card);
    var dx = isNS ? 1 : 0,
        dy = isNS ? 0 : 1;
    var shifts = [
      binaryShift(pixels, card.width, -dx, -dy),
      pixels,
      binaryShift(pixels, card.width, +dy, +dy)
    ];
    var el = {pixels, shifts, rank, width: card.width, height: card.height};
    if (isNorthBlack) {
      _.extend(el, {suit: nsBlackSuits[player]});
    } else {
      _.extend(el, {suit: nsRedSuits[player]});
    }
    if (isNS) {
      cardsNS.push(el);
    } else {
      cardsEW.push(el);
    }
  };

  _.each(cardsBlackNorth, (card, position) => {
    recordCard(card, position, true);
  });
  _.each(cardsRedNorth, (card, position) => {
    recordCard(card, position, false);
  });

  var ref = {
    'EW': cardsEW,
    'NS': cardsNS
  };
  window.ref = ref;

  return ref;
}).then(ref => {
  return loadImage('cards.PNG').then(img => {
    var cards = sliceImage(img, ibbBoxes6);
    var root = document.getElementById('textarea');
    var div = document.getElementById('root');
    var html = '\t';
    for (var {suit,rank} of ref.NS) {
      html += `${suit}${rank}\t`;
    }
    root.innerHTML = html + '\n';
    var matches = {};
    for (var pos in cards) {
      var player = pos[0];
      var isNS = (player == 'S' || player == 'N');
      var refs = isNS ? ref.NS : ref.EW;
      // root.innerHTML += pos;
      var pixels = binarize(cards[pos]);
      var scores = [];
      for (var refCard of refs) {
        var minE = 1;
        for (var shift of refCard.shifts) {
          var e = rmse(pixels, shift);
          minE = Math.min(e, minE);
        }
        scores.push({suit: refCard.suit, rank: refCard.rank, rmse: minE});
        // root.innerHTML += `\t${minE}`;
      }
      scores = _.sortBy(scores, 'rmse').slice(0, 2);
      // root.innerHTML += '\n';
      matches[pos] = _.extend(scores[0], {
          margin: scores[1].rmse - scores[0].rmse,
          alt: { suit: scores[1].suit, rank: scores[1].rank }
      });
    }

    /*
    for (var dx of [-1, 0, 1]) {
      var s0 = cards.S0,
          bs0 = binaryShift(binarize(s0), s0.width, dx, 0),
          ref10S = _.find(ref.NS, {rank: 10, suit: 'S'});
      div.appendChild(binaryToCanvas(bs0, s0.width));
      div.appendChild(binaryToCanvas(ref10S.pixels, ref10S.width));
      div.appendChild(binaryToCanvas(binaryDiff(bs0, ref10S.pixels), s0.width));
      div.appendChild(document.createElement('br'));
    }
    */
    return matches;
  }).then(matches => {
    // sanity checks:
    // - are all the cards accounted for?
    // - are the hands correctly ordered?
    console.log(matches);
    window.matches = matches;
    sanityCheckMatches(matches);
    console.log(matchesToPBN(matches));
  });
});
