import fetch from 'node-fetch'
import {ScryfallCardObject, ScryfallCardFaceObject} from './scryfall-interface'
import distance from 'jaro-winkler'
import * as core from '@actions/core'
import {delay} from './async-utils'

const scryfallEndpoint = 'https://api.scryfall.com/cards/search?q='
const imageRegex = new RegExp(/(?<=\{\{)(.*?)(?=\}\})/g)
const gathererRegex = new RegExp(/(?<=\[\[)(.*?)(?=\]\])/g)
const legalityRegex = new RegExp(/(?<=::)(.*?)(?=::)/g)
const pricingRegex = new RegExp(/(?<=\(\()(.*?)(?=\)\))/g)
const scryfallRateLimit = 100

const enum FetchMode {
  IMAGE,
  INFO,
  LEGALITY,
  PRICING
}

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

  for (const [i, card] of cardList.entries()) {
    const num = distance(card.name.toLowerCase(), cardName.toLowerCase())
    if (num > max) {
      max = num
      index = i
    }
  }

  return cardList[index]
}

async function fetchAndReturn(card: string, mode: FetchMode): Promise<string> {
  const encoded = encodeURI(card)
  const startTime = Date.now()
  const response = await fetch(scryfallEndpoint + encoded)
  const endTime = Date.now()
  const waitTime = scryfallRateLimit - (endTime - startTime)
  if (waitTime > 0) await delay(waitTime)
  core.info(`Request done at ${new Date()}`)
  const scryfallResponse = await response.json()
  const cardList = scryfallResponse.data
  if (cardList != null) {
    const cardToSend = pickBest(card, cardList)
    switch (mode) {
      case FetchMode.IMAGE:
        return sendCardImageInfo(cardToSend)
      case FetchMode.INFO:
        return sendCardInfo(cardToSend)
      case FetchMode.LEGALITY:
        return sendLegalityInfo(cardToSend)
      case FetchMode.PRICING:
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

export async function searchForCards(message: string): Promise<string[]> {
  const res: string[] = []
  const imageCards = message.match(imageRegex)
  if (imageCards) {
    for (const e of imageCards) {
      res.push(await fetchAndReturn(e, FetchMode.IMAGE))
    }
  }

  const gathererCards = message.match(gathererRegex)
  if (gathererCards) {
    for (const e of gathererCards) {
      res.push(await fetchAndReturn(e, FetchMode.INFO))
    }
  }

  const legalityCards = message.match(legalityRegex)
  if (legalityCards) {
    for (const e of legalityCards) {
      res.push(await fetchAndReturn(e, FetchMode.LEGALITY))
    }
  }

  const pricingCards = message.match(pricingRegex)
  if (pricingCards) {
    for (const e of pricingCards) {
      res.push(await fetchAndReturn(e, FetchMode.PRICING))
    }
  }
  return res
}
