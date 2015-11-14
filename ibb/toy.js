Promise.all([
  loadImage('ns-black.png'),
  loadImage('ns-red.png')
]).then(([blackImage, redImage]) => {
  var cardsBlackNorth = sliceImage(blackImage, ibbBoxes6);
  var cardsRedNorth = sliceImage(redImage, ibbBoxes6);

  var nsBlackSuits = {N: 'S', E: 'D', S: 'C', W: 'H'};
  var nsRedSuits = {N: 'H', E: 'C', S: 'S', W: 'S'};

  var cardsNS = [];
  var cardsEW = [];

  var recordCard = function(card, position, isNorthBlack) {
    var player = position[0];
    var rank = Number(position.slice(1));
    var el;
    if (isNorthBlack) {
      el = {card, suit: nsBlackSuits[player], rank: 2 + rank};
    } else {
      el = {card, suit: nsRedSuits[player], rank: 2 + rank};
    }
    if (player == 'S' || player == 'N') {
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

  console.log({
    'EW': cardsEW,
    'NS': cardsNS
  });
});
