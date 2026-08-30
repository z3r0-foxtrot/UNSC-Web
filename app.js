/**
 * UNSC Web Frontend
 *
 * This file contains presentation logic only.
 * All actual website data comes from Google Sheets.
 */

const API_URL =
  'https://script.google.com/macros/s/AKfycbyr7aOTu7Co7K7rNdTJGdupAlDR0rQfmVV09iwLbr8fMukFKy36nCU28KI48s-3E-RD/exec';


const $ = id => document.getElementById(id);

const clean = value =>
  String(value ?? '').trim();


const enabled = value =>
  ['true', 'yes', '1', 'active']
    .includes(clean(value).toLowerCase());


const escapeHTML = value =>
  clean(value).replace(
    /[&<>'"]/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[character])
  );


const formatDate = value => {

  const date = new Date(value);

  if (isNaN(date)) {
    return clean(value);
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
};


/**
 * Determine which page is currently open.
 */
function currentPage() {

  const file =
    window.location.pathname
      .split('/')
      .pop()
      .toLowerCase();

  if (!file || file === 'index.html') {
    return 'all';
  }

  if (file === 'operations.html') {
    return 'operations';
  }

  if (file === 'roster.html') {
    return 'roster';
  }

  if (file === 'announcements.html') {
    return 'announcements';
  }

  if (file === 'morphs.html') {
    return 'morphs';
  }

  if (file === 'settings.html') {
    return 'settings';
  }

  return 'all';
}


/**
 * Retrieve data directly from Google Apps Script.
 */
async function getData(page) {

  const url =
    `${API_URL}?page=${encodeURIComponent(page)}`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(
      `API returned HTTP ${response.status}`
    );
  }

  return await response.json();
}


/**
 * Apply common site settings.
 */
function applySettings(settings = {}) {

  const siteName =
    clean(settings.siteName) ||
    'UNSC Operational Command';

  document.title =
    `${siteName} // ${document.title.split('//')[1] || 'Command'}`;

  if ($('siteName')) {
    $('siteName').textContent = siteName;
  }

  if ($('heroMessage')) {
    $('heroMessage').textContent =
      clean(settings.heroMessage);
  }

  if ($('theater')) {
    $('theater').textContent =
      clean(settings.theater) || 'SCP:RP';
  }
}


/**
 * Render dashboard.
 */
function renderDashboard(data) {

  const roster =
    data.roster || [];

  const operations =
    data.operations || [];

  const announcements =
    data.announcements || [];

  if ($('metricRoster')) {

    $('metricRoster').textContent =
      roster.filter(
        person =>
          clean(person.status).toLowerCase() !== 'inactive'
      ).length;
  }

  if ($('metricOperations')) {
    $('metricOperations').textContent =
      operations.length;
  }

  if ($('metricAnnouncements')) {
    $('metricAnnouncements').textContent =
      announcements.length;
  }
}


/**
 * Render announcements.
 */
function renderAnnouncements(items) {

  const container =
    $('announcementsGrid');

  if (!container) {
    return;
  }

  if (!items.length) {

    container.innerHTML =
      '<p class="empty">No announcements have been published.</p>';

    return;
  }

  container.innerHTML =
    items.map(item => `

      <article class="announcement ${enabled(item.pinned) ? 'pinned' : ''}">

        <span class="tag">
          ${escapeHTML(item.priority || 'Notice')}
        </span>

        <h3>
          ${escapeHTML(item.title)}
        </h3>

        <p>
          ${escapeHTML(item.body)}
        </p>

        <footer>
          ${formatDate(item.date)}
          ·
          ${escapeHTML(item.author || 'UNSC Command')}
        </footer>

      </article>

    `).join('');
}


/**
 * Render operations.
 */
function renderOperations(items) {

  const container =
    $('operationsList');

  if (!container) {
    return;
  }

  const filter =
    $('operationFilter');

  if (filter) {

    const statuses = [
      'All',
      ...new Set(
        items
          .map(item => clean(item.status))
          .filter(Boolean)
      )
    ];

    filter.innerHTML =
      statuses.map(status => `
        <option value="${escapeHTML(status)}">
          ${escapeHTML(status)}
        </option>
      `).join('');

    filter.onchange =
      () => renderOperationsList(items);
  }

  renderOperationsList(items);
}


function renderOperationsList(items) {

  const container =
    $('operationsList');

  if (!container) {
    return;
  }

  const filter =
    $('operationFilter');

  const selected =
    filter ? clean(filter.value) : 'All';

  const visible =
    selected === 'All'
      ? items
      : items.filter(
          item =>
            clean(item.status) === selected
        );

  if (!visible.length) {

    container.innerHTML =
      '<p class="empty">No operations match this filter.</p>';

    return;
  }

  container.innerHTML =
    visible.map(item => `

      <article class="operation">

        <div class="date">
          ${formatDate(item.date)}
        </div>

        <div>
          <h3>
            ${escapeHTML(item.operationName)}
          </h3>

          <small>
            ${escapeHTML(item.type || 'Operation')}
            ·
            ${escapeHTML(item.location || 'Classified')}
          </small>
        </div>

        <p>
          ${escapeHTML(item.lead || 'Unassigned')}
        </p>

        <p>
          ${escapeHTML(item.summary || 'No summary provided.')}
        </p>

        <span class="status ${clean(item.status).toLowerCase()}">
          ${escapeHTML(item.status || 'Pending')}
        </span>

      </article>

    `).join('');
}


/**
 * Render roster.
 */
function renderRoster(items) {

  const container =
    $('rosterGrid');

  if (!container) {
    return;
  }

  const search =
    $('rosterSearch');

  const filterContainer =
    $('unitFilters');

  const render = () => {

    const query =
      clean(search?.value).toLowerCase();

    const activeUnit =
      filterContainer?.dataset.activeUnit || 'All';

    const visible =
      items.filter(person => {

        const unitMatch =
          activeUnit === 'All' ||
          clean(person.unit) === activeUnit;

        const searchMatch =
          Object.values(person)
            .some(value =>
              clean(value)
                .toLowerCase()
                .includes(query)
            );

        return unitMatch && searchMatch;
      });

    if (!visible.length) {

      container.innerHTML =
        '<p class="empty">No personnel match the current search.</p>';

      return;
    }

    container.innerHTML =
      visible.map(person => {

        const name =
          person.codename ||
          person.username ||
          '?';

        return `

          <article class="roster">

            <span class="initial">
              ${escapeHTML(name.charAt(0))}
            </span>

            <h3>
              ${escapeHTML(name)}
            </h3>

            <p>
              ${escapeHTML(person.rank || 'Unranked')}
            </p>

            <footer>
              @${escapeHTML(person.username)}
              ·
              ${escapeHTML(person.unit || 'UNSC')}
            </footer>

          </article>

        `;

      }).join('');
  };


  if (filterContainer) {

    const units = [
      'All',
      ...new Set(
        items
          .map(person => clean(person.unit))
          .filter(Boolean)
      )
    ];

    filterContainer.innerHTML =
      units.map(unit => `

        <button
          type="button"
          data-unit="${escapeHTML(unit)}"
        >
          ${escapeHTML(unit)}
        </button>

      `).join('');

    filterContainer.dataset.activeUnit =
      'All';

    filterContainer
      .querySelectorAll('button')
      .forEach(button => {

        if (button.dataset.unit === 'All') {
          button.classList.add('active');
        }

        button.onclick = () => {

          filterContainer.dataset.activeUnit =
            button.dataset.unit;

          filterContainer
            .querySelectorAll('button')
            .forEach(b =>
              b.classList.remove('active')
            );

          button.classList.add('active');

          render();
        };
      });
  }


  if (search) {
    search.oninput = render;
  }

  render();
}


/**
 * Render morph generator.
 */
function renderMorphs(items) {

  const select =
    $('morphPreset');

  if (!select) {
    return;
  }

  const usable =
    items.filter(item =>
      enabled(item.active)
    );

  if (!usable.length) {

    select.innerHTML =
      '<option value="">No active presets</option>';

    return;
  }

  select.innerHTML =
    usable.map(item => `

      <option value="${escapeHTML(item.id)}">
        ${escapeHTML(item.label)}
        —
        ${escapeHTML(item.category || 'General')}
      </option>

    `).join('');


  const updateDescription = () => {

    const preset =
      usable.find(
        item =>
          clean(item.id) ===
          clean(select.value)
      );

    if ($('presetDescription')) {

      $('presetDescription').textContent =
        preset?.description ||
        'No description provided.';
    }
  };


  select.onchange =
    updateDescription;

  updateDescription();


  const form =
    $('morphForm');

  if (!form) {
    return;
  }


  form.onsubmit = event => {

    event.preventDefault();

    const preset =
      usable.find(
        item =>
          clean(item.id) ===
          clean(select.value)
      );

    if (!preset) {
      return;
    }

    const values = {

      username:
        clean($('morphUsername')?.value),

      codename:
        clean($('morphCodename')?.value),

      rank:
        clean($('morphRank')?.value)
    };


    const command =
      clean(preset.commandTemplate)
        .replace(
          /\{(username|codename|rank)\}/g,
          (_, key) => values[key]
        );


    if ($('morphResult')) {
      $('morphResult').textContent =
        command;
    }

    if ($('copyMorph')) {
      $('copyMorph').disabled =
        !command;

      $('copyMorph').onclick =
        async () => {

          try {

            await navigator.clipboard
              .writeText(command);

            if ($('copyFeedback')) {
              $('copyFeedback').textContent =
                'Copied to clipboard — ready to paste in-game.';
            }

          } catch {

            if ($('copyFeedback')) {
              $('copyFeedback').textContent =
                'Select and copy the command manually.';
            }
          }
        };
    }

    if ($('copyFeedback')) {
      $('copyFeedback').textContent =
        'Command generated. Verify your details before deploying.';
    }
  };
}


/**
 * Render Settings sheet.
 */
function renderSettings(settings) {

  const container =
    $('settingsGrid');

  if (!container) {
    return;
  }

  const entries =
    Object.entries(settings);

  if (!entries.length) {

    container.innerHTML =
      '<p class="empty">No system settings have been published.</p>';

    return;
  }

  container.innerHTML =
    entries.map(([key, value]) => `

      <article class="settings-card">

        <span class="tag">
          CONFIGURATION
        </span>

        <h3>
          ${escapeHTML(key)}
        </h3>

        <p>
          ${escapeHTML(value)}
        </p>

      </article>

    `).join('');
}


/**
 * Theme toggle.
 */
function setupTheme() {

  const button =
    $('themeButton');

  if (!button) {
    return;
  }

  button.onclick = () => {

    document.body
      .classList
      .toggle('high-contrast');

    localStorage.setItem(
      'unscContrast',
      document.body.classList.contains(
        'high-contrast'
      )
        ? 'true'
        : 'false'
    );
  };


  if (
    localStorage.getItem('unscContrast') === 'true'
  ) {
    document.body.classList.add(
      'high-contrast'
    );
  }
}


/**
 * Main application.
 */
async function load() {

  setupTheme();

  const page =
    currentPage();

  try {

    const data =
      await getData(page);

    applySettings(
      data.settings || {}
    );


    if (page === 'all') {
      renderDashboard(data);
    }


    if (page === 'operations') {
      renderOperations(
        data.operations || []
      );
    }


    if (page === 'roster') {
      renderRoster(
        data.roster || []
      );
    }


    if (page === 'announcements') {
      renderAnnouncements(
        data.announcements || []
      );
    }


    if (page === 'morphs') {
      renderMorphs(
        data.morphs || []
      );
    }


    if (page === 'settings') {
      renderSettings(
        data.settings || {}
      );
    }


    if ($('syncStatus')) {
      $('syncStatus').textContent =
        'ONLINE';
    }

    if ($('lastSync')) {
      $('lastSync').textContent =
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit'
          }
        );
    }

  } catch (error) {

    console.error(error);

    if ($('syncStatus')) {
      $('syncStatus').textContent =
        'OFFLINE';
    }

    if ($('lastSync')) {
      $('lastSync').textContent =
        'UNAVAILABLE';
    }

    document
      .querySelectorAll('.loading')
      .forEach(element => {
        element.textContent =
          'UNSC command uplink unavailable.';
      });
  }
}


load();
