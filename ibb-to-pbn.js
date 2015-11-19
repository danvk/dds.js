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
  // 4,4,4 = black
  // 232,236,196 = background
  // 229,0,28 = red
  var out = Array(canvas.width * canvas.height);
  var w = canvas.width,
      h = canvas.height,
      d = canvas.getContext('2d').getImageData(0, 0, w, h).data;

  for (var i = 0, n = 0; i < d.length; i+=4, n++) {
    var r = d[i + 0],
        g = d[i + 1],
        b = d[i + 2];

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
_.extend(window, {loadImage, sliceImage, rmse, binarize, binaryToCanvas});
