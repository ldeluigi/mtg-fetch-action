import * as core from '@actions/core'
import * as bot from './bot-utils'
import {reduce} from './async-utils'
import * as github from '@actions/github'
import type {
  PullRequestEvent,
  PullRequestReviewEvent,
  IssueCommentEvent,
  PullRequestReviewCommentEvent,
  CommitCommentEvent,
  IssuesEvent
} from '@octokit/webhooks-types'

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
      ].includes(github.context.eventName)
    ) {
      core.warning(
        `Event name is not in [issues, issue_comment, pull_request, pull_request_review, pull_request_review_comment]!`
      )
      return
    }

    if (
      !['created', 'submitted', 'opened'].includes(
        github.context.payload.action ?? ''
      )
    ) {
      core.warning(
        `Ignoring event to avoid possible duplicates: ${github.context.eventName} ${github.context.payload.action}.\nPlease react only to created/submitted/opened events.`
      )
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
      core.info(`${github.context.actor} permissions: ${actorPermission}`)
      return
    }

    const body: string =
      github.context.eventName === 'pull_request'
        ? (github.context.payload as PullRequestEvent).pull_request.body ?? ''
        : github.context.eventName === 'pull_request_review'
        ? (github.context.payload as PullRequestReviewEvent).review.body ?? ''
        : github.context.eventName === 'issue_comment' ||
          github.context.eventName === 'pull_request_review_comment' ||
          github.context.eventName === 'commit_comment'
        ? (
            github.context.payload as
              | IssueCommentEvent
              | PullRequestReviewCommentEvent
              | CommitCommentEvent
          ).comment.body ?? ''
        : github.context.eventName === 'issues'
        ? (github.context.payload as IssuesEvent).issue.body ?? ''
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
      } catch (error: any) {
        core.setFailed(error.message)
      }
    }
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

run()
