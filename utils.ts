const deckCards = [
    'AS', 'KS', 'QS', 'JS', '0S', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S',
    'AH', 'KH', 'QH', 'JH', '0H', '9H', '8H', '7H', '6H', '5H', '4H', '3H', '2H',
    'AD', 'KD', 'QD', 'JD', '0D', '9D', '8D', '7D', '6D', '5D', '4D', '3D', '2D',
    'AC', 'KC', 'QC', 'JC', '0C', '9C', '8C', '7C', '6C', '5C', '4C', '3C', '2C',
]

const suits = ['Sans', 'Spades', 'Hearts', 'Diamonds', 'Clubs']

const spades = [
  'AS', 'KS', 'QS', 'JS', '0S', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S',
]
const hearts = [
  'AH', 'KH', 'QH', 'JH', '0H', '9H', '8H', '7H', '6H', '5H', '4H', '3H', '2H',
]
const diamonds = [
  'AD', 'KD', 'QD', 'JD', '0D', '9D', '8D', '7D', '6D', '5D', '4D', '3D', '2D',
]
const clubs = [
  'AC', 'KC', 'QC', 'JC', '0C', '9C', '8C', '7C', '6C', '5C', '4C', '3C', '2C',
]

type Hands = {
  [key: string]: string[]
}

export const distributeDeck = (players: string[]): Hands => {
    const hands: Hands = {}
    const handsHash: {[key: string]: number}[] = [{}, {}, {}, {}]
    const deck = [...deckCards]
    
    // shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = deck[i]
      deck[i] = deck[j]
      deck[j] = temp
    }

    // creating initial hands dictionary
    for (let i = 0; i < 4; i++) {
        deckCards.forEach(card => {
            handsHash[i][card] = 0
        })
    }
  
    // adding cards to hands dictionary
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 13; j++) {
        const drawnCard = deck[0]
        handsHash[i][drawnCard] = 1
        deck.shift()
      }
    }
    
    // adding cards to hands while sorting
    handsHash.forEach((hash, index) => {
      Object.keys(hash).forEach(card => {
        if (hash[card] === 1) {
          if (hands[players[index]] === undefined)
            hands[players[index]] = [card]
          else
            hands[players[index]].push(card)
        }
      })
    })

    return hands
}

export const evaluateField = (currentField: string[], masterSuit: number, hands: Hands, players: string[]): [number, Hands] => {
  let array: string[] = []
  let masterArray: string[] = []
  let highCard = currentField[0]
  
  if (highCard.includes('S'))
    array = [...spades]
  else if (highCard.includes('H'))
    array = [...hearts]
  else if (highCard.includes('D'))
    array = [...diamonds]
  else if (highCard.includes('C'))
    array = [...clubs]

  if (masterSuit === 1)
    masterArray = [...spades]
  else if (masterSuit === 2)
    masterArray = [...hearts]
  else if (masterSuit === 3)
    masterArray = [...diamonds]
  else if (masterSuit === 4)
    masterArray = [...clubs]
  
  for (let i = 1; i < 4; i++) {
    if (currentField[i].includes(array[0][1])) {
      if (array.indexOf(currentField[i]) < array.indexOf(highCard)) {
        highCard = currentField[i]
      }
    } else if (currentField[i].includes(suits[masterSuit][0])) {
      if (highCard.includes(suits[masterSuit][0])) {
        if (masterArray.indexOf(currentField[i]) < masterArray.indexOf(highCard)) {
          highCard = currentField[i]
        }
      } else {
        highCard = currentField[i]
      }
    }
  }
  
  let winner = 0
  for (let i = 0; i < 4; i++) {
    if (hands[players[i]].includes(highCard)) {
      winner = i
      break
    }
  }

  const newHands: Hands = JSON.parse(JSON.stringify(hands))
  for (let i = 0; i < currentField.length; i++) {
    newHands[players[i]] = newHands[players[i]].filter(card => !currentField.includes(card))
  }

  return [winner, newHands]
}