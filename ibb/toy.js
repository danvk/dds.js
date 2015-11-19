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

}).then(ref => {
  }).then(matches => {
    console.log(matches);
    window.matches = matches;
    sanityCheckMatches(matches);
    console.log(matchesToPBN(matches));
  });
});
