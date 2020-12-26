# Mtg Card Fetch Bot

**Current Build:** ![build-test](https://github.com/ldeluigi/mtg-fetch-action/workflows/build-test/badge.svg?branch=master)

## Usage

Add `.github/workflows/mtg-card-fetch.yml` to your workflows (just copy and paste from [the source](https://raw.githubusercontent.com/ldeluigi/mtg-fetch-action/master/.github/workflows/mtg-card-fetch.yml)).

Or use it in your own workflow that reacts to `issues`, `pull_request`, `issue_comment`, `pull_request_comment`:
```yaml
# .github/workflows/mtg-card-fetch.yml
name: "Mtg Fetch Cards"
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
  comment-run:
    runs-on: ubuntu-18.04
    steps:
    - uses: ldeluigi/mtg-fetch-action@v1
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
```


## Commands

You can see the syntax handbook by commenting a issue or a pull_request with `!mtg help` or `Mtg Fetch Help`.
