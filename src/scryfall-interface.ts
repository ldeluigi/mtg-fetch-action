/** Subset of https://scryfall.com/docs/api/cards used by this action. */
export interface ScryfallCardObject extends ScryfallCardFaceObject {
  object: string
  id: string
  oracle_id: string
  multiverse_ids?: number[]
  name: string
  lang: string
  uri: string
  scryfall_uri: string
  layout: string
  cmc: number
  card_faces?: ScryfallCardFaceObject[]
  colors?: string[]
  color_identity: string[]
  /** Format name -> legality, e.g. `{standard: 'not_legal'}`. Scryfall adds
   * new formats over time, so this is intentionally not a closed set. */
  legalities: Record<string, string>
  set: string
  set_name: string
  rarity: string
  prices?: {
    usd?: string | null
    usd_foil?: string | null
    eur?: string | null
    tix?: string | null
  }
  related_uris?: {
    gatherer?: string
    tcgplayer_infinite_articles?: string
    tcgplayer_infinite_decks?: string
    edhrec?: string
  }
  purchase_uris?: {
    tcgplayer?: string
    cardmarket?: string
    cardhoarder?: string
  }
}

export interface ScryfallCardFaceObject {
  mana_cost?: string
  name: string
  oracle_text?: string
  power?: string
  toughness?: string
  type_line?: string
  loyalty?: string
  image_uris?: ScryfallImageUris
}

export interface ScryfallImageUris {
  small?: string
  normal?: string
  large?: string
  png?: string
  art_crop?: string
  border_crop?: string
}

/** A `/cards/search` response: a card list on success, an error object
 * (with no `data`) when nothing matched. */
export interface ScryfallSearchResponse {
  object: string
  total_cards?: number
  data?: ScryfallCardObject[]
  details?: string
}
