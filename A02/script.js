/**
 * Cyberpunk: Edgerunners Dex
 *
 * Client-side script that fetches series data from `data/edgerunners.json`,
 * dynamically generates responsive character and megacorporation card galleries,
 * and handles an accessible modal dialog for inspecting in-depth dossiers.
 */

// Global registry mapping each entry ID to its data object and category type ("character" or "corporation")
const entriesMap = new Map();

// Tracks whichever card or button had focus before the modal opened, so focus can be returned when closed
let lastFocusedElement = null;

// ============================================================================
// 1. Data Fetching
// ============================================================================

/**
 * Fetches the Edgerunners JSON dataset from the local data folder.
 * @returns {Promise<Object>} Resolves with the parsed series data object
 */
async function loadData() {
  const response = await fetch("data/edgerunners.json");
  if (!response.ok) {
    throw new Error(`HTTP error while loading data stream! Status: ${response.status}`);
  }
  return await response.json();
}

// ============================================================================
// 2. Page & Gallery Rendering
// ============================================================================

/**
 * Primary coordinator function executed after JSON data loads successfully.
 * Updates page metadata, indexes all entries, and renders the header, cards, and footer.
 * @param {Object} data - The complete parsed dataset
 */
function renderPage(data) {
  // Set the browser tab title
  if (data.series && data.series.title) {
    document.title = `${data.series.title} Dex`;
  }

  // Populate the quick-lookup map so modals can find connected entries by ID
  if (Array.isArray(data.sections)) {
    data.sections.forEach((section) => {
      if (Array.isArray(section.entries)) {
        section.entries.forEach((entry) => {
          entriesMap.set(entry.id, {
            entry: entry,
            type: section.type,
          });
        });
      }
    });
  }

  // Render header metadata and intro
  renderHeader(data.series);

  // Clear the initial loading state and render all content sections
  const appContainer = document.getElementById("app");
  if (appContainer) {
    appContainer.textContent = "";

    if (Array.isArray(data.sections)) {
      data.sections.forEach((section) => {
        const sectionEl = renderSection(section);
        appContainer.appendChild(sectionEl);
      });
    }
  }

  // Render the footer notes
  renderFooter(data.series);
}

/**
 * Renders the top header area with title, tagline, and intro text.
 * @param {Object} series - Series metadata containing title, tagline, and intro summary
 */
function renderHeader(series) {
  if (!series) return;

  const titleEl = document.getElementById("series-title");
  const titleTextEl = document.getElementById("title-text");
  const taglineEl = document.getElementById("series-tagline");
  const introEl = document.getElementById("series-intro");
  const loadingState = document.getElementById("loading-state");

  // Inject series title text
  if (titleEl && series.title) {
    if (titleTextEl) {
      titleTextEl.textContent = series.title;
    }
  }

  // Display series tagline
  if (taglineEl && series.tagline) {
    taglineEl.textContent = series.tagline;
  }

  // Display series overview text
  if (introEl && series.intro) {
    introEl.textContent = series.intro;
  }

  // Remove the loading placeholder once header and initial data are rendered
  if (loadingState) {
    loadingState.remove();
  }
}

/**
 * Renders a full category section (e.g. "Main Crew", "Support Network", "Megacorporations").
 * Generates the section heading bar, title, category tag, and loops through entries to create cards.
 * @param {Object} section - Section configuration object with title, id, type, and entries array
 * @returns {HTMLElement} The complete <section> DOM node containing all cards
 */
function renderSection(section) {
  const sectionEl = el("section", "dex-section");
  sectionEl.id = section.id;
  const headingId = `heading-${section.id}`;
  sectionEl.setAttribute("aria-labelledby", headingId);

  // Section Header: Decorative glowing bar + Section Title + Category Tag (e.g., "// MAIN")
  const headerEl = el("div", "section-header");
  const barEl = el("span", "section-bar");
  barEl.setAttribute("aria-hidden", "true");

  const titleEl = el("h2", "section-title", section.title);
  titleEl.id = headingId;

  const tagEl = el("span", "section-tag", `// ${section.id.toUpperCase()}`);
  tagEl.setAttribute("aria-hidden", "true");

  headerEl.appendChild(barEl);
  headerEl.appendChild(titleEl);
  headerEl.appendChild(tagEl);
  sectionEl.appendChild(headerEl);

  // Cards Grid: Flex container wrapping individual character or corporation cards
  const rowEl = el("div", "cards-row");

  // Loop through each entry in the section and generate either a character or corporate card
  if (Array.isArray(section.entries)) {
    section.entries.forEach((entry, index) => {
      let cardEl;
      if (section.type === "corporation") {
        cardEl = createCorpCard(entry, index);
      } else {
        cardEl = createCharacterCard(entry, index);
      }
      rowEl.appendChild(cardEl);
    });
  }

  sectionEl.appendChild(rowEl);
  return sectionEl;
}

/**
 * Creates an interactive card button for an individual character.
 * Displays initials portrait badge, index number, name, role, tagline, and affiliation.
 * @param {Object} entry - Character profile data object
 * @param {number} index - Position index in the section (used for staggered card animations)
 * @returns {HTMLButtonElement} Configured card element with click listener
 */
function createCharacterCard(entry, index) {
  const card = el("button", "dex-card");
  card.type = "button";
  card.setAttribute("aria-label", `View profile for ${entry.name}`);

  // Set custom CSS variables for accent color and entrance animation delay
  const accent = entry.accentColor || "var(--yellow)";
  card.style.setProperty("--accent", accent);
  card.style.setProperty("--card-index", index);

  // Stylized Portrait: Character image with scanline overlay and initials fallback
  const portrait = el("div", "card-portrait");
  portrait.setAttribute("aria-hidden", "true");

  const initialsText = getPortraitInitials(entry.alias, entry.name);
  const initialsEl = el("span", "portrait-initials", initialsText);

  if (entry.image) {
    const img = el("img", "portrait-image");
    img.src = entry.image;
    img.alt = entry.name;
    img.loading = "lazy";
    img.onerror = () => {
      img.remove();
      portrait.appendChild(initialsEl);
    };
    portrait.appendChild(img);
  } else {
    portrait.appendChild(initialsEl);
  }

  card.appendChild(portrait);

  // Card Content: Displays ID number, name, role, tagline, and crew affiliation
  const content = el("div", "card-content");

  const topLine = el("div", "card-top");
  const numberEl = el("span", "card-number", `#${pad(entry.number)}`);
  topLine.appendChild(numberEl);
  content.appendChild(topLine);

  const nameEl = el("h3", "card-name", entry.name);
  content.appendChild(nameEl);

  if (entry.role) {
    const roleEl = el("p", "card-role", entry.role);
    content.appendChild(roleEl);
  }

  if (entry.tagline) {
    const taglineEl = el("p", "card-tagline", entry.tagline);
    content.appendChild(taglineEl);
  }

  if (entry.affiliation) {
    const footerLine = el("div", "card-footer");
    const affilTag = el("span", "card-tag", entry.affiliation);
    footerLine.appendChild(affilTag);
    content.appendChild(footerLine);
  }

  card.appendChild(content);

  // Clicking the card opens the full character dossier modal
  card.addEventListener("click", () => {
    openModal(entry, "character", card);
  });

  return card;
}

/**
 * Creates an interactive card button for a megacorporation.
 * Displays corporate logo badge, index number, corporation name, tagline, and MEGACORP badge.
 * @param {Object} entry - Corporation profile data object
 * @param {number} index - Position index in the section (used for staggered card animations)
 * @returns {HTMLButtonElement} Configured card element with click listener
 */
function createCorpCard(entry, index) {
  const card = el("button", "dex-card");
  card.type = "button";
  card.setAttribute("aria-label", `View profile for ${entry.name}`);

  // Set custom CSS variables for accent color and entrance animation delay
  const accent = entry.accentColor || "var(--yellow)";
  card.style.setProperty("--accent", accent);
  card.style.setProperty("--card-index", index);

  // Corporate Badge Portrait: Official logo image with fallback to geometric badge
  const portrait = el("div", "card-portrait corp-portrait");
  portrait.setAttribute("aria-hidden", "true");

  const badge = el("div", "corp-badge");
  const firstLetter = entry.name ? entry.name.slice(0, 1).toUpperCase() : "C";
  const initialsEl = el("span", "portrait-initials", firstLetter);
  badge.appendChild(initialsEl);

  if (entry.image) {
    const img = el("img", "portrait-image corp-logo-img");
    img.src = entry.image;
    img.alt = entry.name;
    img.loading = "lazy";
    img.onerror = () => {
      img.remove();
      portrait.appendChild(badge);
    };
    portrait.appendChild(img);
  } else {
    portrait.appendChild(badge);
  }

  card.appendChild(portrait);

  // Card Content: Displays ID number, name, tagline, and corporate category tag
  const content = el("div", "card-content");

  const topLine = el("div", "card-top");
  const numberEl = el("span", "card-number", `#${pad(entry.number)}`);
  topLine.appendChild(numberEl);
  content.appendChild(topLine);

  const nameEl = el("h3", "card-name", entry.name);
  content.appendChild(nameEl);

  if (entry.tagline) {
    const taglineEl = el("p", "card-tagline", entry.tagline);
    content.appendChild(taglineEl);
  }

  const footerLine = el("div", "card-footer");
  const corpTag = el("span", "card-tag corp-tag", "MEGACORP");
  footerLine.appendChild(corpTag);
  content.appendChild(footerLine);

  card.appendChild(content);

  // Clicking the card opens the full corporation dossier modal
  card.addEventListener("click", () => {
    openModal(entry, "corporation", card);
  });

  return card;
}

/**
 * Populates the footer with series metadata and disclaimers.
 * @param {Object} series - Series metadata object containing footerNote
 */
function renderFooter(series) {
  if (!series || !series.footerNote) return;
  const footerNoteEl = document.getElementById("footer-note");
  if (footerNoteEl) {
    footerNoteEl.textContent = series.footerNote;
  }
}

// ============================================================================
// 3. Modal Dialog System
// ============================================================================

/**
 * Opens the detail modal dialog, injecting the full dossier for a character or corporation.
 * Saves the trigger element for accessible focus restoration upon closing.
 * @param {Object} entry - The character or corporation data object to display
 * @param {string} type - Entry category: "character" or "corporation"
 * @param {HTMLElement} [triggerEl] - The card or button clicked by the user
 */
function openModal(entry, type, triggerEl) {
  // Remember the clicked card so we can return focus when the user exits the modal
  lastFocusedElement = triggerEl || document.activeElement;

  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("detail-modal");
  const modalContent = document.getElementById("modal-content");

  if (!backdrop || !modal || !modalContent) return;

  // Clear any previously displayed modal contents
  modalContent.textContent = "";

  // Apply entry-specific neon accent color to the modal frame
  const accent = entry.accentColor || "var(--yellow)";
  modal.style.setProperty("--accent", accent);

  // Build and insert the detailed dossier DOM tree based on category
  let modalBody;
  if (type === "corporation") {
    modalBody = buildCorpModal(entry);
  } else {
    modalBody = buildCharacterModal(entry);
  }
  modalContent.appendChild(modalBody);

  // Reveal modal dialog and lock page background scrolling
  backdrop.removeAttribute("hidden");
  document.body.classList.add("modal-open");

  // Reset modal scroll position to top
  modalContent.scrollTop = 0;

  // Set keyboard focus inside the modal for accessibility
  const closeBtn = document.getElementById("modal-close-btn");
  if (closeBtn) {
    closeBtn.focus();
  } else {
    modal.focus();
  }
}

/**
 * Closes the detail modal dialog, unlocks page scrolling, and returns focus
 * to the card or button that originally opened it.
 */
function closeModal() {
  const backdrop = document.getElementById("modal-backdrop");
  if (!backdrop) return;

  // Hide modal dialog and restore normal page scrolling
  backdrop.setAttribute("hidden", "");
  document.body.classList.remove("modal-open");

  // Return keyboard focus to the triggering element
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

/**
 * Constructs the full dossier layout for a character.
 * Structured into logical sections: Header, Meta, Lore, Personality, Gear, Relationships, and Fate.
 * @param {Object} entry - Complete character data object
 * @returns {DocumentFragment} Lightweight container holding all character dossier sections
 */
function buildCharacterModal(entry) {
  const frag = document.createDocumentFragment();

  // Section 1: Header Block (Entry number, name, alias, and quote/tagline)
  const headerBlock = el("div", "modal-header-block");
  const numberEl = el("div", "modal-number", `#${pad(entry.number)}`);
  const nameEl = el("h2", "modal-title", entry.name);
  nameEl.id = "modal-title";
  headerBlock.appendChild(numberEl);
  headerBlock.appendChild(nameEl);

  if (
    entry.alias &&
    entry.alias.trim().toLowerCase() !== entry.name.trim().toLowerCase()
  ) {
    const aliasEl = el("div", "modal-alias", `// ALIAS: ${entry.alias}`);
    headerBlock.appendChild(aliasEl);
  }

  if (entry.tagline) {
    const taglineEl = el("p", "modal-tagline", `"${entry.tagline}"`);
    headerBlock.appendChild(taglineEl);
  }
  frag.appendChild(headerBlock);

  // Section 2: Metadata Badges (Role and Crew Affiliation)
  if (entry.role || entry.affiliation) {
    const metaBlock = el("div", "modal-meta");
    if (entry.role) {
      const roleItem = el("div", "meta-item");
      const roleLabel = el("span", "meta-label", "ROLE:");
      roleItem.appendChild(roleLabel);
      roleItem.appendChild(document.createTextNode(entry.role));
      metaBlock.appendChild(roleItem);
    }
    if (entry.affiliation) {
      const affilItem = el("div", "meta-item");
      const affilLabel = el("span", "meta-label", "AFFILIATION:");
      affilItem.appendChild(affilLabel);
      affilItem.appendChild(document.createTextNode(entry.affiliation));
      metaBlock.appendChild(affilItem);
    }
    frag.appendChild(metaBlock);
  }

  // Section 3: Background Lore & Origin Story
  if (entry.background) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// BACKGROUND"));
    section.appendChild(el("p", "modal-text", entry.background));
    frag.appendChild(section);
  }

  // Section 4: Personality Traits & Behavioral Summary
  if (entry.personality) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// PERSONALITY"));

    if (Array.isArray(entry.personality.traits) && entry.personality.traits.length > 0) {
      const chipsBox = el("div", "chips-container");
      entry.personality.traits.forEach((trait) => {
        chipsBox.appendChild(el("span", "chip", trait));
      });
      section.appendChild(chipsBox);
    }

    if (entry.personality.summary) {
      section.appendChild(el("p", "modal-text", entry.personality.summary));
    }
    frag.appendChild(section);
  }

  // Section 5: Core Motivations & Driving Goals
  if (entry.motivation) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// MOTIVATION"));
    section.appendChild(el("p", "modal-text", entry.motivation));
    frag.appendChild(section);
  }

  // Section 6: Cyberware, Weapons, & Signature Abilities
  if (Array.isArray(entry.signature) && entry.signature.length > 0) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// SIGNATURE GEAR & ABILITIES"));
    const list = el("ul", "modal-list");
    entry.signature.forEach((item) => {
      list.appendChild(el("li", "", item));
    });
    section.appendChild(list);
    frag.appendChild(section);
  }

  // Section 7: Key Relationships & Interpersonal Bonds
  if (Array.isArray(entry.relationships) && entry.relationships.length > 0) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// KNOWN RELATIONSHIPS"));
    const list = el("div", "relationships-list");
    entry.relationships.forEach((rel) => {
      const card = el("div", "relationship-card");
      card.appendChild(el("div", "rel-name", rel.name));
      card.appendChild(el("div", "rel-bond", rel.bond));
      list.appendChild(card);
    });
    section.appendChild(list);
    frag.appendChild(section);
  }

  // Section 8: Defining Narrative Moments
  if (Array.isArray(entry.definingMoments) && entry.definingMoments.length > 0) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// DEFINING MOMENTS"));
    const list = el("ul", "modal-list");
    entry.definingMoments.forEach((moment) => {
      list.appendChild(el("li", "", moment));
    });
    section.appendChild(list);
    frag.appendChild(section);
  }

  // Section 9: Series Fate & Outcome (Marked with Spoiler Tag)
  if (entry.fate) {
    const section = el("div", "modal-section");
    const heading = el("h3", "modal-section-title", "// FATE ");
    const spoilerBadge = el("span", "spoiler-tag", "SPOILER");
    heading.appendChild(spoilerBadge);
    section.appendChild(heading);

    // If data indicates file was redacted or unavailable, show a styled classified notice
    if (isRedacted(entry.fate)) {
      const notice = el("div", "redacted-notice");
      notice.setAttribute("role", "note");
      notice.appendChild(el("span", "redacted-tag", "[ FILE REDACTED ]"));
      notice.appendChild(document.createTextNode(" Records unavailable."));
      section.appendChild(notice);
    } else {
      section.appendChild(el("p", "modal-text", entry.fate));
    }
    frag.appendChild(section);
  }

  return frag;
}

/**
 * Constructs the corporation dossier modal layout.
 * Displays corporate branding, industry influence, story role, and links to affiliated characters.
 * @param {Object} entry - Complete corporation data object
 * @returns {DocumentFragment} Lightweight container holding all corporate dossier sections
 */
function buildCorpModal(entry) {
  const frag = document.createDocumentFragment();

  // Section 1: Corporate Header (Number, corporation name, and slogan)
  const headerBlock = el("div", "modal-header-block");
  const numberEl = el("div", "modal-number", `#${pad(entry.number)}`);
  const nameEl = el("h2", "modal-title", entry.name);
  nameEl.id = "modal-title";
  headerBlock.appendChild(numberEl);
  headerBlock.appendChild(nameEl);

  if (entry.tagline) {
    headerBlock.appendChild(el("p", "modal-tagline", `"${entry.tagline}"`));
  }
  frag.appendChild(headerBlock);

  // Section 2: Core Business & Known Operations
  if (entry.knownFor) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// KNOWN FOR"));
    section.appendChild(el("p", "modal-text", entry.knownFor));
    frag.appendChild(section);
  }

  // Section 3: Global Reputation & Public Image
  if (entry.reputation) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// REPUTATION"));
    section.appendChild(el("p", "modal-text", entry.reputation));
    frag.appendChild(section);
  }

  // Section 4: Narrative Impact & Role in Story
  if (entry.roleInStory) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// ROLE IN STORY"));
    section.appendChild(el("p", "modal-text", entry.roleInStory));
    frag.appendChild(section);
  }

  // Section 5: Key Corporate Facts & Intel
  if (Array.isArray(entry.keyFacts) && entry.keyFacts.length > 0) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// KEY FACTS"));
    const list = el("ul", "modal-list");
    entry.keyFacts.forEach((fact) => {
      list.appendChild(el("li", "", fact));
    });
    section.appendChild(list);
    frag.appendChild(section);
  }

  // Section 6: Interactive Connected Characters (Cross-links to character dossiers)
  if (
    Array.isArray(entry.connectedCharacters) &&
    entry.connectedCharacters.length > 0
  ) {
    const section = el("div", "modal-section");
    section.appendChild(el("h3", "modal-section-title", "// CONNECTED CHARACTERS"));
    const chipsGrid = el("div", "connected-characters-grid");

    entry.connectedCharacters.forEach((charId) => {
      const character = findCharacterById(charId);
      if (character) {
        const chipBtn = el("button", "connected-char-btn");
        chipBtn.type = "button";
        chipBtn.setAttribute("aria-label", `Open connected profile for ${character.name}`);

        const charAccent = character.accentColor || "var(--cyan)";
        chipBtn.style.setProperty("--char-accent", charAccent);

        const dot = el("span", "char-chip-dot");
        dot.setAttribute("aria-hidden", "true");
        chipBtn.appendChild(dot);
        chipBtn.appendChild(document.createTextNode(character.name));

        // Clicking a character chip transitions the modal directly to that character's profile
        chipBtn.addEventListener("click", () => {
          openModal(character, "character", chipBtn);
        });

        chipsGrid.appendChild(chipBtn);
      }
    });

    section.appendChild(chipsGrid);
    frag.appendChild(section);
  }

  return frag;
}

// ============================================================================
// 4. Utility & Helper Functions
// ============================================================================

/**
 * Formats a number with leading zeroes (e.g. 1 becomes "01").
 * @param {number|string} n - Number to pad
 * @returns {string} Two-digit padded string
 */
function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Checks if a character's fate string indicates redacted or missing data.
 * @param {string} fate - Fate description string
 * @returns {boolean} True if the record should display as redacted
 */
function isRedacted(fate) {
  if (typeof fate !== "string") return false;
  return fate.trim().toLowerCase().startsWith("unknown");
}

/**
 * Finds an entry data object by its unique ID string.
 * @param {string} id - Entry ID to look up (e.g., "david-martinez")
 * @returns {Object|null} Entry data object or null if not found
 */
function findCharacterById(id) {
  const item = entriesMap.get(id);
  return item ? item.entry : null;
}

/**
 * Generates display initials for placeholder card portraits.
 * Prefers the character's alias, falling back to full name. Returns 1 to 2 uppercase letters.
 * @param {string} [alias] - Character alias (e.g., "Lucy")
 * @param {string} [name] - Character full name (e.g., "David Martinez")
 * @returns {string} 1-2 character initials string
 */
function getPortraitInitials(alias, name) {
  const source = alias && alias.trim() ? alias.trim() : name && name.trim() ? name.trim() : "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 1).toUpperCase();
}

/**
 * Convenience helper to create a DOM element with an optional CSS class and text content.
 * @param {string} tag - HTML tag name (e.g. "div", "h2", "span")
 * @param {string} [className=""] - Space-separated class list
 * @param {string} [text=""] - Inner text content
 * @returns {HTMLElement} Created element
 */
function el(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null && text !== "") {
    element.textContent = text;
  }
  return element;
}

/**
 * Displays a styled error message if the dataset cannot be loaded (e.g. file:// protocol restriction).
 * @param {Error} error - The caught fetch or parsing error
 */
function showError(error) {
  console.error("Dex data stream error:", error);
  const app = document.getElementById("app");
  if (!app) return;
  app.textContent = "";

  const box = el("div", "error-box");
  box.appendChild(el("h2", "error-title", "[ SYSTEM ERROR: DATASTREAM OFFLINE ]"));
  box.appendChild(el("p", "error-message", "Could not load data. Run this page from a local server."));
  box.appendChild(el("div", "error-help",
    "Browser security policies prevent loading JSON files directly via file://. Start a local server (e.g. 'python -m http.server 8000') and reload."));
  app.appendChild(box);
}

// ============================================================================
// 5. Modal Event Listeners & Keyboard Accessibility Trap
// ============================================================================

const modalBackdrop = document.getElementById("modal-backdrop");
const modalEl = document.getElementById("detail-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");

// Close modal when clicking on the dark backdrop outside the modal card
if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeModal();
  });
}

// Close modal when clicking the dedicated close (✕) button
if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", closeModal);
}

// Keyboard navigation: ESC to close, and Tab focus trap inside active modal
document.addEventListener("keydown", (event) => {
  // Only intercept keyboard navigation when the modal is actively visible
  if (!modalBackdrop || modalBackdrop.hasAttribute("hidden")) return;

  // ESC key: Dismiss the modal
  if (event.key === "Escape") {
    closeModal();
    return;
  }

  // TAB key: Trap keyboard focus within the modal so users cannot tab behind the overlay
  if (event.key === "Tab") {
    const focusable = modalEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: If on first element, wrap around to last element
      if (document.activeElement === first || document.activeElement === modalEl) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: If on last element, wrap around to first element
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
});

// ============================================================================
// 6. Application Bootstrap
// ============================================================================

// Fetch data on page load, render the application, or display error state on failure
loadData().then(renderPage).catch(showError);
