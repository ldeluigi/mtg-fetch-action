# Mtg Card Fetch Bot

This action/workflow replies to issues, pull requests and their respective comments with smart links to Magic the Gathering resources. Uses the standard `[[<card-name>]]` for the default output or some other syntax that enable special features like image previews, card prices or legality info.

**Current Build:** ![build-test](https://github.com/ldeluigi/mtg-fetch-action/workflows/build-test/badge.svg?branch=master)

## Commands for the bot

You can see the syntax handbook by commenting a issue or a pull_request with `!mtg help` or `Mtg Fetch Help`.

## How to use this action

Add `.github/workflows/mtg-card-fetch.yml` to your workflows (just copy and paste from [the source](https://github.com/ldeluigi/mtg-fetch-action/blob/master/.github/workflows/mtg-card-fetch.yml)).

Or use it in your own workflow that reacts to `issues`, `pull_request`, `issue_comment`, `pull_request_review`, `pull_request_review_comment`:

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
    types: [submitted]
  pull_request_review_comment:
    types: [created]

jobs:
  fetch-card-references:
    name: Fetch MTG Card
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    steps:
      - uses: ldeluigi/mtg-fetch-action@v1
```

## Quick reference

- `[[cardname]]` returns card information from gatherer and other websites in the chat.
- `{{cardname}}` returns card information from gatherer, and also puts the card image in the chat.
- `::cardname::` returns card format legality information.
- `((cardname))` returns card pricing from TCGPlayer, and also puts the card image in the chat.

If you desire a specific set image, insert `e:SET` inside the brackets and after the card name, using the 3 letter set code instead of the word SET. Other syntax rules can be found at https://scryfall.com/docs/syntax.
