# Mtg Card Fetch Bot

This action/workflow replies to issues and pull requests and their comments with smart links to Magic the Gathering websites. Uses the standard `[[<card-name>]]` syntax plus other syntax that enable features.

**Current Build:** ![build-test](https://github.com/ldeluigi/mtg-fetch-action/workflows/build-test/badge.svg?branch=master)

## Commands for the bot

You can see the syntax handbook by commenting a issue or a pull_request with `!mtg help` or `Mtg Fetch Help`.

## How to use this action

Add `.github/workflows/mtg-card-fetch.yml` to your workflows (just copy and paste from [the source](https://github.com/ldeluigi/mtg-fetch-action/blob/master/.github/workflows/mtg-card-fetch.yml)).

Or use it in your own workflow that reacts to `issues`, `pull_request`, `issue_comment`, `pull_request_comment`:

```yaml
# .github/workflows/mtg-card-fetch.yml
name: Mtg Card Fetch Bot

on:
  issue_comment:
    types: [created]
  issues:
    types: [opened]
  pull_request:
    types: [opened]
  pull_request_review:
    type: [submitted]

jobs:
  fetch-card-references:
    name: Fetch MTG Card
    runs-on: ubuntu-latest
    steps:
      - uses: ldeluigi/mtg-fetch-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```
