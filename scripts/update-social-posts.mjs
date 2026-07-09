import { readFile, writeFile } from 'node:fs/promises';

const outputPath = new URL('../public/social-posts.json', import.meta.url);
const profileHandle = 'ashl3y_shen';
const blueskyHandle = 'ashl3y-shen.bsky.social';
const linkedInProfile = 'ashley-shen';

const decodeEntities = (value = '') => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(Number.parseInt(value, 16)))
  .replace(/&#([0-9]+);/g, (_, value) => String.fromCodePoint(Number.parseInt(value, 10)));

const normalizeText = (value = '') => decodeEntities(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/https?:\/\/t\.co\/\S+/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const requestText = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; AshleyShenPortfolio/1.0)',
      ...headers,
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
};

const firstMatch = (value, expression) => value.match(expression)?.[1]?.trim() || '';

const fetchLatestXPost = async () => {
  const rss = await requestText(`https://nitter.net/${profileHandle}/rss`);
  const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);

  for (const item of items) {
    const creator = decodeEntities(firstMatch(item, /<dc:creator>([\s\S]*?)<\/dc:creator>/i));
    const rawTitle = firstMatch(item, /<title>([\s\S]*?)<\/title>/i);
    const text = normalizeText(rawTitle);
    if (creator !== `@${profileHandle}` || /^RT by\b/i.test(text) || /^R to @/i.test(text)) continue;

    const nitterUrl = decodeEntities(firstMatch(item, /<link>([\s\S]*?)<\/link>/i));
    const statusId = nitterUrl.match(/\/status\/(\d+)/)?.[1];
    const date = new Date(decodeEntities(firstMatch(item, /<pubDate>([\s\S]*?)<\/pubDate>/i)));
    if (!statusId || !text || Number.isNaN(date.getTime())) continue;

    return {
      platform: 'X',
      handle: `@${profileHandle}`,
      date: date.toISOString(),
      url: `https://x.com/${profileHandle}/status/${statusId}`,
      text,
    };
  }

  throw new Error('No original X post found');
};

const fetchLatestLinkedInPost = async () => {
  const html = await requestText(`https://www.linkedin.com/in/${linkedInProfile}/recent-activity/posts/`, {
    'accept-language': 'en-US,en;q=0.9',
  });
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const posts = [];

  scripts.forEach(([, source]) => {
    try {
      const value = JSON.parse(source.trim());
      const nodes = Array.isArray(value?.['@graph']) ? value['@graph'] : [value];
      nodes.forEach((node) => {
        const authorUrl = node?.author?.url || '';
        const isOwnPost = node?.['@type'] === 'DiscussionForumPosting'
          && authorUrl.includes(`/in/${linkedInProfile}`)
          && node.mainEntityOfPage
          && node.text
          && node.datePublished;
        if (isOwnPost) posts.push(node);
      });
    } catch {
      // Ignore unrelated or malformed structured-data blocks.
    }
  });

  posts.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));
  const post = posts[0];
  if (!post) throw new Error('No original LinkedIn post found');

  const firstParagraph = String(post.text).split(/\n\s*\n/).map(normalizeText).find(Boolean);
  return {
    platform: 'LinkedIn',
    handle: post.author?.name || 'Chi En (Ashley) S.',
    date: new Date(post.datePublished).toISOString(),
    url: post.mainEntityOfPage,
    text: firstParagraph || normalizeText(post.text),
  };
};

const fetchLatestBlueskyPost = async () => {
  const response = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${blueskyHandle}&filter=posts_no_replies&limit=30`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!response.ok) throw new Error(`Bluesky returned ${response.status}`);
  const { feed = [] } = await response.json();
  const item = feed.find(({ reason, post }) => !reason && post?.author?.handle === blueskyHandle);
  const record = item?.post?.record;
  const rkey = item?.post?.uri?.split('/').pop();
  if (!record?.text || !record?.createdAt || !rkey) throw new Error('No original Bluesky post found');

  return {
    platform: 'Bluesky',
    handle: `@${blueskyHandle}`,
    date: new Date(record.createdAt).toISOString(),
    url: `https://bsky.app/profile/${blueskyHandle}/post/${rkey}`,
    text: normalizeText(record.text),
  };
};

const current = JSON.parse(await readFile(outputPath, 'utf8'));
const nextPosts = { ...current.posts };
const sources = {
  x: fetchLatestXPost,
  linkedin: fetchLatestLinkedInPost,
  bluesky: fetchLatestBlueskyPost,
};

for (const [platform, load] of Object.entries(sources)) {
  try {
    nextPosts[platform] = await load();
    console.log(`Refreshed ${platform}: ${nextPosts[platform].url}`);
  } catch (error) {
    console.warn(`Keeping last verified ${platform} post: ${error.message}`);
  }
}

const previousPosts = JSON.stringify(current.posts);
const refreshedPosts = JSON.stringify(nextPosts);
if (previousPosts === refreshedPosts) {
  console.log('Social posts are already current.');
  process.exit(0);
}

await writeFile(outputPath, `${JSON.stringify({
  updatedAt: new Date().toISOString(),
  posts: nextPosts,
}, null, 2)}\n`);
console.log('Updated public/social-posts.json');
