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
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const galleryGrid = document.querySelector('[data-gallery-grid]');
const galleryToggle = document.querySelector('[data-gallery-toggle]');
const galleryItems = [...document.querySelectorAll('[data-gallery-item]')];
const galleryDialog = document.querySelector('[data-gallery-dialog]');
const galleryDialogImage = galleryDialog?.querySelector('figure img');
const galleryDialogCaption = galleryDialog?.querySelector('figcaption');
let activeGalleryIndex = 0;

document.querySelector('[data-year]').textContent = new Date().getFullYear();

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

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));

    if (filter !== 'all') {
      researchGrid.classList.add('is-expanded');
      archiveToggle.setAttribute('aria-expanded', 'true');
      archiveToggle.querySelector('span:first-child').textContent = 'Collapse research archive';
      archiveToggle.querySelector('.archive-count').textContent = '−9';
    }

    featureResearch.hidden = filter !== 'all' && !featureResearch.dataset.category.includes(filter);
    featuredResearch.hidden = filter !== 'all' && !featuredResearchCards.some((card) => card.dataset.category.includes(filter));
    researchCards.forEach((card) => {
      const isMatch = filter === 'all' || card.dataset.category.includes(filter);
      card.classList.toggle('is-filtered', !isMatch);
    });
  });
});

galleryToggle?.addEventListener('click', () => {
  const isExpanded = galleryToggle.getAttribute('aria-expanded') === 'true';
  galleryToggle.setAttribute('aria-expanded', String(!isExpanded));
  galleryGrid.classList.toggle('is-expanded', !isExpanded);
  galleryToggle.querySelector('span').textContent = isExpanded ? 'Show all 16 photos' : 'Show first 8 photos';
  galleryToggle.querySelector('i').textContent = isExpanded ? '+8' : '−8';
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
  window.addEventListener(
    'pointermove',
    (event) => {
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
    },
    { passive: true },
  );

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
