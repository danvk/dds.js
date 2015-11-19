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

// 4,4,4 = black
// 232,236,196 = background
// 229,0,28 = red

// takes a canvas and returns a 1d array of whether pixels are foreground.
function binarize(canvas) {
  var out = Array(canvas.width * canvas.height);
  var w = canvas.width,
      h = canvas.height,
      d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  for (var i = 0, n = 0; i < d.length; i+=4, n++) {
    var abserr = Math.abs(d[i + 0] - 232) +
                 Math.abs(d[i + 1] - 236) +
                 Math.abs(d[i + 2] - 196);
    out[n] = (abserr > 20) ? 1 : 0;
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

// Export these functions globally for now.
_.extend(window, {loadImage, sliceImage, rmse, binarize});
