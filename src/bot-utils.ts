import distance from 'jaro-winkler'
import {delay} from './async-utils'
import type {
  ScryfallCardObject,
  ScryfallCardFaceObject,
  ScryfallImageUris,
  ScryfallSearchResponse
} from './scryfall-interface'

const scryfallEndpoint = 'https://api.scryfall.com/cards/search'

/** Scryfall asks clients for 50-100ms between requests, an explicit Accept
 * header and a User-Agent identifying the client. */
const scryfallRateLimit = 100
const scryfallTimeout = 15000
const scryfallHeaders = {
  Accept: 'application/json',
  'User-Agent':
    'mtg-fetch-action (+https://github.com/ldeluigi/mtg-fetch-action)'
}

type FetchMode = 'image' | 'info' | 'legality' | 'pricing'

/** Delimiters recognised in a comment body, in the order they are answered. */
const modeDelimiters: [RegExp, FetchMode][] = [
  [/(?<=\{\{)(.*?)(?=\}\})/g, 'image'],
  [/(?<=\[\[)(.*?)(?=\]\])/g, 'info'],
  [/(?<=::)(.*?)(?=::)/g, 'legality'],
  [/(?<=\(\()(.*?)(?=\)\))/g, 'pricing']
]

/**
 * Picks the image of a card. Split/flip/adventure cards carry a single image
 * at the top level, while transforming cards only have per-face images.
 */
function cardImage(
  card: ScryfallCardObject,
  size: keyof ScryfallImageUris
): string | undefined {
  return card.image_uris?.[size] ?? card.card_faces?.[0]?.image_uris?.[size]
}

/** Renders the `[(Gatherer)](...) [(Scryfall)](...)` link row, skipping the
 * sites that do not list the card. */
function cardLinks(card: ScryfallCardObject): string {
  return (
    [
      ['Gatherer', card.related_uris?.gatherer],
      ['Scryfall', card.scryfall_uri],
      ['EDHREC', card.related_uris?.edhrec]
    ] as const
  )
    .filter(([, url]) => url)
    .map(([name, url]) => `[(${name})](${url})`)
    .join(' ')
}

/** Prefixes every line with `> ` so multi-line oracle text stays quoted. */
function quote(text: string): string {
  return `> ${text.replaceAll('\n', '\n> ')}`
}

function sendPricingInfo(card: ScryfallCardObject): string {
  const url = card.purchase_uris?.tcgplayer
  const title = `${card.name} - TCGPlayer pricing`
  const heading = url ? `### [${title}](${url})` : `### ${title}`
  return `${heading}\n<img src="${cardImage(card, 'png')}" alt="${
    card.name
  }" width="300"/>`
}

function sendLegalityInfo(card: ScryfallCardObject): string {
  const legalities = Object.entries(card.legalities ?? {})
    .map(([format, legality]) => `${format}: ${legality.replaceAll('_', ' ')}`)
    .join('\n')
  return `### ${card.name} - Legalities\n${legalities}`
}

function sendCardInfo(card: ScryfallCardObject): string {
  const cardToInfo = (c: ScryfallCardFaceObject): (string | undefined)[] => [
    c.mana_cost,
    c.type_line,
    c.power && c.toughness ? `${c.power}/${c.toughness}` : undefined,
    c.loyalty ? `${c.loyalty}` : undefined,
    c.oracle_text
  ]
  const faces = card.card_faces?.length ? card.card_faces : [card]
  const info = faces
    .map(cardToInfo)
    .reduce((a, b) => a.concat(':arrows_counterclockwise:', b))

  return `**[${card.name}](${cardImage(card, 'normal')})** - ${cardLinks(
    card
  )}\n${info
    .filter((i): i is string => Boolean(i))
    .map(quote)
    .join('\n')}`
}

function sendCardImageInfo(card: ScryfallCardObject): string {
  return `## ${card.name}\n<img src="${cardImage(card, 'png')}" alt="${
    card.name
  }" width="300"/>\n\n### ${cardLinks(card)}`
}

const formatters: Record<FetchMode, (card: ScryfallCardObject) => string> = {
  image: sendCardImageInfo,
  info: sendCardInfo,
  legality: sendLegalityInfo,
  pricing: sendPricingInfo
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
  const notFound = `Unable to retrieve information for "${card}"`
  const url = `${scryfallEndpoint}?${new URLSearchParams({q: card})}`
  const startTime = Date.now()
  let scryfallResponse: ScryfallSearchResponse
  try {
    const response = await fetch(url, {
      headers: scryfallHeaders,
      signal: AbortSignal.timeout(scryfallTimeout)
    })
    scryfallResponse = (await response.json()) as ScryfallSearchResponse
  } catch {
    // Network failure or malformed body: report it like a missing card
    // instead of failing the whole run.
    return notFound
  } finally {
    // Honour the rate limit whatever the outcome of the request was.
    const waitTime = scryfallRateLimit - (Date.now() - startTime)
    if (waitTime > 0) await delay(waitTime)
  }

  const cardList = scryfallResponse.data
  if (!cardList || cardList.length === 0) {
    return notFound
  }
  return formatters[mode](pickBest(card, cardList))
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

/** Strips blank and quoted lines so the bot does not answer itself. */
export function stripQuotedLines(message: string): string {
  return message
    .split(/\r?\n/)
    .filter(l => l.length > 0 && !l.startsWith('>'))
    .join('\n')
}

export async function searchForCards(message: string): Promise<string[]> {
  const body = stripQuotedLines(message)
  const res: string[] = []
  for (const [regex, mode] of modeDelimiters) {
    for (const cardName of body.match(regex) ?? []) {
      res.push(await fetchAndReturn(cardName, mode))
    }
  }
  return res
}
