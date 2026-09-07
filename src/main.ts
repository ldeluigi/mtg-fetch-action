import * as core from '@actions/core'
import * as bot from './bot-utils'
import {reduce} from './async-utils'
import * as github from '@actions/github'
import type {
  PullRequestEvent,
  PullRequestReviewEvent,
  IssueCommentEvent,
  PullRequestReviewCommentEvent,
  IssuesEvent
} from '@octokit/webhooks-types'

const ANSWER_CHAR_LIMIT = 65535
const ANSWER_SEPARATOR = '\n\n'
const HELP_PREFIXES = ['Mtg Fetch Help', '!mtg help']

const SUPPORTED_EVENTS = [
  'issues',
  'issue_comment',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment'
]
const SUPPORTED_ACTIONS = ['created', 'submitted', 'opened']

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Reads the user supplied text out of the event payload. */
function eventBody(): string {
  const payload = github.context.payload
  switch (github.context.eventName) {
    case 'pull_request':
      return (payload as PullRequestEvent).pull_request?.body ?? ''
    case 'pull_request_review':
      return (payload as PullRequestReviewEvent).review?.body ?? ''
    case 'issue_comment':
    case 'pull_request_review_comment':
      return (
        (payload as IssueCommentEvent | PullRequestReviewCommentEvent).comment
          ?.body ?? ''
      )
    case 'issues':
      return (payload as IssuesEvent).issue?.body ?? ''
    default:
      return ''
  }
}

/** Splits the answers into as few comments as possible, each one within the
 * GitHub comment size limit. Answers that cannot fit on their own are
 * dropped rather than posted as an empty comment. */
function buildAnswers(parts: string[]): string[] {
  return reduce(parts, '', (acc, it) => {
    if (acc.length === 0) {
      return it.length <= ANSWER_CHAR_LIMIT ? it : null
    }
    return acc.length + ANSWER_SEPARATOR.length + it.length <= ANSWER_CHAR_LIMIT
      ? acc + ANSWER_SEPARATOR + it
      : null
  }).filter(answer => answer.length > 0)
}

export async function run(): Promise<void> {
  try {
    const githubToken: string = core.getInput('github-token', {required: true})

    if (!SUPPORTED_EVENTS.includes(github.context.eventName)) {
      core.warning(`Event name is not in [${SUPPORTED_EVENTS.join(', ')}]!`)
      return
    }

    if (!SUPPORTED_ACTIONS.includes(github.context.payload.action ?? '')) {
      core.warning(
        `Ignoring event to avoid possible duplicates: ${github.context.eventName} ${github.context.payload.action}.\nPlease react only to created/submitted/opened events.`
      )
      return
    }

    const body = eventBody()
    if (body.length === 0) {
      return
    }

    const githubClient = github.getOctokit(githubToken)
    const permissionRes =
      await githubClient.rest.repos.getCollaboratorPermissionLevel({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        username: github.context.actor
      })
    if (permissionRes.status !== 200) {
      core.error(
        `Permission check returns non-200 status: ${permissionRes.status}`
      )
      return
    }
    const actorPermission = permissionRes.data.permission
    if (!['admin', 'write', 'read'].includes(actorPermission)) {
      core.error(
        `${github.context.actor} does not have admin/write/read permission: ${actorPermission}`
      )
      return
    }

    const answers = HELP_PREFIXES.some(prefix => body.startsWith(prefix))
      ? [bot.printHelp()]
      : buildAnswers(await bot.searchForCards(body))

    for (const answer of answers) {
      if (github.context.eventName === 'pull_request_review_comment') {
        if (
          github.context.payload.pull_request &&
          github.context.payload.comment
        ) {
          await githubClient.rest.pulls.createReplyForReviewComment({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: github.context.payload.pull_request.number,
            comment_id: github.context.payload.comment.id,
            body: answer
          })
        } else {
          core.warning(
            'Could not reply to review comment because pull_request number or comment id are missing.'
          )
        }
      } else {
        await githubClient.rest.issues.createComment({
          issue_number: github.context.issue.number,
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          body: answer
        })
      }
    }
  } catch (error: unknown) {
    core.setFailed(errorMessage(error))
  }
}

run()
