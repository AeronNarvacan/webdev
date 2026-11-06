/**
 * character.js — Character detail page logic
 *
 * Reads ?id= from URL, fetches the character, and renders all
 * confirmed fields. Provides loading, error, and not-found states.
 */

import { fetchCharacterById, toArray } from './api.js';
import {
  injectSharedLayout,
  showLoading,
  showError,
  buildCharacterImage,
  buildDetailRow,
  getSearchParams,
} from './ui.js';

// ── DOM references ────────────────────────────────────────────
const root     = document.getElementById('detail-root');
const backLink = document.getElementById('back-link');

// ── Initialise ────────────────────────────────────────────────
injectSharedLayout();

// Build back link preserving any page/search context
const params  = getSearchParams();
const id      = params.get('id');
const backPage = params.get('page');
const backName = params.get('name');
let backHref  = 'index.html';
if (backPage || backName) {
  const bp = new URLSearchParams();
  if (backPage) bp.set('page', backPage);
  if (backName) bp.set('name', backName);
  backHref = `index.html?${bp.toString()}`;
}
backLink.href = backHref;

if (!id || isNaN(parseInt(id, 10))) {
  showError(root, { message: 'Invalid or missing character ID in URL.', name: 'ApiError', status: 0 });
} else {
  loadCharacter(parseInt(id, 10));
}

// ── Load character ────────────────────────────────────────────
async function loadCharacter(charId) {
  showLoading(root, 'Loading character…');
  try {
    const char = await fetchCharacterById(charId);
    document.title = `${char.name} — Shinobi Database`;
    renderCharacter(char);
  } catch (err) {
    if (err.status === 404) {
      renderNotFound(charId);
    } else {
      showError(root, err, () => loadCharacter(charId));
    }
  }
}

// ── Render functions ──────────────────────────────────────────
function renderNotFound(id) {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'container py-5 text-center';

  const icon = document.createElement('div');
  icon.className = 'display-4 mb-3';
  icon.textContent = '📜';
  icon.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h2');
  title.className = 'detail-name mb-2';
  title.textContent = 'Character Not Found';

  const msg = document.createElement('p');
  msg.className = 'text-muted-archive';
  msg.textContent = `No character with ID ${id} exists in the archive.`;

  const link = document.createElement('a');
  link.href = 'index.html';
  link.className = 'btn btn-shinobi mt-3';
  link.textContent = 'Back to Characters';

  wrap.append(icon, title, msg, link);
  root.append(wrap);
}

function renderCharacter(char) {
  root.innerHTML = '';

  const p = char.personal || {};
  const affiliations = toArray(p.affiliation);
  const teams        = toArray(p.team);
  const clanName     = p.clan || null;

  // ── Hero section ───────────────────────────────────────────
  const hero = document.createElement('section');
  hero.className = 'detail-hero';
  hero.setAttribute('aria-label', 'Character overview');

  const heroCont = document.createElement('div');
  heroCont.className = 'container';

  const heroRow = document.createElement('div');
  heroRow.className = 'd-flex flex-wrap gap-4 align-items-start';

  // Image
  const imgEl = buildCharacterImage(char.images, char.name);
  if (imgEl.tagName === 'IMG') {
    imgEl.className = 'detail-hero-img';
  } else {
    imgEl.className = 'detail-hero-img-placeholder';
  }
  heroRow.append(imgEl);

  // Info column
  const infoCol = document.createElement('div');
  infoCol.style.flex = '1';

  const idDiv = document.createElement('div');
  idDiv.className = 'detail-id mb-1';
  idDiv.textContent = `RECORD #${char.id}`;

  const nameH1 = document.createElement('h1');
  nameH1.className = 'detail-name mb-2';
  nameH1.textContent = char.name;

  infoCol.append(idDiv, nameH1);

  // Quick facts row
  if (p.sex || p.bloodType || p.status) {
    const quickFacts = document.createElement('div');
    quickFacts.className = 'd-flex flex-wrap gap-2 mb-3';

    if (p.sex) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-leaf';
      badge.textContent = p.sex;
      quickFacts.append(badge);
    }
    if (p.bloodType) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-red';
      badge.textContent = `Blood Type ${p.bloodType}`;
      quickFacts.append(badge);
    }
    if (p.status) {
      const badge = document.createElement('span');
      badge.className = 'badge bg-secondary';
      badge.textContent = p.status;
      quickFacts.append(badge);
    }
    infoCol.append(quickFacts);
  }

  // Related links row (clan/village/team pages removed — links omitted)


  heroRow.append(infoCol);
  heroCont.append(heroRow);
  hero.append(heroCont);
  root.append(hero);

  // ── Detail sections ────────────────────────────────────────
  const bodyCont = document.createElement('div');
  bodyCont.className = 'container py-4';

  const colRow = document.createElement('div');
  colRow.className = 'row g-4';

  const col1 = document.createElement('div');
  col1.className = 'col-12 col-md-6';

  const col2 = document.createElement('div');
  col2.className = 'col-12 col-md-6';

  // ── Personal info ──────────────────────────────────────────
  const personalSec = buildSection('Personal Information');

  if (p.birthdate) personalSec.append(buildDetailRow('Birthdate', p.birthdate));
  if (p.sex) personalSec.append(buildDetailRow('Sex', p.sex));
  if (p.bloodType) personalSec.append(buildDetailRow('Blood Type', p.bloodType));
  if (p.species) personalSec.append(buildDetailRow('Species', p.species));
  if (p.status) personalSec.append(buildDetailRow('Status', p.status));
  if (clanName) personalSec.append(buildDetailRow('Clan', clanName));

  // Age — object with Part keys
  if (p.age && typeof p.age === 'object') {
    const ageParts = Object.entries(p.age)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`);
    if (ageParts.length > 0) personalSec.append(buildDetailRow('Age', ageParts.join(' / ')));
  }

  // Height
  if (p.height && typeof p.height === 'object') {
    const parts = Object.entries(p.height).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    if (parts.length > 0) personalSec.append(buildDetailRow('Height', parts.join(' / ')));
  }

  // Weight
  if (p.weight && typeof p.weight === 'object') {
    const parts = Object.entries(p.weight).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    if (parts.length > 0) personalSec.append(buildDetailRow('Weight', parts.join(' / ')));
  }

  if (p.kekkeiGenkai?.length) personalSec.append(buildDetailRow('Kekkei Genkai', toArray(p.kekkeiGenkai).join(', ')));
  if (p.tailedBeast) personalSec.append(buildDetailRow('Tailed Beast', p.tailedBeast));
  if (p.occupation) personalSec.append(buildDetailRow('Occupation', toArray(p.occupation).join(', ')));
  if (affiliations.length) personalSec.append(buildDetailRow('Affiliation', affiliations.join(', ')));
  if (teams.length) personalSec.append(buildDetailRow('Teams', teams.join(', ')));

  if (personalSec.querySelectorAll('.detail-row').length > 0) col1.append(personalSec);

  // ── Rank ───────────────────────────────────────────────────
  const rank = char.rank || {};
  if (rank.ninjaRegistration || (rank.ninjaRank && Object.keys(rank.ninjaRank).length)) {
    const rankSec = buildSection('Rank');
    if (rank.ninjaRegistration) rankSec.append(buildDetailRow('Registration', rank.ninjaRegistration));
    if (rank.ninjaRank && typeof rank.ninjaRank === 'object') {
      const rankParts = Object.entries(rank.ninjaRank).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
      if (rankParts.length) rankSec.append(buildDetailRow('Ninja Rank', rankParts.join(' / ')));
    }
    col1.append(rankSec);
  }

  // ── Debut ─────────────────────────────────────────────────
  const debut = char.debut || {};
  const debutFields = ['manga', 'anime', 'novel', 'movie', 'game', 'ova', 'appearsIn'];
  const hasDebut = debutFields.some((f) => debut[f]);
  if (hasDebut) {
    const debutSec = buildSection('Debut');
    if (debut.appearsIn) debutSec.append(buildDetailRow('Appears In', debut.appearsIn));
    if (debut.anime) debutSec.append(buildDetailRow('Anime', debut.anime));
    if (debut.manga) debutSec.append(buildDetailRow('Manga', debut.manga));
    if (debut.novel) debutSec.append(buildDetailRow('Novel', debut.novel));
    if (debut.movie) debutSec.append(buildDetailRow('Movie', debut.movie));
    if (debut.game) debutSec.append(buildDetailRow('Game', debut.game));
    if (debut.ova) debutSec.append(buildDetailRow('OVA', debut.ova));
    col2.append(debutSec);
  }

  // ── Family ────────────────────────────────────────────────
  const family = char.family || {};
  const familyEntries = Object.entries(family).filter(([, v]) => v);
  if (familyEntries.length > 0) {
    const famSec = buildSection('Family');
    for (const [rel, name] of familyEntries) {
      famSec.append(buildDetailRow(capitalise(rel), name));
    }
    col2.append(famSec);
  }

  // ── Voice Actors ──────────────────────────────────────────
  const va = char.voiceActors || {};
  if ((va.japanese?.length || va.english?.length)) {
    const vaSec = buildSection('Voice Actors');
    if (va.japanese?.length) vaSec.append(buildDetailRow('Japanese', toArray(va.japanese).join(', ')));
    if (va.english?.length) vaSec.append(buildDetailRow('English', toArray(va.english).join(', ')));
    col2.append(vaSec);
  }

  colRow.append(col1, col2);
  bodyCont.append(colRow);

  // ── Jutsu (full width) ─────────────────────────────────────
  const jutsu = toArray(char.jutsu);
  if (jutsu.length > 0) {
    const jutsuSec = buildSection('Jutsu');
    const list = document.createElement('div');
    list.className = 'd-flex flex-wrap gap-2';
    for (const j of jutsu) {
      const tag = document.createElement('span');
      tag.className = 'badge bg-light text-dark border';
      tag.style.fontWeight = '500';
      tag.style.fontSize = '0.72rem';
      tag.textContent = j;
      list.append(tag);
    }
    jutsuSec.append(list);
    bodyCont.append(jutsuSec);
  }

  // ── Nature Types ──────────────────────────────────────────
  const nature = toArray(char.natureType);
  if (nature.length > 0) {
    const natureSec = buildSection('Nature Types');
    const list = document.createElement('div');
    list.className = 'd-flex flex-wrap gap-2';
    for (const n of nature) {
      const tag = document.createElement('span');
      tag.className = 'badge badge-leaf';
      tag.textContent = n;
      list.append(tag);
    }
    natureSec.append(list);
    bodyCont.append(natureSec);
  }

  // ── Tools ─────────────────────────────────────────────────
  const tools = toArray(char.tools);
  if (tools.length > 0) {
    const toolsSec = buildSection('Tools & Weapons');
    const list = document.createElement('div');
    list.className = 'd-flex flex-wrap gap-2';
    for (const t of tools) {
      const tag = document.createElement('span');
      tag.className = 'badge bg-secondary';
      tag.textContent = t;
      list.append(tag);
    }
    toolsSec.append(list);
    bodyCont.append(toolsSec);
  }

  root.append(bodyCont);
}

// ── Helpers ───────────────────────────────────────────────────

function buildSection(title) {
  const sec = document.createElement('div');
  sec.className = 'detail-section';

  const h = document.createElement('h2');
  h.className = 'detail-section-title';
  h.textContent = title;
  sec.append(h);

  return sec;
}

function capitalise(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

