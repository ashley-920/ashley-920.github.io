# Chi-en “Ashley” Shen — personal website

Responsive personal site for cybersecurity researcher and technical leader Chi-en “Ashley” Shen.

Live site: [ashley.hacksbetweenus.com](https://ashley.hacksbetweenus.com/)

## Run locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Site features

- Responsive desktop/mobile layout
- Interactive research filters and expandable archives
- Sourced authored publications and cited research
- Public-speaking archive from 2015 through upcoming 2026 events
- Podcast, interview/news and verified video indexes
- Community and conference-review roles
- Photo gallery and social-media highlights

## Social post refresh

Desktop and mobile Social cards read the same verified posts from
`public/social-posts.json`. The scheduled GitHub Action runs every six hours:

- Bluesky refreshes through its public API and is also checked directly by the
  browser when the page loads.
- X uses the official API when the repository has an `X_BEARER_TOKEN` Actions
  secret. Without that secret, the updater attempts a best-effort public RSS
  fallback and keeps the last verified original post if the fallback is down.
- LinkedIn does not provide a public personal-post feed. To replace its card,
  open **Actions → Refresh social posts → Run workflow** and provide the URL,
  publication date and text of a new authored post. This avoids displaying
  reposts and avoids unreliable or unauthorized profile scraping.

To refresh locally:

```bash
node scripts/update-social-posts.mjs
```

To configure reliable X updates with an X developer bearer token:

```bash
gh secret set X_BEARER_TOKEN --repo ashley-920/ashley-920.github.io
```

## Event rollover

Upcoming-event rows and marquee links carry ISO 8601 `data-event-start` and
`data-event-end` timestamps. `main.js` checks those timestamps on page load,
hourly, and whenever a visitor returns to the tab. Expired appearances are
hidden automatically and the next visible event is promoted to `UP NEXT`.

Add completed appearances to the Speaking section when publishing a site
update so the historical archive remains useful. A future data-file and
scheduled-build refactor could automate that archival step as well.

## Deployment

Pushes to `main` deploy automatically to GitHub Pages through
`.github/workflows/deploy-pages.yml`.

See [CONTENT_NOTES.md](./CONTENT_NOTES.md) for sourcing and publication caveats.
