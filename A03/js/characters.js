/**
 * characters.js — Character listing page logic (index.html)
 *
 * Manages search, pagination, card rendering, URL state,
 * and the info popover.
 */

import { fetchCharacters } from './api.js';
import {
  injectSharedLayout,
  showLoading,
  showError,
  showEmpty,
  clearContainer,
  buildCharacterCard,
  renderPagination,
  getSearchParams,
  updateUrl,
} from './ui.js';

// ── DOM references ────────────────────────────────────────────
const grid       = document.getElementById('card-grid');
const pagination = document.getElementById('pagination');
const summary    = document.getElementById('results-summary');
const searchForm = document.getElementById('search-form');
const searchInput= document.getElementById('search-input');
const clearBtn   = document.getElementById('clear-btn');

// ── Page state ────────────────────────────────────────────────
let currentPage = 1;
let currentName = '';
let abortController = null;

// ── Initialise ────────────────────────────────────────────────
injectSharedLayout();

// Read state from URL on load
const params = getSearchParams();
currentPage = parseInt(params.get('page') || '1', 10);
currentName = params.get('name') || '';
if (currentName) searchInput.value = currentName;

loadPage();

// ── Event listeners ───────────────────────────────────────────
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  currentName = searchInput.value.trim();
  currentPage = 1;
  loadPage();
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  currentName = '';
  currentPage = 1;
  searchInput.focus();
  loadPage();
});

// ── Core load function ────────────────────────────────────────
async function loadPage() {
  if (abortController) abortController.abort();
  abortController = new AbortController();
  const signal = abortController.signal;

  updateUrl({ page: currentPage, name: currentName || null });
  showLoading(grid, 'Loading characters…');
  clearContainer(pagination);
  summary.textContent = '';

  try {
    const data = await fetchCharacters(
      { page: currentPage, limit: 20, name: currentName },
      signal
    );

    if (data.characters.length === 0) {
      showEmpty(grid, currentName
        ? `No characters found matching "${currentName}".`
        : 'No characters found.');
      summary.textContent = '';
      return;
    }

    renderCards(data.characters);
    updateSummary(data);
    renderPagination(
      pagination,
      { currentPage: data.currentPage, totalPages: data.totalPages },
      (page) => {
        currentPage = page;
        loadPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    );
  } catch (err) {
    if (err.name === 'AbortError') return;
    showError(grid, err, loadPage);
    summary.textContent = '';
  }
}

// ── Render helpers ────────────────────────────────────────────
function renderCards(characters) {
  clearContainer(grid);
  for (const char of characters) {
    const col = document.createElement('div');
    col.className = 'col';
    col.append(buildCharacterCard(char));
    grid.append(col);
  }
}

function updateSummary(data) {
  const { total, currentPage, pageSize } = data;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const nameClause = currentName ? ` matching "${currentName}"` : '';
  summary.textContent = `Showing ${start}–${end} of ${total} records${nameClause}.`;
}

