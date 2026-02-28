# CardStoard — Claude Workflow Guidelines

## Local Development
- **Full local rebuild + smoke test:** `./utils/deploy-local-dev.sh`
- **Rebuild only:** `./utils/deploy-local-dev.sh --deploy`
- **Validate only:** `./utils/deploy-local-dev.sh --check`
- Backend: `http://localhost:8000`, Frontend: `http://localhost:3000`
- Hot reload is active for both frontend and backend via volume mounts
- Env vars sourced from `~/.cardstoard.env` if present


## Branching
- **Always create a branch before making changes.** Never commit directly to `main`.
- Branch naming: `feature/<description>`, `fix/<description>`, `dev/v<version>-<description>`
- Merge to `main` only when the work is tested and ready.

## Testing Before Deploy
- **Always test locally before deploying to production.**
- Run the local dev environment and verify the change works as expected.
- Only proceed to prod deploy after the user confirms local testing looks good.

## Production Deploy
- **Never deploy to production without explicit user instruction.** Do not auto-deploy after a commit or merge.
- Deploy command (run from project root): `./utils/deploy-ec2-prod.sh`
  - Full deploy (backup + rebuild + restore + smoke test): `./utils/deploy-ec2-prod.sh`
  - Rebuild only, skip validation: `./utils/deploy-ec2-prod.sh --deploy`
  - Smoke test / validation only: `./utils/deploy-ec2-prod.sh --check`
- EC2 host: `ubuntu@3.221.77.22`, SSH key: `~/.ssh/id_rsa`

## Commit Style
- Use concise conventional commit messages focused on the "why"
- Always include the Co-Authored-By footer:
  ```
  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  ```
- Pass commit messages via heredoc to preserve formatting
