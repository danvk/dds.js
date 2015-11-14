loadImage('cards.PNG').then(canvas => {
  var cards = sliceImage(canvas, ibbBoxes6);
  _.each(cards, (card, position) => {
    var cardCnv = document.createElement('canvas');
    cardCnv.width = card.width;
    cardCnv.height = card.height;
    cardCnv.getContext('2d').drawImage(card, 0, 0);
    document.body.appendChild(cardCnv);

    var sp = document.createElement('span');
    sp.innerHTML = ` ${position}<br>`;
    document.body.appendChild(sp);
  });
});
