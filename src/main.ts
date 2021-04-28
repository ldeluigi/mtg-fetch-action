import * as core from '@actions/core'
import * as bot from './bot-utils'
import {context, getOctokit} from '@actions/github'
import {reduce} from './async-utils'

const ANSWER_CHAR_LIMIT = 65535

export async function run(): Promise<void> {
  try {
    const githubToken: string = core.getInput('github-token', {required: true})

    if (
      ![
        'issues',
        'issue_comment',
        'pull_request',
        'pull_request_review',
        'pull_request_review_comment'
      ].includes(context.eventName)
    ) {
      core.warning(
        `Event name is not in [issues, issue_comment, pull_request, pull_request_review, pull_request_review_comment]!`
      )
      return
    }

    if (
      !['created', 'submitted', 'opened'].includes(context.payload.action ?? '')
    ) {
      core.warning(
        `Ignoring event to avoid possible duplicates: ${context.eventName} ${context.payload.action}.\nPlease react only to created/submitted/opened events.`
      )
      return
    }

    const githubClient = getOctokit(githubToken)
    const permissionRes = await githubClient.repos.getCollaboratorPermissionLevel(
      {
        owner: context.repo.owner,
        repo: context.repo.repo,
        username: context.actor
      }
    )
    if (permissionRes.status !== 200) {
      core.error(
        `Permission check returns non-200 status: ${permissionRes.status}`
      )
      return
    }
    const actorPermission = permissionRes.data.permission
    if (!['admin', 'write', 'read'].includes(actorPermission)) {
      core.error(
        `${context.actor} does not have admin/write/read permission: ${actorPermission}`
      )
      core.info(`${context.actor} permissions: ${actorPermission}`)
      return
    }

    const body: string =
      context.eventName === 'pull_request'
        ? (context.payload as any).pull_request.body ?? ''
        : context.eventName === 'pull_request_review'
        ? (context.payload as any).review.body ?? ''
        : context.eventName === 'issue_comment' ||
          context.eventName === 'pull_request_review_comment'
        ? (context.payload as any).comment.body ?? ''
        : context.eventName === 'issues'
        ? (context.payload as any).issue.body ?? ''
        : ''
    if (body.length > 0) {
      try {
        // Add answer with result
        const answerSeparator = '\n\n'
        const answers: string[] =
          body.startsWith('Mtg Fetch Help') || body.startsWith('!mtg help')
            ? [bot.printHelp()]
            : reduce(await bot.searchForCards(body), '', (acc, it) => {
                if (acc.length === 0) {
                  return it.length <= ANSWER_CHAR_LIMIT ? it : null
                }
                return acc.length + answerSeparator.length + it.length <=
                  ANSWER_CHAR_LIMIT
                  ? acc + answerSeparator + it
                  : null
              })
        for (const answer of answers) {
          if (context.eventName === 'pull_request_review_comment') {
            if (context.payload.pull_request && context.payload.comment) {
              await githubClient.pulls.createReplyForReviewComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                comment_id: context.payload.comment.id,
                body: answer
              })
            } else {
              core.warning(
                'Could not reply to review comment because pull_request number or comment id are missing.'
              )
            }
          } else {
            await githubClient.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: answer
            })
          }
        }
      } catch (error) {
        core.setFailed(error.message)
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
