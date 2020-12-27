export interface ScryfallCardObject extends ScryfallCardFaceObject {
  object: string
  id: string
  oracle_id: string
  multiverse_ids: number[]
  mtgo_id: number
  mtgo_foil_id: number
  tcgplayer_id: number
  name: string
  lang: string
  uri: string
  scryfall_uri: string
  layout: string
  highres_image: boolean
  cmc: number
  card_faces?: ScryfallCardFaceObject[]
  colors?: string[]
  color_identity: string[]
  legalities: {
    standard: string
    future: string
    historic: string
    pioneer: string
    modern: string
    legacy: string
    pauper: string
    vintage: string
    penny: string
    commander: string
    brawl: string
    duel: string
    oldschool: string
  }
  games: string[]
  reserved: boolean
  foil: boolean
  nonfoil: boolean
  oversized: boolean
  promo: boolean
  reprint: boolean
  variation: boolean
  set: string
  set_name: string
  set_type: string
  set_uri: string
  scryfall_set_uri: string
  rulings_uri: string
  prints_search_uri: string
  collector_number: string
  digital: boolean
  rarity: string
  watermark: string
  flavor_text: string
  card_back_id: string
  artist: string
  artist_ids: string[]
  illustration_id: string
  border_color: string
  frame: string
  full_art: boolean
  textless: boolean
  booster: boolean
  story_spotlight: boolean
  edhrec_rank: number
  prices: {
    usd: string
    usd_foil: string
    eur: string
    tix: string
  }
  related_uris: {
    gatherer: string
    tcgplayer_decks: string
    edhrec: string
    mtgtop8: string
  }
  purchase_uris: {
    tcgplayer: string
    cardmarket: string
    cardhoarder: string
  }
}

export interface ScryfallCardFaceObject {
  mana_cost?: string
  name: string
  oracle_text?: string
  power?: string
  toughness?: string
  type_line: string
  image_uris?: {
    small: string
    normal: string
    large: string
    png: string
    art_crop: string
    border_crop: string
  }
}
