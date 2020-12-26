import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as bot from '../src/bot-utils'

test(
  'Test for a card in gatherer',
  async () => {
    let res = await bot.searchForCards('[[Aluren]]')
    expect(res.length).toBeGreaterThan(1)
  },
  30 * 1000
)

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_GITHUB-TOKEN'] = 'token'
  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileSyncOptions = {
    env: process.env
  }
  cp.execFileSync(np, [ip], options)
})
