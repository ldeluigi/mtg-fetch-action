import * as core from '@actions/core'
import * as bot from './bot-utils'
import {context, getOctokit} from '@actions/github'

async function run(): Promise<void> {
  try {
    const githubToken: string = core.getInput('github-token', {required: true})

    if (
      !['issues', 'issue_comment', 'pull_request'].includes(context.eventName)
    ) {
      core.warning(
        `Event name is not in [issues, issue_comment, pull_request]!`
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
    if (!['admin', 'write'].includes(actorPermission)) {
      core.error(
        `${context.actor} does not have admin/write permission: ${actorPermission}`
      )
      return
    }

    const body: string =
      context.eventName === 'pull_request'
        ? (context.payload as any).pull_request.body
        : context.eventName === 'issue_comment'
        ? (context.payload as any).comment.body
        : context.eventName === 'issues'
        ? (context.payload as any).issue.body
        : ''
    if (body.length > 0) {
      try {
        // Add :eyes: reaction
        // const reactionRes = await (context.eventName === 'pull_request'
        //   ? githubClient.reactions.createForIssue({
        //       issue_number: context.issue.number, // (context.payload as any).pull_request.number,
        //       content: 'eyes',
        //       owner: context.repo.owner,
        //       repo: context.repo.repo
        //     })
        //   : context.eventName === 'issue_comment'
        //   ? githubClient.reactions.createForIssueComment({
        //       comment_id: (context.payload as any).comment.id,
        //       content: 'eyes',
        //       owner: context.repo.owner,
        //       repo: context.repo.repo
        //     })
        //   : context.eventName === 'issues'
        //   ? githubClient.reactions.createForIssue({
        //       issue_number: context.issue.number,
        //       content: 'eyes',
        //       owner: context.repo.owner,
        //       repo: context.repo.repo
        //     })
        //   : Promise.resolve(null))
        // if (!reactionRes?.data.id) {
        //   throw new Error('Malformed response: response.data.id not found.')
        // }

        // Add answer with result
        const answer: string = await (body.startsWith('Mtg Fetcher Help') ||
        body.startsWith('!mtg help')
          ? bot.printHelp()
          : bot.searchForCards(body))
        if (answer.length > 0) {
          await (context.eventName === 'pull_request'
            ? githubClient.reactions.createForIssue({
                issue_number: context.issue.number, // (context.payload as any).pull_request.number,
                content: '+1',
                owner: context.repo.owner,
                repo: context.repo.repo
              })
            : context.eventName === 'issue_comment'
            ? githubClient.reactions.createForIssueComment({
                comment_id: (context.payload as any).comment.id,
                content: '+1',
                owner: context.repo.owner,
                repo: context.repo.repo
              })
            : context.eventName === 'issues'
            ? githubClient.reactions.createForIssue({
                issue_number: context.issue.number,
                content: '+1',
                owner: context.repo.owner,
                repo: context.repo.repo
              })
            : Promise.resolve(null))
          await githubClient.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: answer
          })
        }
        // await (context.eventName === 'pull_request'
        //   ? githubClient.reactions.deleteForIssue({
        //       reaction_id: reactionRes.data.id,
        //       issue_number: context.issue.number,
        //       owner: context.repo.owner,
        //       repo: context.repo.repo
        //     })
        //   : context.eventName === 'issue_comment'
        //   ? githubClient.reactions.deleteForIssueComment({
        //       reaction_id: reactionRes.data.id,
        //       comment_id: (context.payload as any).comment.id,
        //       owner: context.repo.owner,
        //       repo: context.repo.repo
        //     })
        //   : context.eventName === 'issues'
        //   ? githubClient.reactions.deleteForIssue({
        //       reaction_id: reactionRes.data.id,
        //       issue_number: context.issue.number,
        //       owner: context.repo.owner,
        //       repo: context.repo.repo
        //     })
        //   : Promise.resolve(null))
      } catch (error) {
        core.setFailed(error.message)
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
