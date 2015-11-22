var expect = chai.expect;

chai.config.truncateThreshold = 0;  // disable truncating

// Board 2 from http://clubresults.acbl.org/Results/232132/2015/11/151102E.HTM
var pbn = 'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4';

describe('dds', function() {

  it('should solve mid-trick', function() {
    var result = nextPlays(pbn, 'N', ['5D', '2D', 'QD'])
    expect(result).to.deep.equal({
      player: 'W',
      tricks: { ns: 0, ew: 0 },
      plays: [
        { suit: 'D', rank: '7', equals: [], score: 9 },
        { suit: 'D', rank: '9', equals: [], score: 9 },
        { suit: 'D', rank: 'A', equals: [], score: 8 }
      ]
    });
  });

  it('should distinguish strains', function() {
    this.timeout(5000);
    var result;
    result = nextPlays(pbn, 'N', []);
    expect(_.find(result.plays, {suit: 'S', rank: 'T'}).score).to.equal(3);
    result = nextPlays(pbn, 'S', []);
    expect(_.find(result.plays, {suit: 'S', rank: 'T'}).score).to.equal(5);
  });
});

describe('Board', function() {
  it('should play a card', function() {
    var b = new Board(pbn, 'N');
    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(0);
    expect(b.getDeclarer()).to.equal('W');
    expect(b.strain).to.equal('N');
    expect(b.tricks).to.be.empty;

    expect(b.cardsForPlayer('W')).to.deep.equal([
      {suit: 'S', rank: 14},
      {suit: 'S', rank: 13},
      {suit: 'S', rank: 6},
      {suit: 'H', rank: 14},
      {suit: 'H', rank: 10},
      {suit: 'H', rank: 5},
      {suit: 'D', rank: 14},
      {suit: 'D', rank: 9},
      {suit: 'D', rank: 7},
      {suit: 'C', rank: 14},
      {suit: 'C', rank: 12},
      {suit: 'C', rank: 10},
      {suit: 'C', rank: 4}
    ]);

    expect(b.cards.W.S).to.deep.equal([14, 13, 6]);  // AK6

    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 5, 3]);  // KT853
    b.play('N', 'D', 5);
    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 3]);  // KT83
    expect(b.plays).to.deep.equal([{player: 'N', suit: 'D', rank: 5}]);
    expect(b.player).to.equal('E');
  });

  it('should play a trick', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    b.play('W', 'D', 9);

    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(1);
    expect(b.plays).to.be.empty;
    expect(b.tricks).to.deep.equal([
      {
        leader: 'N',
        winner: 'S',
        plays: [
          {player: 'N', suit: 'D', rank: 5},
          {player: 'E', suit: 'D', rank: 2},
          {player: 'S', suit: 'D', rank: 12},
          {player: 'W', suit: 'D', rank: 9}
        ]
      }
    ]);
    expect(b.player).to.equal('S');
  });

  it('should determine legal plays', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);

    expect(b.legalPlays()).to.deep.equal([
      {player: 'E', suit: 'D', rank: 6},
      {player: 'E', suit: 'D', rank: 4},
      {player: 'E', suit: 'D', rank: 2}
    ]);
    b.play('E', 'D', 2);
    expect(b.legalPlays()).to.deep.equal([
      {player: 'S', suit: 'D', rank: 12},
      {player: 'S', suit: 'D', rank: 11}
    ]);

    b.play('S', 'D', 12);
    b.play('W', 'D', 9);
    expect(b.legalPlays()).to.have.length(12);
  });

  it('should throw on illegal plays', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    expect(() => {
      b.play('E', 'C', 5);
    }).to.throw(/follow suit/);
  });

  it('should undo moves', function() {
    var b = new Board(pbn, 'N');
    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(0);
    expect(b.player).to.equal('N');
    expect(b.plays).to.have.length(0);

    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 5, 3]);  // KT853
    b.play('N', 'D', 5);
    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 3]);  // KT83
    expect(b.plays).to.have.length(1);
    expect(b.player).to.equal('E');

    expect(b.cards.E.D).to.deep.equal([6, 4, 2]);
    b.play('E', 'D', 2);
    expect(b.cards.E.D).to.deep.equal([6, 4]);
    expect(b.plays).to.have.length(2);
    expect(b.player).to.equal('S');

    b.undo();
    expect(b.player).to.equal('E');
    expect(b.plays).to.have.length(1);
    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 3]);  // KT83
    expect(b.cards.E.D).to.deep.equal([6, 4, 2]);

    b.undo();
    expect(b.player).to.equal('N');
    expect(b.plays).to.have.length(0);
    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 5, 3]);  // KT853
    expect(b.cards.E.D).to.deep.equal([6, 4, 2]);
  });

  it('should undo through tricks', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    b.play('W', 'D', 9);  // S takes trick #1
    b.play('S', 'D', 11);

    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(1);

    b.undoToPlay(0, 2);
    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(0);
    expect(b.plays).to.deep.equal([
      {player: 'N', suit: 'D', rank: 5},
      {player: 'E', suit: 'D', rank: 2}
    ]);
  });

  it('should find played cards', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    b.play('W', 'D', 7);  // S takes trick #1
    b.play('S', 'D', 11);
    b.play('W', 'D', 9);

    expect(b.indexForCard('D', 5)).to.deep.equal([0, 0]);
    expect(b.indexForCard('D', 2)).to.deep.equal([0, 1]);
    expect(b.indexForCard('D', 12)).to.deep.equal([0, 2]);
    expect(b.indexForCard('D', 7)).to.deep.equal([0, 3]);
    expect(b.indexForCard('D', 11)).to.deep.equal([1, 0]);
    expect(b.indexForCard('D', 9)).to.deep.equal([1, 1]);
  });

  it('should generate PBN', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    b.play('W', 'D', 7);  // S takes trick #1
    expect(b.toPBN()).to.equal('S:Q52.Q982.J.9862 AK6.AT5.A9.AQT4 T843.K4.KT83.73 J97.J763.64.KJ5');
  });

  it('should find next plays', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    expect(b.nextPlays()).to.deep.equal({
      player: 'W',
      tricks: { ns: 0, ew: 0 },
      plays: [
        { suit: 'D', rank: '7', equals: [], score: 9 },
        { suit: 'D', rank: '9', equals: [], score: 9 },
        { suit: 'D', rank: 'A', equals: [], score: 8 }
      ]
    });
  });

  it('should find next plays after a trick', function() {
    var b = new Board(pbn, 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    b.play('W', 'D', 7);
    expect(b.ns_tricks).to.equal(1);
    expect(b.tricks).to.have.length(1);
    expect(b.plays).to.have.length(0);

    expect(b.nextPlays()).to.deep.equal({
      player: 'S',
      tricks: { ns: 0, ew: 0 },
      plays: [
        { suit: 'D', rank: 'J', equals: [], score: 3 },
        { suit: 'H', rank: '2', equals: [], score: 2 },
        { suit: 'H', rank: '9', equals: ['8'], score: 2 },
        { suit: 'H', rank: 'Q', equals: [], score: 2 },
        { suit: 'S', rank: '2', equals: [], score: 2 },
        { suit: 'S', rank: '5', equals: [], score: 2 },
        { suit: 'S', rank: 'Q', equals: [], score: 2 },
        { suit: 'C', rank: '2', equals: [], score: 2 },
        { suit: 'C', rank: '9', equals: ['8'], score: 2 },
        { suit: 'C', rank: '6', equals: [], score: 2 }
      ]
    });
  });

  it('should rotate a PBN string', function() {
    // 'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4'
    expect(rotatePBN(pbn, 'E')).to.equal(
      'E:J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4 T843.K4.KT853.73');
  });
});

describe('HandExplorer', function() {
  it('should play a card', function() {
    var el = document.getElementById('testdiv');
    var tree = ReactDOM.render(<Root initialPBN={pbn} initialStrain='N' initialDeclarer='W' />, el);

    var cards = el.querySelectorAll('.card');
    expect(cards).to.have.length(52);

    var northCards = el.querySelector('.north').querySelectorAll('.card');
    expect(northCards).to.have.length(13);

    var d5 = northCards[11];
    expect(d5.textContent).to.equal('5♦9');  // making 9

    React.addons.TestUtils.Simulate.click(d5);

    var nextCards = el.querySelectorAll('.enable .card');
    expect(nextCards).to.have.length(3);
    expect(_.map(el.querySelectorAll('.enable .card .suit'), x => x.textContent)).to.deep.equal(['♦', '♦', '♦']);
    expect(_.map(el.querySelectorAll('.enable .card .rank'), x => x.textContent)).to.deep.equal(['6', '4', '2']);
    expect(_.map(el.querySelectorAll('.enable .card .making'), x => x.textContent)).to.deep.equal(['9', '9', '9']);

    el.innerHTML = '';
  });
});

describe('ibb-to-pbn', function () {

  // Pull in the ibb symbols for testing.
  var {loadImage, sliceImage, rmse, loadReferenceData, recognizeHand} = window.ibb;

  it('should load an image to canvas', function () {
    return loadImage('ibb/cards.PNG').then(canvas => {
      expect(canvas.width).to.equal(750);
      expect(canvas.height).to.equal(1334);
    });
  });

  /*
  TODO(max): add cards_5S.PNG to the project
  it('should load and rescale an image to canvas', function () {
    return loadImage('ibb/cards_5S.PNG').then(canvas => {
      expect(canvas.width).to.equal(750);
      expect(canvas.height).to.equal(1334);
    });
  });
  */

  it('should slice image into array of smaller images', function () {
    var boxes = {
      S0: [  0, 1208,  56, 1332],  // 57x125
      E0: [668,  338, 748,  391]   // 81x54
    };
    return loadImage('ibb/cards.PNG').then(canvas => {
      var slices = sliceImage(canvas, boxes);
      expect(_.keys(slices)).to.deep.equal(['S0', 'E0']);
      expect(slices.S0.width).to.equal(57);
      expect(slices.S0.height).to.equal(125);
      expect(slices.E0.width).to.equal(81);
      expect(slices.E0.height).to.equal(54);
    });
  });

  it('should return distance of 0 for identical arrays', function () {
    var xs = [0, 1, 2, 3, 4, 1, 9];
    expect(rmse(xs, xs)).to.equal(0);
  });

  describe('recognizeHand', function() {
    var ref;
    before(function() {
      console.log('loading reference...');
      console.time('loadref');
      return loadReferenceData('ibb/ns-black.png', 'ibb/ns-red.png')
        .then(loadedRef => {
          console.timeEnd('loadref');
          ref = loadedRef;
        });
    });

    it('should recognize an iPhone6 hand', function() {
      return loadImage('ibb/cards.PNG').then(img => {
        var m = recognizeHand(img, ref);
        // Note: PBN is spades/hearts/diamonds/clubs, whereas iBB orders the
        // hands to alternate red/black.
        expect(m.pbn).to.equal('N:J86.T832.J76.JT5 ' +
                                 '95.Q7.KQ854.AK76 ' +
                                 'T742.J654.A9.942 ' +
                                 'AKQ3.AK9.T32.Q83');
        expect(m.errors).to.deep.equal([]);
        expect(m.margin).to.be.above(0);
        console.log(m);
      });
    });

    it('should recognize another iPhone6 hand', function() {
      return loadImage('ibb/IMG_0461.PNG').then(img => {
        var m = recognizeHand(img, ref);
        expect(m.pbn).to.equal('N:KQJT42.K7.AKJ.T6 ' +
                                 '85.862.T98742.A4 ' +
                                 '9763.QJ5.5.J9753 ' +
                                 'A.AT943.Q63.KQ82');
        expect(m.errors).to.deep.equal([]);
        expect(m.margin).to.be.above(0);
        console.log(m);
      });
    });

    it('should recognize a third hand', function() {
      return loadImage('ibb/hand3.PNG').then(img => {
        var m = recognizeHand(img, ref);
        console.log(m);
        expect(m.errors).to.deep.equal([]);
        expect(m.margin).to.be.above(0);
        expect(m.pbn).to.equal('N:T.KJ.KT64.KQJ642 ' +
                                 'KQJ7543.T3.95.73 ' +
                                 'A82.842.QJ83.A85 ' +
                                 '96.AQ9765.A72.T9');
      });
    });

    it('should recognize a hand with a void', function() {
      return loadImage('ibb/hand_with_void.PNG').then(img => {
        var m = recognizeHand(img, ref);
        expect(m.pbn).to.equal('N:AKQJ65.AT3.32.KJ ' +
                                 'T874.J42.84.9864 ' +
                                 '92.KQ98765.AQ9.A ' +
                                 '3..KJT765.QT7532');
        expect(m.errors).to.deep.equal([]);
        expect(m.margin).to.be.above(0);
        console.log(m);
      });
    });

    it('should recognize a hand with multiple voids', function() {
      return loadImage('ibb/multiple_voids.PNG').then(img => {
        var m = recognizeHand(img, ref);
        console.log(m);
        expect(m.errors).to.deep.equal([]);
        expect(m.margin).to.be.above(0);
        expect(m.pbn).to.equal('N:AQ953.A72.A9754. ' +
                                 'KJT76.64.832.T87 ' +
                                 '8.KQJT983..AQ942 ' +
                                 '42.5.KQJT6.KJ653');
      });
    });

    it('should recongize a fun hand', function() {
      return loadImage('ibb/maybe_sacrifice.PNG').then(img => {
        var m = recognizeHand(img, ref);
        console.log(m);
        expect(m.errors).to.deep.equal([]);
        expect(m.margin).to.be.above(0);
        expect(m.pbn).to.equal('N:.KJT75.8654.QJT2 ' +
                                 'QJT9853..K.K9543 ' +
                                 '4.AQ9832.AJ932.A ' +
                                 'AK762.64.QT7.876');
      });
    });

    it('should fail to recognize a closed hand', function() {
      return loadImage('ibb/ew_closed.PNG').then(img => {
        var m = recognizeHand(img, ref);
        console.log(m);
        // Comes out as:
        // N:872.7542.85.8652 .TTTTQQQTTTT..TT KJ5.AQT8.AKT.AK3 J.QQQQQQQQQQQQ..
        expect(m.errors).to.have.length.above(0);
        expect(m.margin).to.be.below(0.01);  // should be really low, anyway.
        // It should get the N/S holdings correct, at least.
        expect(m.pbn.slice(0, 18)).to.equal('N:872.7542.85.8652');
        expect(m.pbn.slice(36, 52)).to.equal( 'KJ5.AQT8.AKT.AK3');
      });
    });
  });

  /*
  TODO(max): add cards_5S.PNG to the project
  it('should return > 0 distance for different canvases', function () {
    return Promise.all([loadImage('ibb/cards.PNG'), 
                loadImage('ibb/cards_5S.PNG')])
             .then(([firstCanvas, secondCanvas]) => {
               var px1 = binarize(firstCanvas),
                   px2 = binarize(secondCanvas);
               var distance = rmse(px1, px2);
               expect(distance).to.be.above(0);     
           });
  });
  */
});
