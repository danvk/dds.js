var expect = chai.expect;

describe('dds', function() {
  it('should solve mid-trick', function() {
    var result = nextPlays("N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4", "N", "W", ['5D', '2D', 'QD'])
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
