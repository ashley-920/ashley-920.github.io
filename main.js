const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const researchGrid = document.querySelector('[data-research-grid]');
const archiveToggle = document.querySelector('[data-archive-toggle]');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const researchCards = [...document.querySelectorAll('.research-card')];
const featureResearch = document.querySelector('.research-feature');
const featuredResearch = document.querySelector('[data-featured-research]');
const featuredResearchCards = [...document.querySelectorAll('.research-card-featured')];
const researchCarousel = document.querySelector('[data-mobile-carousel][data-carousel-label="Research"]');
const referenceGrid = document.querySelector('.research-reference-grid');
const referenceToggle = document.querySelector('[data-reference-toggle]');
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const galleryGrid = document.querySelector('[data-gallery-grid]');
const galleryToggle = document.querySelector('[data-gallery-toggle]');
const galleryItems = [...document.querySelectorAll('[data-gallery-item]')];
const galleryDialog = document.querySelector('[data-gallery-dialog]');
const galleryDialogImage = galleryDialog?.querySelector('figure img');
const galleryDialogCaption = galleryDialog?.querySelector('figcaption');
const socialPostCards = [...document.querySelectorAll('[data-social-platform]')];
const mobileViewport = window.matchMedia('(max-width: 640px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeGalleryIndex = 0;

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const socialDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const applySocialPost = (platform, post) => {
  if (!post?.url || !post?.text || !post?.date) return;

  const date = new Date(post.date);
  socialPostCards
    .filter((card) => card.dataset.socialPlatform === platform)
    .forEach((card) => {
      const time = card.querySelector('[data-social-date]');
      const text = card.querySelector('[data-social-text]');
      const handle = card.querySelector('[data-social-handle]');

      card.href = post.url;
      if (text) text.textContent = post.text;
      if (handle) handle.textContent = post.handle || '';
      if (!Number.isNaN(date.getTime()) && time) {
        time.dateTime = post.date.slice(0, 10);
        time.textContent = socialDateFormatter.format(date).toUpperCase();
      }
    });
};

const fetchLatestBlueskyPost = async () => {
  const handle = 'ashl3y-shen.bsky.social';
  const did = 'did:plc:2fe5hyelypbdbmppxi4qmdu5';
  const endpoint = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed');
  endpoint.search = new URLSearchParams({
    actor: handle,
    filter: 'posts_no_replies',
    limit: '30',
  });

  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Bluesky feed request failed: ${response.status}`);
  const { feed = [] } = await response.json();
  const item = feed.find(({ reason, post }) => !reason && post?.author?.did === did && !post?.record?.reply);
  const record = item?.post?.record;
  const rkey = item?.post?.uri?.split('/').pop();
  if (!record?.text || !record?.createdAt || !rkey) throw new Error('No original Bluesky post found');

  return {
    platform: 'Bluesky',
    handle: `@${handle}`,
    date: new Date(record.createdAt).toISOString(),
    url: `https://bsky.app/profile/${handle}/post/${rkey}`,
    text: record.text.replace(/\s+/g, ' ').trim(),
  };
};

const updateSocialPosts = async () => {
  if (!socialPostCards.length) return;

  let storedPosts = {};
  try {
    const response = await fetch(new URL('social-posts.json', document.baseURI), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Social feed request failed: ${response.status}`);
    ({ posts: storedPosts = {} } = await response.json());
    Object.entries(storedPosts).forEach(([platform, post]) => applySocialPost(platform, post));
  } catch {
    // The verified HTML fallback remains visible if the stored feed is unavailable.
  }

  try {
    const bluesky = await fetchLatestBlueskyPost();
    const storedDate = new Date(storedPosts.bluesky?.date || 0);
    const liveDate = new Date(bluesky.date);
    if (Number.isNaN(storedDate.getTime()) || liveDate >= storedDate) applySocialPost('bluesky', bluesky);
  } catch {
    // The last verified Bluesky post remains visible if its public API is unavailable.
  }
};

updateSocialPosts();

const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const closeMenu = () => {
  menuToggle?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
  document.body.classList.remove('menu-open');
};

menuToggle?.addEventListener('click', () => {
  const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(willOpen));
  nav.classList.toggle('is-open', willOpen);
  document.body.classList.toggle('menu-open', willOpen);
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
        if (isCurrent) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    });
  },
  { rootMargin: '-36% 0px -55% 0px', threshold: 0 },
);

navLinks.forEach((link) => {
  const section = document.querySelector(link.getAttribute('href'));
  if (section) sectionObserver.observe(section);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px' },
);

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

archiveToggle?.addEventListener('click', () => {
  const isExpanded = archiveToggle.getAttribute('aria-expanded') === 'true';
  archiveToggle.setAttribute('aria-expanded', String(!isExpanded));
  researchGrid.classList.toggle('is-expanded', !isExpanded);
  archiveToggle.querySelector('span:first-child').textContent = isExpanded
    ? 'Expand research archive'
    : 'Collapse research archive';
  archiveToggle.querySelector('.archive-count').textContent = isExpanded ? '+9' : '−9';
});

referenceToggle?.addEventListener('click', () => {
  const isExpanded = referenceToggle.getAttribute('aria-expanded') === 'true';
  referenceToggle.setAttribute('aria-expanded', String(!isExpanded));
  referenceGrid?.classList.toggle('is-expanded', !isExpanded);
  referenceToggle.querySelector('span').textContent = isExpanded ? 'Show all references' : 'Show fewer references';
  referenceToggle.querySelector('i').textContent = isExpanded ? '+2' : '−2';
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));

    if (filter !== 'all') {
      researchGrid.classList.add('is-expanded');
      archiveToggle.setAttribute('aria-expanded', 'true');
      archiveToggle.querySelector('span:first-child').textContent = 'Collapse research archive';
      archiveToggle.querySelector('.archive-count').textContent = '−9';
    } else if (mobileViewport.matches) {
      researchGrid.classList.remove('is-expanded');
      archiveToggle.setAttribute('aria-expanded', 'false');
      archiveToggle.querySelector('span:first-child').textContent = 'Expand research archive';
      archiveToggle.querySelector('.archive-count').textContent = '+9';
    }

    featureResearch.hidden = filter !== 'all' && !featureResearch.dataset.category.includes(filter);
    featuredResearch.hidden = filter !== 'all' && !featuredResearchCards.some((card) => card.dataset.category.includes(filter));
    researchCards.forEach((card) => {
      const isMatch = filter === 'all' || card.dataset.category.includes(filter);
      card.classList.toggle('is-filtered', !isMatch);
    });
    requestAnimationFrame(() => {
      researchCarousel?.scrollTo({ left: 0, behavior: 'auto' });
      researchCarousel?.dispatchEvent(new CustomEvent('carouselrefresh', { detail: { pause: true } }));
    });
  });
});

galleryToggle?.addEventListener('click', () => {
  const isExpanded = galleryToggle.getAttribute('aria-expanded') === 'true';
  galleryToggle.setAttribute('aria-expanded', String(!isExpanded));
  galleryGrid.classList.toggle('is-expanded', !isExpanded);
  galleryToggle.querySelector('span').textContent = isExpanded ? 'Show all 16 photos' : 'Show first 8 photos';
  galleryToggle.querySelector('i').textContent = isExpanded ? '+8' : '−8';
  requestAnimationFrame(() => {
    if (mobileViewport.matches) {
      if (isExpanded) {
        galleryGrid.scrollTo({ left: 0, behavior: 'auto' });
      } else {
        const firstExtra = galleryGrid.querySelector('.gallery-more');
        if (firstExtra) {
          const left = galleryGrid.scrollLeft
            + firstExtra.getBoundingClientRect().left
            - galleryGrid.getBoundingClientRect().left;
          galleryGrid.scrollTo({ left, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        }
      }
    }
    galleryGrid.dispatchEvent(new Event('carouselrefresh'));
  });
});

const mobileCarousels = [...document.querySelectorAll('[data-mobile-carousel]')];

mobileCarousels.forEach((carousel) => {
  const label = carousel.dataset.carouselLabel || 'items';
  const itemSelector = carousel.dataset.carouselItems;
  const autoDelay = Number.parseInt(carousel.dataset.carouselInterval, 10) || 5200;
  const shouldLoop = carousel.hasAttribute('data-carousel-loop');
  const controls = document.createElement('div');
  controls.className = 'mobile-carousel-controls';
  controls.innerHTML = `
    <button type="button" data-carousel-prev aria-label="Previous ${label}">←︎</button>
    <span class="mobile-carousel-position" data-carousel-position>1 / 1</span>
    <button type="button" data-carousel-next aria-label="Next ${label}">→︎</button>
  `;
  carousel.insertAdjacentElement('afterend', controls);

  const previous = controls.querySelector('[data-carousel-prev]');
  const next = controls.querySelector('[data-carousel-next]');
  const position = controls.querySelector('[data-carousel-position]');
  let inView = false;
  let timer = 0;
  let scrollFrame = 0;
  let viewportFrame = 0;
  let pointerOrigin = null;

  const slides = () => {
    const candidates = itemSelector ? [...carousel.querySelectorAll(itemSelector)] : [...carousel.children];
    return candidates.filter((slide) => {
      const style = getComputedStyle(slide);
      return !slide.hidden
        && !slide.classList.contains('is-filtered')
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && slide.getClientRects().length > 0;
    });
  };

  const slideLeft = (slide) => carousel.scrollLeft
    + slide.getBoundingClientRect().left
    - carousel.getBoundingClientRect().left;

  const state = () => {
    const items = slides();
    let index = 0;
    let distance = Infinity;
    items.forEach((slide, candidate) => {
      const nextDistance = Math.abs(slideLeft(slide) - carousel.scrollLeft);
      if (nextDistance < distance) {
        index = candidate;
        distance = nextDistance;
      }
    });
    return { items, index };
  };

  const updateControls = () => {
    const { items, index } = state();
    controls.hidden = items.length <= 1;
    previous.disabled = index <= 0;
    next.disabled = !items.length || index >= items.length - 1;
    position.textContent = items.length ? `${index + 1} / ${items.length}` : '';
  };

  const goTo = (index) => {
    const items = slides();
    if (!items.length) return;
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    carousel.scrollTo({
      left: slideLeft(target),
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  };

  const clearAuto = () => {
    window.clearTimeout(timer);
    timer = 0;
  };

  const isVisiblyInViewport = () => {
    const bounds = carousel.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
    const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
    return visibleWidth > 0 && visibleHeight / Math.min(bounds.height, window.innerHeight) >= .35;
  };

  const scheduleAuto = () => {
    if (timer) return;
    if (!carousel.hasAttribute('data-carousel-autoplay')
      || !mobileViewport.matches
      || reducedMotion.matches
      || (!inView && !isVisiblyInViewport())
      || document.hidden) return;
    const { items, index } = state();
    if (items.length <= 1 || (index >= items.length - 1 && !shouldLoop)) return;
    timer = window.setTimeout(() => {
      timer = 0;
      const current = state();
      const nextIndex = current.index >= current.items.length - 1 ? 0 : current.index + 1;
      goTo(nextIndex);
      scheduleAuto();
    }, autoDelay);
  };

  const restartAuto = () => {
    clearAuto();
    scheduleAuto();
  };

  previous.addEventListener('click', () => {
    goTo(state().index - 1);
    restartAuto();
  });
  next.addEventListener('click', () => {
    goTo(state().index + 1);
    restartAuto();
  });
  carousel.addEventListener('pointerdown', (event) => {
    pointerOrigin = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  carousel.addEventListener('pointermove', (event) => {
    if (!pointerOrigin) return;
    const horizontal = Math.abs(event.clientX - pointerOrigin.x);
    const vertical = Math.abs(event.clientY - pointerOrigin.y);
    if (horizontal > 12 && horizontal > vertical) {
      restartAuto();
      pointerOrigin = null;
    }
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
    carousel.addEventListener(type, () => { pointerOrigin = null; }, { passive: true });
  });
  carousel.addEventListener('click', restartAuto);
  ['wheel', 'keydown', 'focusin'].forEach((type) => {
    carousel.addEventListener(type, restartAuto, { passive: type !== 'keydown' });
  });
  carousel.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateControls();
    });
  }, { passive: true });
  carousel.addEventListener('carouselrefresh', (event) => {
    requestAnimationFrame(updateControls);
    if (event.detail?.pause) restartAuto();
    else scheduleAuto();
  });

  const details = carousel.closest('details');
  details?.addEventListener('toggle', () => requestAnimationFrame(updateControls));

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) scheduleAuto();
    else clearAuto();
  }, { threshold: .35 }).observe(carousel);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAuto();
    else scheduleAuto();
  });
  mobileViewport.addEventListener('change', () => {
    updateControls();
    scheduleAuto();
  });
  reducedMotion.addEventListener('change', scheduleAuto);
  window.addEventListener('pageshow', scheduleAuto);
  if (carousel.hasAttribute('data-carousel-autoplay')) {
    window.addEventListener('scroll', () => {
      if (viewportFrame) return;
      viewportFrame = requestAnimationFrame(() => {
        viewportFrame = 0;
        if (isVisiblyInViewport()) scheduleAuto();
        else clearAuto();
      });
    }, { passive: true });
  }
  updateControls();
  scheduleAuto();
});

const showGalleryPhoto = (index) => {
  if (!galleryDialog || !galleryDialogImage || !galleryDialogCaption || !galleryItems.length) return;
  activeGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activeGalleryIndex];
  const thumbnail = item.querySelector('img');
  galleryDialogImage.src = item.dataset.src;
  galleryDialogImage.alt = thumbnail?.alt || '';
  galleryDialogCaption.textContent = item.dataset.caption || '';
  if (!galleryDialog.open) galleryDialog.showModal();
};

galleryItems.forEach((item, index) => item.addEventListener('click', () => showGalleryPhoto(index)));
galleryDialog?.querySelector('[data-gallery-close]')?.addEventListener('click', () => galleryDialog.close());
galleryDialog?.querySelector('[data-gallery-prev]')?.addEventListener('click', () => showGalleryPhoto(activeGalleryIndex - 1));
galleryDialog?.querySelector('[data-gallery-next]')?.addEventListener('click', () => showGalleryPhoto(activeGalleryIndex + 1));
galleryDialog?.addEventListener('click', (event) => {
  if (event.target === galleryDialog) galleryDialog.close();
});
galleryDialog?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showGalleryPhoto(activeGalleryIndex - 1);
  if (event.key === 'ArrowRight') showGalleryPhoto(activeGalleryIndex + 1);
});

if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const floatingCursor = document.querySelector('[data-floating-cursor]');
  window.addEventListener(
    'pointermove',
    (event) => {
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
      floatingCursor?.classList.add('is-visible');
    },
    { passive: true },
  );
  window.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) floatingCursor?.classList.remove('is-visible');
  });
  document.addEventListener('pointerover', (event) => {
    const isInteractive = event.target instanceof Element
      && Boolean(event.target.closest('a, button, input, summary, [role="button"]'));
    floatingCursor?.classList.toggle('is-active', isInteractive);
  });

  const tilt = document.querySelector('[data-tilt]');
  const portrait = tilt?.querySelector('.portrait-frame');
  tilt?.addEventListener('pointermove', (event) => {
    const bounds = tilt.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    portrait.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 5}deg) rotateZ(.4deg)`;
  });
  tilt?.addEventListener('pointerleave', () => {
    portrait.style.transform = 'rotateY(0deg) rotateX(0deg) rotateZ(.4deg)';
  });
}
