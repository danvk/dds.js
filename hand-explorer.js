var SUIT_SYMBOLS = {
  'S': '♠',
  'H': '♥',
  'D': '♦',
  'C': '♣'
};

/**
 * props:
 *   suit: {'S', 'H', 'D', 'C'}
 *   rank: {'1'..'9', 'T', 'J', 'Q', 'K', 'A'}
 *   orient: {'horiz', 'vert'}
 *   facedown: {false, true}
 */
class Card extends React.Component {
  render() {
    var suit = this.props.suit;
    var suitSym = SUIT_SYMBOLS[suit];
    var rankSym = this.props.rank;
    if (rankSym == 'T') rankSym = '10';
    var orient = this.props.orient;
    var cardClass = 'card card-' + orient;
    if (this.props.facedown) {
      cardClass += ' facedown';
      return <div className={cardClass}><span className='rank'>{'\u00a0'}</span><span className='suit'>{'\u00a0'}</span></div>;
    }
    var secondSuit = null;
    if (orient == 'vert') {
    }
    return (
        <div className={cardClass}>
          <span className='rank'>{rankSym}</span>
          <span className={'suit small-suit suit-'+suit}>{suitSym}</span>
          <span className={'suit big-suit suit-' + suit}>{suitSym}</span>
        </div>
    );
  }
}

ReactDOM.render(
  <div>
    <Card orient='horiz' suit='S' rank='T' />
    <Card orient='horiz' suit='H' rank='A' />
    <Card orient='horiz' suit='C' rank='9' />
    <Card orient='horiz' suit='D' rank='2' />
    <Card facedown={true} orient='horiz' suit='D' rank='2' />
    <Card orient='vert' suit='S' rank='T' />
    <Card orient='vert' suit='H' rank='A' />
    <Card orient='vert' suit='C' rank='9' />
    <Card orient='vert' suit='D' rank='2' />
    <Card facedown={true} orient='vert' suit='C' rank='9' />
  </div>,
  document.getElementById('root')
);
