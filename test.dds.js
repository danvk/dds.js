var expect = chai.expect;

describe('dds', function() {
  it('should solve mid-trick', function() {
    var result = nextPlays('N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4', 'N', 'W', ['5D', '2D', 'QD'])
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
});

describe('Board', function() {
  it('should play a card', function() {
    var b = new Board('N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4', 'W', 'N');
    expect(b.ew_tricks).to.equal(0);
    expect(b.ns_tricks).to.equal(0);
    expect(b.declarer).to.equal('W');
    expect(b.strain).to.equal('N');
    expect(b.tricks).to.be.empty;

    expect(b.cards.W.S).to.deep.equal([14, 13, 6]);  // AK6

    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 5, 3]);  // KT853
    b.play('N', 'D', 5);
    expect(b.cards.N.D).to.deep.equal([13, 10, 8, 3]);  // KT83
    expect(b.plays).to.deep.equal([{player: 'N', suit: 'D', rank: 5}]);
    expect(b.player).to.equal('E');
  });

  it('should play a trick', function() {
    var b = new Board('N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4', 'W', 'N');
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
  });
});
