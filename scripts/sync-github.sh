#!/usr/bin/env bash
#
# Publish `main` to the GitHub mirror (remote `github`, branch `main`).
#
# Why this exists: an early commit from the company base template contained
# a real Anthropic API key, so GitHub push protection rejects `main`'s
# history. GitHub instead holds a rewritten copy (local branch `github-main`)
# with that one line scrubbed. Its commit IDs differ from `main`, so a plain
# `git push github main` will always be rejected.
#
# What it does (never touches your checkout or uncommitted files):
#   1. takes the committed files of `main` (its tree)
#   2. refuses if they contain anything that looks like a secret
#   3. adds ONE commit on top of `github-main` with exactly that tree,
#      listing the `main` commits it includes
#   4. pushes it to github/main and records how far `main` was synced
#
# Usage:  scripts/sync-github.sh           (dry run: shows what would sync)
#         scripts/sync-github.sh --push    (does it)
set -euo pipefail

SOURCE=main
MIRROR=github-main
REMOTE=github
LAST_REF=refs/sync/github-last   # last `main` commit published

cd "$(git rev-parse --show-toplevel)"

git rev-parse -q --verify "$MIRROR" >/dev/null || { echo "Missing local branch '$MIRROR'."; exit 1; }
last=$(git rev-parse -q --verify "$LAST_REF" || true)
[ -n "$last" ] || { echo "Missing $LAST_REF (the last synced main commit)."; exit 1; }

src=$(git rev-parse "$SOURCE")
if [ "$src" = "$last" ]; then echo "Nothing to sync: $SOURCE is already published."; exit 0; fi

# Fail closed on anything secret-shaped in the files being published.
if git grep -nIE 'sk-ant-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[bp]-[A-Za-z0-9-]{10,}' "$src" -- . >/dev/null; then
  echo "ABORT: $SOURCE contains something that looks like a secret:"
  git grep -nlIE 'sk-ant-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[bp]-[A-Za-z0-9-]{10,}' "$src" -- .
  exit 1
fi

echo "Commits on $SOURCE since last sync:"
git log --oneline "$last..$src"

if [ "${1:-}" != "--push" ]; then
  echo; echo "Dry run. Re-run with --push to publish."; exit 0
fi

msg=$(printf 'Sync from %s %s\n\n%s\n\nSynced-From: %s\n' \
  "$SOURCE" "$(git rev-parse --short "$src")" "$(git log --format='- %s (%h)' "$last..$src")" "$src")
new=$(git commit-tree "$(git rev-parse "$src^{tree}")" -p "$MIRROR" -m "$msg")

git push "$REMOTE" "$new:refs/heads/main"
git update-ref "refs/heads/$MIRROR" "$new"
git update-ref "$LAST_REF" "$src"
echo "Published $SOURCE $(git rev-parse --short "$src") to $REMOTE/main as $(git rev-parse --short "$new")."
