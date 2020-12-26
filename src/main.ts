import * as core from '@actions/core'
import * as bot from './bot-utils'

async function run(): Promise<void> {
  try {
    const body: string = core.getInput('body')
    core.info(`body = ${body}`) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    core.info(await bot.searchForCards(body))
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
