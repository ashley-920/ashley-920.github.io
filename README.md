# Chi-en “Ashley” Shen — personal website

Responsive personal site for cybersecurity researcher and technical leader Chi-en “Ashley” Shen.

Live site: [ashley-920.github.io](https://ashley-920.github.io/)

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

The mobile Social section reads the latest verified original posts from
`public/social-posts.json`. GitHub Actions refreshes that file every six hours
from the public X timeline, LinkedIn authored-post data and Bluesky API while
excluding reposts. To refresh it locally:

```bash
node scripts/update-social-posts.mjs
```

## Deployment

Pushes to `main` deploy automatically to GitHub Pages through
`.github/workflows/deploy-pages.yml`.

See [CONTENT_NOTES.md](./CONTENT_NOTES.md) for sourcing and publication caveats.
