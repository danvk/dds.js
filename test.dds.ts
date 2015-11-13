var expect = chai.expect;

chai.config.truncateThreshold = 0;  // disable truncating

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
    var b = new Board(pbn, 'W', 'N');
    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(0);
    expect(b.declarer).to.equal('W');
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
    var b = new Board(pbn, 'W', 'N');
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
    var b = new Board(pbn, 'W', 'N');
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
    var b = new Board(pbn, 'W', 'N');
    b.play('N', 'D', 5);
    expect(() => {
      b.play('E', 'C', 5);
    }).to.throw(/follow suit/);
  });

  it('should undo moves', function() {
    var b = new Board(pbn, 'W', 'N');
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
    var b = new Board(pbn, 'W', 'N');
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
    var b = new Board(pbn, 'W', 'N');
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
    var b = new Board(pbn, 'W', 'N');
    b.play('N', 'D', 5);
    b.play('E', 'D', 2);
    b.play('S', 'D', 12);
    b.play('W', 'D', 7);  // S takes trick #1
    expect(b.toPBN()).to.equal('S:Q52.Q982.J.9862 AK6.AT5.A9.AQT4 T843.K4.KT83.73 J97.J763.64.KJ5');
  });

  it('should find next plays', function() {
    var b = new Board(pbn, 'W', 'N');
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
    var b = new Board(pbn, 'W', 'N');
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
});
