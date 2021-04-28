import * as process from 'process'
import * as bot from '../src/bot-utils'
import {run as testMain} from '../src/main'

test(
  'Test for a card in gatherer',
  async () => {
    let res = await bot.searchForCards('[[Aluren]]')
    expect(res.length).toBeGreaterThan(1)
  },
  30 * 1000 // ms
)

// tests main with an empty event
test('test runs', async () => {
  process.env['INPUT_GITHUB-TOKEN'] = 'token'
  await testMain()
})
