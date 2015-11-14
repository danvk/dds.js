window.loadImage = function (fname) {
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
window.sliceImage = function(canvas, boxes) {
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

/* Takes two canvas elements and computes the RMS distance between the two, as rgba pixels
 * 
 * Rescales both to be the size of the first one for comparison.
 * */

window.distanceCanvas = function (canvas1, canvas2) {
    var arr1 = canvas1.getContext('2d')
                      .getImageData(0, 0, 
                         canvas1.width, canvas1.height);
    var arr2 = canvas2.getContext('2d')
                      .getImageData(0, 0,
                         canvas1.width, canvas1.height);
    var mse = 0;
    for (var idx = 0; idx != arr1.data.length; idx++)
    {
      mse += Math.pow(arr1.data[idx] - arr2.data[idx], 2);
    }
    return Math.sqrt(mse);
};

