import * as process from 'process'
import * as bot from '../src/bot-utils'
import {reduce} from '../src/async-utils'
import {run as testMain} from '../src/main'
import type {ScryfallCardObject} from '../src/scryfall-interface'

jest.mock('@actions/core')

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function respondWith(payload: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => payload
  })
}

function card(overrides: Partial<ScryfallCardObject>): ScryfallCardObject {
  return {
    object: 'card',
    id: 'id',
    oracle_id: 'oracle',
    name: 'Aluren',
    lang: 'en',
    uri: 'https://api.scryfall.com/cards/id',
    scryfall_uri: 'https://scryfall.com/card/tmp/1/aluren',
    layout: 'normal',
    cmc: 4,
    color_identity: ['G'],
    legalities: {legacy: 'legal', modern: 'not_legal'},
    set: 'tmp',
    set_name: 'Tempest',
    rarity: 'rare',
    mana_cost: '{2}{G}{G}',
    type_line: 'Enchantment',
    image_uris: {normal: 'https://img/normal.jpg', png: 'https://img/card.png'},
    related_uris: {
      gatherer: 'https://gatherer/aluren',
      edhrec: 'https://edhrec/aluren'
    },
    purchase_uris: {tcgplayer: 'https://tcg/aluren'},
    ...overrides
  }
}

describe('reduce', () => {
  it('packs items into as few accumulators as possible', () => {
    const join = (acc: string, it: string): string | null => {
      const next = acc.length === 0 ? it : `${acc},${it}`
      return next.length <= 5 ? next : null
    }
    expect(reduce(['a', 'b', 'c', 'd'], '', join)).toEqual(['a,b,c', 'd'])
  })

  it('drops items that do not fit on their own', () => {
    const join = (acc: string, it: string): string | null =>
      it.length > 3 ? null : acc + it
    expect(reduce(['toolong'], '', join)).toEqual([''])
  })
})

describe('stripQuotedLines', () => {
  it('removes quoted and blank lines so the bot ignores its own replies', () => {
    expect(bot.stripQuotedLines('> quoted\n\nkept\n> more')).toEqual('kept')
  })
})

describe('printHelp', () => {
  it('documents every delimiter', () => {
    const help = bot.printHelp()
    for (const token of ['[[cardname]]', '{{cardname}}', '::cardname::']) {
      expect(help).toContain(token)
    }
  })
})

describe('searchForCards', () => {
  it('quotes every line of multi-line oracle text', async () => {
    respondWith({
      object: 'list',
      data: [card({oracle_text: 'First line.\nSecond line.\nThird line.'})]
    })
    const [answer] = await bot.searchForCards('[[Aluren]]')
    expect(answer).toContain('> First line.\n> Second line.\n> Third line.')
    expect(answer).not.toContain('\nSecond line.')
  })

  it('sends the request as a properly encoded query parameter', async () => {
    respondWith({object: 'list', data: [card({})]})
    await bot.searchForCards('[[Fire // Ice e:apc&foo]]')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toEqual(
      'https://api.scryfall.com/cards/search?q=Fire+%2F%2F+Ice+e%3Aapc%26foo'
    )
  })

  it('falls back to the top level image for split cards', async () => {
    respondWith({
      object: 'list',
      data: [
        card({
          layout: 'split',
          image_uris: {png: 'https://img/split.png'},
          card_faces: [{name: 'Fire'}, {name: 'Ice'}]
        })
      ]
    })
    const [answer] = await bot.searchForCards('{{Fire // Ice}}')
    expect(answer).toContain('https://img/split.png')
    expect(answer).not.toContain('undefined')
  })

  it('uses the first face image for transforming cards', async () => {
    respondWith({
      object: 'list',
      data: [
        card({
          layout: 'transform',
          image_uris: undefined,
          card_faces: [
            {name: 'Delver of Secrets', image_uris: {png: 'https://img/a.png'}},
            {
              name: 'Insectile Aberration',
              image_uris: {png: 'https://img/b.png'}
            }
          ]
        })
      ]
    })
    const [answer] = await bot.searchForCards('{{Delver of Secrets}}')
    expect(answer).toContain('https://img/a.png')
  })

  it('omits links for sites that do not list the card', async () => {
    respondWith({object: 'list', data: [card({related_uris: {}})]})
    const [answer] = await bot.searchForCards('{{Aluren}}')
    expect(answer).toContain('[(Scryfall)]')
    expect(answer).not.toContain('Gatherer')
    expect(answer).not.toContain('undefined')
  })

  it('renders legalities with readable labels', async () => {
    respondWith({object: 'list', data: [card({})]})
    const [answer] = await bot.searchForCards('::Aluren::')
    expect(answer).toContain('legacy: legal')
    expect(answer).toContain('modern: not legal')
  })

  it('renders pricing with the TCGPlayer link', async () => {
    respondWith({object: 'list', data: [card({})]})
    const [answer] = await bot.searchForCards('((Aluren))')
    expect(answer).toContain('https://tcg/aluren')
    expect(answer).toContain('https://img/card.png')
  })

  it('reports a helpful message when nothing matched', async () => {
    respondWith({object: 'error', details: 'No cards found'})
    const [answer] = await bot.searchForCards('[[Not A Real Card]]')
    expect(answer).toEqual(
      'Unable to retrieve information for "Not A Real Card"'
    )
  })

  it('does not fail the run when the request errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    const [answer] = await bot.searchForCards('[[Aluren]]')
    expect(answer).toEqual('Unable to retrieve information for "Aluren"')
  })

  it('ignores card references inside quoted lines', async () => {
    expect(await bot.searchForCards('> [[Aluren]]')).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('run', () => {
  it('returns without posting anything for an empty event', async () => {
    process.env['INPUT_GITHUB-TOKEN'] = 'token'
    await expect(testMain()).resolves.toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
