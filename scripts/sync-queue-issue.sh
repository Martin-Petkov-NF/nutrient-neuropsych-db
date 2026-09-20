#!/usr/bin/env bash
# Keeps exactly one standing "Review queue" issue in step with the data.
#
# Opens it when entries are waiting, updates it in place when the list changes,
# and closes it when the queue empties. Assigns the code owners so the
# notification reaches a person rather than sitting on a page nobody opens.
#
# Expects /tmp/queue.md to hold the body, and GH_TOKEN in the environment.

set -euo pipefail

TITLE="Review queue: entries nobody has read yet"
LABEL="review queue"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY not set}"
BODY_FILE="${1:-/tmp/queue.md}"

COUNT=$(node scripts/review-queue.mjs --count)
EXISTING=$(gh issue list --repo "$REPO" --state open --label "$LABEL" --limit 1 --json number --jq '.[0].number // empty')

if [ "$COUNT" -eq 0 ]; then
  if [ -n "$EXISTING" ]; then
    gh issue comment "$EXISTING" --repo "$REPO" --body "The queue is empty. Everything in the database has been read and verified. This will reopen automatically when something new arrives."
    gh issue close "$EXISTING" --repo "$REPO" --reason completed
    echo "Queue empty, closed #$EXISTING"
  else
    echo "Queue empty, nothing to do"
  fi
  exit 0
fi

OWNERS=$(grep -hoE '@[A-Za-z0-9-]+' .github/CODEOWNERS 2>/dev/null | tr -d '@' | sort -u | tr '\n' ',' | sed 's/,$//' || true)

if [ -n "$EXISTING" ]; then
  gh issue edit "$EXISTING" --repo "$REPO" --body-file "$BODY_FILE"
  echo "Updated #$EXISTING, $COUNT waiting"
else
  # Take the number straight from the URL. Re-querying the issue list races
  # against GitHub's indexing and silently returned nothing the first time.
  NEW=$(gh issue create --repo "$REPO" --title "$TITLE" --label "$LABEL" --body-file "$BODY_FILE" | tail -1)
  EXISTING="${NEW##*/}"
  echo "Opened $NEW, $COUNT waiting"
fi

if [ -n "$OWNERS" ] && [ -n "$EXISTING" ]; then
  gh issue edit "$EXISTING" --repo "$REPO" --add-assignee "$OWNERS" || true
fi
