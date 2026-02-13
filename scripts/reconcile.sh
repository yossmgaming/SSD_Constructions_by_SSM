#!/usr/bin/env bash
set -euo pipefail
REMOTE_URL="${1:-origin}"
MAIN_BRANCH="main"

echo "Repository: $(pwd)"

echo "Fetching from $REMOTE_URL..."
git fetch "$REMOTE_URL"

# create backup branch for current local HEAD
SHA=$(git rev-parse --short HEAD)
BACKUP_BRANCH="backup-local-${SHA}"
if git show-ref --verify --quiet "refs/heads/${BACKUP_BRANCH}"; then
  echo "Backup branch ${BACKUP_BRANCH} already exists locally."
else
  git branch "${BACKUP_BRANCH}"
  echo "Created backup branch ${BACKUP_BRANCH}."
fi

# push backup to remote
if git ls-remote --exit-code --heads "$REMOTE_URL" "refs/heads/${BACKUP_BRANCH}" >/dev/null 2>&1; then
  echo "Backup branch ${BACKUP_BRANCH} already exists on remote."
else
  echo "Pushing backup branch ${BACKUP_BRANCH} to $REMOTE_URL..."
  git push -u "$REMOTE_URL" "${BACKUP_BRANCH}"
fi

# switch to main and rebase local commits onto remote/main
git checkout "${MAIN_BRANCH}"

echo "Rebasing local ${MAIN_BRANCH} onto ${REMOTE_URL}/${MAIN_BRANCH}..."
# perform rebase
git pull --rebase "$REMOTE_URL" "${MAIN_BRANCH}"

echo "Rebase complete. Pushing ${MAIN_BRANCH} to $REMOTE_URL..."
# push changes
git push "$REMOTE_URL" "${MAIN_BRANCH}"

echo "Done. If there were conflicts during rebase, you must resolve them, run 'git rebase --continue' and then push."