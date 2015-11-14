function loadImage(fname) {
  return new Promise((resolve, reject) => {
    var img = document.createElement('img');
    img.src = fname;
    img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c);
    }
  });
};
