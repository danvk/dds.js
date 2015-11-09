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
 *   facedown: {false, true}
 */
class Card extends React.Component {
  render() {
    var suit = this.props.suit;
    var suitSym = SUIT_SYMBOLS[suit];
    var rankSym = this.props.rank;
    if (rankSym == 'T') rankSym = '10';
    if (this.props.facedown) {
      return (
          <div className='card facedown'>
            <span className='rank'>{'\u00a0'}</span>
            <span className='suit'>{'\u00a0'}</span>
          </div>
        );
    } else {
      return (
          <div className='card'>
            <span className='rank'>{rankSym}</span>
            <span className={'suit suit-' + suit}>{suitSym}</span>
          </div>
      );
    }
  }
}

ReactDOM.render(
  <div>
    <Card suit='S' rank='T' />
    <Card suit='H' rank='A' />
    <Card suit='C' rank='9' />
    <Card suit='D' rank='2' />
    <Card facedown={true} suit='D' rank='2' />
    <Card suit='S' rank='T' />
    <Card suit='H' rank='A' />
    <Card suit='C' rank='9' />
    <Card suit='D' rank='2' />
    <Card facedown={true} suit='C' rank='9' />
  </div>,
  document.getElementById('root')
);
