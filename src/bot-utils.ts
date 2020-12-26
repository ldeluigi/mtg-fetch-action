import fetch from 'node-fetch'
import {ScryfallCardObject} from './scryfall-interface'
import distance from 'jaro-winkler'

const scryfallEndpoint = 'https://api.scryfall.com/cards/search?q='
const edhrecRegex = new RegExp(/(?<=\{\{)(.*?)(?=\}\})/g)
const gathererRegex = new RegExp(/(?<=\[\[)(.*?)(?=\]\])/g)
const legalityRegex = new RegExp(/(?<=<<)(.*?)(?=>>)/g)
const pricingRegex = new RegExp(/(?<=\(\()(.*?)(?=\)\))/g)

function sendPricingInfo(card: ScryfallCardObject): string {
  const data = {
    title: `${card.name} - TCGPlayer pricing`,
    url: card.purchase_uris.tcgplayer,
    image: {
      url: card.image_uris.png
    }
  }
  return `### ${data.title}\n![${card.name}](${data.image.url})\n[Buy on TCGPlayer](${data.url})`
}

function sendLegalityInfo(card: ScryfallCardObject): string {
  let legaityString = ''

  for (const [key, value] of Object.entries(card.legalities)) {
    const legal = value.replace(new RegExp('_', 'g'), ' ')
    legaityString += `${key}: ${legal}\n`
  }

  const data = {
    title: `${card.name} - Legalities`,
    description: legaityString
  }
  return `### ${data.title}\n${data.description}`
}

function sendGathererInfo(card: ScryfallCardObject): string {
  const data = {
    title: `${card.name} - Gatherer Page`,
    url: card.related_uris.gatherer,
    image: {
      url: card.image_uris.png
    }
  }

  return `### [${data.title}](${data.url})\n![${card.name}](${data.image.url})`
}

function sendEdhrecInfo(card: ScryfallCardObject): string {
  const data = {
    title: `${card.name} - EDHREC Page`,
    url: card.related_uris.edhrec,
    image: {
      url: card.image_uris.png
    }
  }

  return `### [${data.title}](${data.url})\n![${card.name}](${data.image.url})`
}

function pickBest(
  cardName: string,
  cardList: ScryfallCardObject[]
): ScryfallCardObject {
  let max = Number.NEGATIVE_INFINITY
  let index = 0

  cardList.forEach((card, i) => {
    const num = distance(card.name.toLowerCase(), cardName.toLowerCase())
    if (num > max) {
      max = num
      index = i
    }
  })

  return cardList[index]
}

async function fetchAndReturn(card: string, mode: number): Promise<string> {
  const encoded = encodeURI(card)
  const response = await fetch(scryfallEndpoint + encoded)
  const scryfallResponse = await response.json()
  const cardList = scryfallResponse.data
  if (cardList != null) {
    const cardToSend = pickBest(card, cardList)
    switch (mode) {
      case 1:
        return sendEdhrecInfo(cardToSend)
      case 2:
        return sendGathererInfo(cardToSend)
      case 3:
        return sendLegalityInfo(cardToSend)
      case 4:
        return sendPricingInfo(cardToSend)
    }
    return ''
  } else {
    return `Unable to retrieve information for "${card}"`
  }
}

export function printHelp(): string {
  return (
    'These are the following commands I can perform:\n\n' +
    '`[[cardname]]` returns card information from gatherer, and also puts the card image ' +
    'in the chat.\n\n' +
    '`{{cardname}}` returns card information from EDHREC, and also puts the card image in' +
    ' the chat.\n\n' +
    '`<<cardname>>` returns card format legality information.\n\n' +
    '`((cardname))` returns card pricing from TCGPlayer, and also puts the card image in' +
    ' the chat.\n\n' +
    'If you desire a specific set image, insert e:SET inside the brackets and after the' +
    ' card name, using the 3 letter set code instead of the word SET. Other syntax rules' +
    ' can be found at https://scryfall.com/docs/syntax.'
  )
}

export async function searchForCards(message: string): Promise<string> {
  const edhrecCards = message.match(edhrecRegex)
  if (edhrecCards) {
    return asyncReduce(
      edhrecCards.map(async e => fetchAndReturn(e, 1)),
      a => a.join('\n\n')
    )
  }

  const gathererCards = message.match(gathererRegex)
  if (gathererCards) {
    return asyncReduce(
      gathererCards.map(async e => fetchAndReturn(e, 2)),
      a => a.join('\n\n')
    )
  }

  const legalityCards = message.match(legalityRegex)
  if (legalityCards) {
    return asyncReduce(
      legalityCards.map(async e => fetchAndReturn(e, 3)),
      a => a.join('\n\n')
    )
  }

  const pricingCards = message.match(pricingRegex)
  if (pricingCards) {
    return asyncReduce(
      pricingCards.map(async e => fetchAndReturn(e, 4)),
      a => a.join('\n\n')
    )
  }
  return ''
}

async function asyncReduce<T, R>(
  a: Promise<T>[],
  agg: (_: T[]) => R
): Promise<R> {
  const res = await Promise.all(a)
  return agg(res)
}
