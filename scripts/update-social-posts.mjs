import { readFile, writeFile } from 'node:fs/promises';

const outputPath = new URL('../public/social-posts.json', import.meta.url);
const profileHandle = 'ashl3y_shen';
const blueskyHandle = 'ashl3y-shen.bsky.social';
const blueskyDid = 'did:plc:2fe5hyelypbdbmppxi4qmdu5';
const xBearerToken = process.env.X_BEARER_TOKEN?.trim() || '';
const manualLinkedIn = {
  url: process.env.LINKEDIN_MANUAL_URL?.trim() || '',
  date: process.env.LINKEDIN_MANUAL_DATE?.trim() || '',
  text: process.env.LINKEDIN_MANUAL_TEXT?.trim() || '',
};

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

const requestJson = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...headers,
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
};

const firstMatch = (value, expression) => value.match(expression)?.[1]?.trim() || '';

const fetchLatestXApiPost = async () => {
  if (!xBearerToken) throw new Error('X_BEARER_TOKEN is not configured');

  const headers = { authorization: `Bearer ${xBearerToken}` };
  const user = await requestJson(
    `https://api.x.com/2/users/by/username/${profileHandle}`,
    headers,
  );
  const userId = user?.data?.id;
  if (!userId) throw new Error('X user lookup returned no user ID');

  const timeline = await requestJson(
    `https://api.x.com/2/users/${userId}/tweets?exclude=retweets,replies&max_results=5&tweet.fields=created_at`,
    headers,
  );
  const post = timeline?.data?.find(({ id, text, created_at: createdAt }) => id && text && createdAt);
  if (!post) throw new Error('X API returned no original post');

  return {
    platform: 'X',
    handle: `@${profileHandle}`,
    date: new Date(post.created_at).toISOString(),
    url: `https://x.com/${profileHandle}/status/${post.id}`,
    text: normalizeText(post.text),
    source: 'x-api',
  };
};

const fetchLatestXNitterPost = async () => {
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
      source: 'nitter-fallback',
    };
  }

  throw new Error('No original X post found');
};

const fetchLatestXPost = async () => {
  const failures = [];

  if (xBearerToken) {
    try {
      return await fetchLatestXApiPost();
    } catch (error) {
      failures.push(`X API: ${error.message}`);
    }
  }

  try {
    return await fetchLatestXNitterPost();
  } catch (error) {
    failures.push(`RSS fallback: ${error.message}`);
  }

  throw new Error(failures.join('; ') || 'No X source available');
};

const fetchLatestLinkedInPost = async () => {
  if (!manualLinkedIn.url && !manualLinkedIn.date && !manualLinkedIn.text) {
    throw new Error('LinkedIn has no public personal-post feed; use the workflow form for a new authored post');
  }
  if (!manualLinkedIn.url.startsWith('https://www.linkedin.com/posts/')) {
    throw new Error('LinkedIn URL must start with https://www.linkedin.com/posts/');
  }
  const date = new Date(manualLinkedIn.date);
  if (Number.isNaN(date.getTime())) throw new Error('LinkedIn date is invalid');
  const text = normalizeText(manualLinkedIn.text);
  if (!text) throw new Error('LinkedIn text is empty');

  return {
    platform: 'LinkedIn',
    handle: 'Chi En (Ashley) S.',
    date: date.toISOString(),
    url: manualLinkedIn.url,
    text,
    source: 'manual-verified',
  };
};

const fetchLatestBlueskyPost = async () => {
  const response = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${blueskyHandle}&filter=posts_no_replies&limit=30`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!response.ok) throw new Error(`Bluesky returned ${response.status}`);
  const { feed = [] } = await response.json();
  const item = feed.find(({ reason, post }) => (
    !reason
    && post?.author?.did === blueskyDid
    && !post?.record?.reply
  ));
  const record = item?.post?.record;
  const rkey = item?.post?.uri?.split('/').pop();
  if (!record?.text || !record?.createdAt || !rkey) throw new Error('No original Bluesky post found');

  return {
    platform: 'Bluesky',
    handle: `@${blueskyHandle}`,
    date: new Date(record.createdAt).toISOString(),
    url: `https://bsky.app/profile/${blueskyHandle}/post/${rkey}`,
    text: normalizeText(record.text),
    source: 'bluesky-public-api',
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
    const candidate = await load();
    const previousDate = new Date(nextPosts[platform]?.date || 0);
    const candidateDate = new Date(candidate.date);
    if (!Number.isNaN(previousDate.getTime()) && candidateDate < previousDate) {
      throw new Error(`source returned an older post (${candidate.date})`);
    }
    nextPosts[platform] = candidate;
    console.log(`Refreshed ${platform} via ${candidate.source}: ${candidate.url}`);
  } catch (error) {
    console.warn(`Keeping last verified ${platform} post: ${error.message}`);
    if (process.env.GITHUB_ACTIONS) {
      const message = String(error.message).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
      console.log(`::warning title=${platform} feed kept last verified post::${message}`);
    }
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
