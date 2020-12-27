import fetch from 'node-fetch'
import {ScryfallCardObject, ScryfallCardFaceObject} from './scryfall-interface'
import distance from 'jaro-winkler'

const scryfallEndpoint = 'https://api.scryfall.com/cards/search?q='
const imageRegex = new RegExp(/(?<=\{\{)(.*?)(?=\}\})/g)
const gathererRegex = new RegExp(/(?<=\[\[)(.*?)(?=\]\])/g)
const legalityRegex = new RegExp(/(?<=::)(.*?)(?=::)/g)
const pricingRegex = new RegExp(/(?<=\(\()(.*?)(?=\)\))/g)

function sendPricingInfo(card: ScryfallCardObject): string {
  const data = {
    title: `${card.name} - TCGPlayer pricing`,
    url: card.purchase_uris.tcgplayer,
    image: {
      url: card.card_faces
        ? card.card_faces[0].image_uris?.png
        : card.image_uris?.png
    }
  }
  return `### [${data.title}](${data.url})\n<img src="${data.image.url}" alt="${card.name}" width="300"/>`
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

function sendCardInfo(card: ScryfallCardObject): string {
  const cardToInfo = (c: ScryfallCardFaceObject): (string | undefined)[] => [
    c.mana_cost,
    c.type_line,
    c.power && c.toughness ? `${c.power}/${c.toughness}` : undefined,
    c.loyalty ? `${c.loyalty}` : undefined,
    c.oracle_text
  ]
  const data = {
    title: `${card.name}`,
    url: {
      gatherer: card.related_uris.gatherer,
      scryfall: card.scryfall_uri,
      edhrec: card.related_uris.edhrec
    },
    image: {
      url: card.card_faces
        ? card.card_faces[0].image_uris?.normal
        : card.image_uris?.normal
    },
    info: card.card_faces
      ? cardToInfo(card.card_faces[0])
          .concat(':arrows_counterclockwise:')
          .concat(cardToInfo(card.card_faces[1]))
      : cardToInfo(card)
  }

  return `**[${data.title}](${data.image.url})** - [(Gatherer)](${
    data.url.gatherer
  }) [(Scryfall)](${data.url.scryfall}) [(EDHREC)](${
    data.url.edhrec
  })\n${data.info
    .filter(i => i)
    .map(i => `> ${i?.replace('\n', '\n> ')}`)
    .join('\n')}`
}

function sendCardImageInfo(card: ScryfallCardObject): string {
  const data = {
    title: `${card.name}`,
    url: {
      gatherer: card.related_uris.gatherer,
      scryfall: card.scryfall_uri,
      edhrec: card.related_uris.edhrec
    },
    image: {
      url: card.card_faces
        ? card.card_faces[0].image_uris?.png
        : card.image_uris?.png
    }
  }

  return `## ${data.title}\n<img src="${data.image.url}" alt="${card.name}" width="300"/>\n\n### [(Gatherer)](${data.url.gatherer}) [(Scryfall)](${data.url.scryfall}) [(EDHREC)](${data.url.edhrec})`
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
        return sendCardImageInfo(cardToSend)
      case 2:
        return sendCardInfo(cardToSend)
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
    '- `[[cardname]]` returns card information from gatherer and other websites in the chat.\n' +
    '- `{{cardname}}` returns card information from gatherer, and also puts the card image in the chat.\n' +
    '- `::cardname::` returns card format legality information.\n' +
    '- `((cardname))` returns card pricing from TCGPlayer, and also puts the card image in the chat.\n\n' +
    'If you desire a specific set image, insert `e:SET` inside the brackets and after the card name, using ' +
    'the 3 letter set code instead of the word SET. Other syntax rules can be found at ' +
    'https://scryfall.com/docs/syntax.'
  )
}

export async function searchForCards(message: string): Promise<string> {
  const imageCards = message.match(imageRegex)
  if (imageCards) {
    return asyncReduce(
      imageCards.map(async e => fetchAndReturn(e, 1)),
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
