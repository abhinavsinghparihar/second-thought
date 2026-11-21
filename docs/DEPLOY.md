# Deployment guide

Nothing here has been run for you. Every step that publishes needs your approval.

## 0. Before anything: rebuild and test (needs network)
```bash
npm ci
npm run verify            # typecheck + tests + build
npm run package           # extension/second-thought-extension.zip
```
Confirm `unzip -l extension/second-thought-extension.zip` shows `manifest.json` at the root.

## 1. Git
```bash
git remote add origin https://github.com/abhinavsinghparihar/second-thought.git   # if missing
git fetch origin
git status
git merge origin/main        # reconcile; resolve conflicts by hand. NEVER force-push.
git add -A && git commit -m "Prepare v0.3.0 launch"
git push origin main
```

## 2. GitHub Release (this makes the Download button work)
1. Tag `v0.3.0` and create a Release from `docs/RELEASE-NOTES-v0.3.0.md`.
2. Attach `second-thought-extension.zip` with exactly that name.
3. Do NOT tick "pre-release": GitHub's `/releases/latest/download/...` URL ignores pre-releases and would 404. The notes say it is a beta.
4. Verify: open `https://github.com/abhinavsinghparihar/second-thought/releases/latest/download/second-thought-extension.zip` and confirm the ZIP downloads.

## 3. Netlify
1. Netlify → Add new site → Import from GitHub → this repo.
2. `netlify.toml` already sets publish dir `site` and runs `scripts/inject-site-url.mjs`, which writes your Netlify URL into the canonical/Open Graph tags.
3. Deploy, then check the home page, the download button, the guide anchor, a bad URL (404 page) and the response headers.
4. If you add a custom domain, set env `SITE_URL=https://your-domain` and redeploy.

## Update flow
Bump the version in `package.json`, `extension/package.json`, `extension/public/manifest.json` and the site text, rebuild, make a new tag and Release with the same asset name.
