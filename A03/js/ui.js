/**
 * ui.js — Shinobi Database shared UI helpers
 *
 * Provides reusable functions for:
 *  - Loading / error / empty feedback states
 *  - Pagination controls
 *  - Card building utilities (safe DOM construction)
 *  - Image fallback handling
 *
 * No functions here call fetch(). All data comes from api.js.
 * Never interpolate untrusted API values into innerHTML.
 */

import { ApiError } from './api.js';

/* ── Feedback States ────────────────────────────────────────── */

/**
 * Render a loading spinner into a container element.
 * @param {HTMLElement} container
 * @param {string} [message]
 */
export function showLoading(container, message = 'Loading records…') {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'state-loading';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');

  const spinner = document.createElement('div');
  spinner.className = 'spinner-icon';
  spinner.setAttribute('aria-hidden', 'true');

  const msg = document.createElement('p');
  msg.textContent = message;

  wrap.append(spinner, msg);
  container.append(wrap);
}

/**
 * Render an error state.
 * @param {HTMLElement} container
 * @param {Error|ApiError} err
 * @param {Function}  [onRetry]  If provided, shows a retry button
 */
export function showError(container, err, onRetry) {
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'state-error';
  wrap.setAttribute('role', 'alert');

  const icon = document.createElement('div');
  icon.className = 'error-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⚠️';

  const title = document.createElement('div');
  title.className = 'error-title';
  title.textContent = 'Something went wrong';

  const msg = document.createElement('p');
  msg.className = 'error-msg';
  // Show API-safe message; never expose stack traces
  msg.textContent = err instanceof ApiError
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  wrap.append(icon, title, msg);

  if (typeof onRetry === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-shinobi btn-sm mt-2';
    btn.textContent = 'Try again';
    btn.addEventListener('click', onRetry);
    wrap.append(btn);
  }

  container.append(wrap);
}

/**
 * Render an empty-results state.
 * @param {HTMLElement} container
 * @param {string} [message]
 */
export function showEmpty(container, message = 'No records found.') {
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'state-empty';

  const icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '📜';

  const msg = document.createElement('p');
  msg.textContent = message;

  wrap.append(icon, msg);
  container.append(wrap);
}

/** Clear the container. */
export function clearContainer(container) {
  container.innerHTML = '';
}

/* ── Image helpers ──────────────────────────────────────────── */

/**
 * Create an <img> element for a character's first image.
 * Uses a placeholder div if no image is available.
 *
 * @param {string[]} images   The character's images array (may be [])
 * @param {string}   altText  Meaningful alt text
 * @returns {HTMLElement}  Either an <img> or a placeholder <div>
 */
export function buildCharacterImage(images, altText) {
  const src = Array.isArray(images) && images.length > 0 ? images[0] : null;

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = altText;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      // Replace broken image with placeholder
      const placeholder = buildImagePlaceholder('🥷');
      img.replaceWith(placeholder);
    });
    return img;
  }

  return buildImagePlaceholder('🥷');
}

/**
 * Build a placeholder div when no image is available.
 * @param {string} emoji
 * @param {string} [label]
 * @returns {HTMLDivElement}
 */
export function buildImagePlaceholder(emoji = '📜', label = '') {
  const wrap = document.createElement('div');
  wrap.className = 'card-img-placeholder';
  wrap.setAttribute('aria-hidden', 'true');

  const em = document.createElement('span');
  em.textContent = emoji;
  wrap.append(em);

  if (label) {
    const lbl = document.createElement('span');
    lbl.className = 'placeholder-label';
    lbl.textContent = label;
    wrap.append(lbl);
  }

  return wrap;
}

/* ── Card builders ──────────────────────────────────────────── */

/**
 * Build a character listing card as an <a> element.
 * @param {object} char  Normalised character object
 * @returns {HTMLAnchorElement}
 */
export function buildCharacterCard(char, backParams = '') {
  const href = `character.html?id=${encodeURIComponent(char.id)}${backParams ? '&' + backParams : ''}`;

  const card = document.createElement('a');
  card.href = href;
  card.className = 'shinobi-card';
  card.setAttribute('aria-label', char.name);

  // Image area
  const imgWrap = document.createElement('div');
  imgWrap.className = 'card-img-wrap';
  imgWrap.append(buildCharacterImage(char.images, char.name));

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const idBadge = document.createElement('div');
  idBadge.className = 'card-id-badge';
  idBadge.textContent = `#${char.id}`;

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = char.name;

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const clanName = char.personal?.clan;
  if (clanName) meta.textContent = clanName;

  body.append(idBadge, name, meta);
  card.append(imgWrap, body);
  return card;
}


/* ── Pagination ─────────────────────────────────────────────── */

/**
 * Render pagination controls into a container.
 *
 * @param {HTMLElement} container
 * @param {{ currentPage: number, totalPages: number }} pageInfo
 * @param {function(number): void} onPageChange   Called with new page number
 */
export function renderPagination(container, { currentPage, totalPages }, onPageChange) {
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Page navigation');

  const ul = document.createElement('ul');
  ul.className = 'pagination shinobi-pagination justify-content-center flex-wrap';

  // Previous
  ul.append(makePaginationItem(
    '← Prev',
    currentPage <= 1,
    () => onPageChange(currentPage - 1),
    'Previous page'
  ));

  // Page numbers: show window around current page
  const pages = pageWindowFor(currentPage, totalPages);
  let lastRendered = 0;
  for (const p of pages) {
    if (p - lastRendered > 1) {
      ul.append(makeEllipsis());
    }
    ul.append(makePageNumber(p, p === currentPage, () => onPageChange(p)));
    lastRendered = p;
  }

  // Next
  ul.append(makePaginationItem(
    'Next →',
    currentPage >= totalPages,
    () => onPageChange(currentPage + 1),
    'Next page'
  ));

  nav.append(ul);
  container.append(nav);

  // Summary
  const info = document.createElement('p');
  info.className = 'text-center text-muted-archive mt-2 mb-0';
  info.textContent = `Page ${currentPage} of ${totalPages}`;
  container.append(info);
}

function pageWindowFor(current, total) {
  const delta = 2;
  const range = new Set();
  range.add(1);
  range.add(total);
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.add(i);
  }
  return [...range].sort((a, b) => a - b);
}

function makePaginationItem(label, disabled, onClick, ariaLabel) {
  const li = document.createElement('li');
  li.className = `page-item${disabled ? ' disabled' : ''}`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'page-link';
  btn.textContent = label;
  btn.setAttribute('aria-label', ariaLabel);
  if (disabled) {
    btn.setAttribute('aria-disabled', 'true');
    btn.disabled = true;
  } else {
    btn.addEventListener('click', onClick);
  }

  li.append(btn);
  return li;
}

function makePageNumber(page, isCurrent, onClick) {
  const li = document.createElement('li');
  li.className = `page-item${isCurrent ? ' active' : ''}`;
  if (isCurrent) li.setAttribute('aria-current', 'page');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'page-link';
  btn.textContent = String(page);
  btn.setAttribute('aria-label', `Page ${page}`);
  if (!isCurrent) btn.addEventListener('click', onClick);

  li.append(btn);
  return li;
}

function makeEllipsis() {
  const li = document.createElement('li');
  li.className = 'page-item disabled';
  li.setAttribute('aria-hidden', 'true');
  const span = document.createElement('span');
  span.className = 'page-link';
  span.textContent = '…';
  li.append(span);
  return li;
}

/* ── URL helpers ────────────────────────────────────────────── */

/**
 * Read the current page's URL search params.
 */
export function getSearchParams() {
  return new URLSearchParams(window.location.search);
}

/**
 * Update the browser URL without reloading the page.
 * @param {object} params  key/value pairs to set
 */
export function updateUrl(params) {
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') {
      sp.delete(k);
    } else {
      sp.set(k, String(v));
    }
  }
  const newUrl = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, '', newUrl);
}

/* ── Detail page helpers ────────────────────────────────────── */

/**
 * Create a labelled detail row element.
 * @param {string} label
 * @param {string|string[]} value  Renders arrays as comma-separated text
 * @returns {HTMLDivElement}
 */
export function buildDetailRow(label, value) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const lbl = document.createElement('span');
  lbl.className = 'detail-label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className = 'detail-value';
  if (Array.isArray(value)) {
    val.textContent = value.filter(Boolean).join(', ') || '—';
  } else {
    val.textContent = value || '—';
  }

  row.append(lbl, val);
  return row;
}


/* ── Shared HTML template ────────────────────────────────────── */

/**
 * Returns the shared nav HTML to be injected into pages.
 */
export const NAV_HTML = `
<nav class="navbar shinobi-nav" aria-label="Site navigation">
  <div class="container">
    <a class="navbar-brand" href="index.html">
      <span class="brand-seal" aria-hidden="true">忍</span>
      Shinobi Database
    </a>
  </div>
</nav>`;

export const FOOTER_HTML = `
<footer class="shinobi-footer">
  <div class="container">
    <div class="footer-brand">Shinobi Database</div>
    <div class="footer-disclaimer">
      A fan-made reference project. Data sourced from the <a href="https://api-dattebayo.vercel.app/docs" target="_blank" rel="noopener noreferrer" style="color:inherit;text-underline-offset:2px">Dattebayo Naruto API</a>.
      Naruto Shippuden is the property of Masashi Kishimoto / Shueisha / Pierrot.
      This site is not affiliated with or endorsed by the rights holders.
    </div>
  </div>
</footer>`;

/**
 * Inject shared nav and footer into the page.
 */
export function injectSharedLayout() {
  const navPlaceholder = document.getElementById('nav-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (navPlaceholder) {
    navPlaceholder.outerHTML = NAV_HTML;
  }
  if (footerPlaceholder) {
    footerPlaceholder.outerHTML = FOOTER_HTML;
  }
}

