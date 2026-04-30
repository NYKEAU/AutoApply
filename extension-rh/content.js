/**
 * RH Auto-Apply v2.0 — Content Script
 *
 * Fonctionnement :
 * 1. Sur les sites connus (LinkedIn, Indeed, Glassdoor) : extraction ciblée.
 * 2. Sur tout autre site : extraction générique + apprentissage par clic droit.
 *    - Clic droit sur "Postuler" → enseigne le sélecteur du bouton
 *    - Clic droit sur d'autres éléments → enseigne titre, entreprise, etc.
 *    - La config est sauvegardée par domaine dans chrome.storage.local
 */

// ─── Domaines connus ──────────────────────────────────────────────────────────

const KNOWN_DOMAINS = {
  'indeed.com':      'Indeed',
  'ca.indeed.com':   'Indeed',
  'fr.indeed.com':   'Indeed',
  'linkedin.com':    'LinkedIn',
  'glassdoor.com':   'Glassdoor',
  'glassdoor.ca':    'Glassdoor',
};

// Textes qui identifient un bouton "Postuler" (multi-langue)
const APPLY_TEXTS = [
  'postuler', 'apply', 'candidature simplifiée', 'easy apply',
  'postuler maintenant', 'apply now', 'candidater', 'je postule',
  'soumettre ma candidature', 'submit application', 'apply for job',
  'apply for this job', 'postuler à cette offre', 'postuler pour ce poste',
  'quick apply', 'one-click apply',
];

// ─── Helpers storage ──────────────────────────────────────────────────────────

function getDomainKey() {
  return window.location.hostname.replace(/^www\./, '');
}

function getPort() {
  return new Promise(resolve => {
    chrome.storage.sync.get('middlewarePort', d => resolve(d.middlewarePort || 3000));
  });
}

function getAuthToken() {
  return new Promise(resolve => {
    chrome.storage.sync.get('authToken', d => resolve(d.authToken || null));
  });
}

function loadSiteConfig(domain) {
  return new Promise(resolve => {
    chrome.storage.local.get('siteConfigs', d => {
      try {
        resolve((d.siteConfigs || {})[domain] || null);
      } catch (e) {
        console.error('Extension context invalidé, retourne null:', e);
        resolve(null);
      }
    });
  });
}

function saveSiteConfig(domain, patch) {
  return new Promise(resolve => {
    chrome.storage.local.get('siteConfigs', d => {
      const all = d.siteConfigs || {};
      all[domain] = { ...(all[domain] || {}), ...patch, updatedAt: new Date().toISOString() };
      chrome.storage.local.set({ siteConfigs: all }, resolve);
    });
  });
}

function deleteSiteConfig(domain) {
  return new Promise(resolve => {
    chrome.storage.local.get('siteConfigs', d => {
      const all = d.siteConfigs || {};
      delete all[domain];
      chrome.storage.local.set({ siteConfigs: all }, resolve);
    });
  });
}

// ─── Génération de sélecteur CSS stable ──────────────────────────────────────

function generateSelector(el) {
  if (!el || el === document.body || el === document.documentElement) return null;

  // 1. ID unique
  if (el.id) {
    try {
      const sel = '#' + CSS.escape(el.id);
      if (document.querySelectorAll(sel).length === 1) return sel;
    } catch (e) { /* ignore */ }
  }

  // 2. Attributs data stables (préférés car résistants aux refactos CSS)
  for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-automation-id', 'name']) {
    const val = el.getAttribute(attr);
    if (val) {
      const sel = `${el.tagName.toLowerCase()}[${attr}="${val}"]`;
      try {
        if (document.querySelectorAll(sel).length === 1) return sel;
      } catch (e) { /* ignore */ }
    }
  }

  // 3. aria-label pour les éléments interactifs
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    const sel = `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
    try {
      if (document.querySelectorAll(sel).length === 1) return sel;
    } catch (e) { /* ignore */ }
  }

  // 4. Construction d'un chemin jusqu'à 6 niveaux de profondeur
  const parts = [];
  let current = el;

  for (let depth = 0; depth < 6 && current && current !== document.body; depth++) {
    const tag = current.tagName.toLowerCase();

    // Ancrage sur ID intermédiaire
    if (current.id && depth > 0) {
      parts.unshift('#' + CSS.escape(current.id));
      break;
    }

    // Ancrage sur data attribute intermédiaire
    let anchor = null;
    for (const attr of ['data-testid', 'data-test', 'data-cy']) {
      const val = current.getAttribute(attr);
      if (val) { anchor = `[${attr}="${val}"]`; break; }
    }

    if (anchor) {
      parts.unshift(depth === 0 ? tag + anchor : anchor);
      break;
    }

    // Désambiguïsation par nth-of-type
    const parent = current.parentElement;
    let segment = tag;
    if (parent) {
      const sameTags = Array.from(parent.children).filter(c => c.tagName === current.tagName);
      if (sameTags.length > 1) {
        segment = `${tag}:nth-of-type(${sameTags.indexOf(current) + 1})`;
      }
    }

    parts.unshift(segment);

    // Vérifier si le chemin courant est déjà unique
    try {
      if (document.querySelectorAll(parts.join(' > ')).length === 1) break;
    } catch (e) { /* ignore */ }

    current = current.parentElement;
  }

  const selector = parts.join(' > ');

  // Validation finale
  try {
    if (document.querySelectorAll(selector).length > 0) return selector;
  } catch (e) { /* ignore */ }

  return el.tagName.toLowerCase();
}

// ─── Helpers d'échappement HTML ──────────────────────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;');
}

// ─── Helpers d'extraction texte ──────────────────────────────────────────────

function findText(selectors) {
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const el = document.querySelector(sel);
      const text = el?.innerText?.trim() || el?.textContent?.trim();
      if (text) return text;
    } catch (e) { /* sélecteur invalide */ }
  }
  return null;
}

function extractSalary(container) {
  if (!container) return 'Non défini';
  const text = container.innerText || container.textContent || '';
  const regex = /(\d[\d\s]*[kK€$£][^\n\r]*|\$[\d,.]+([\s\-–]*\$[\d,.]+)?(\/\w+)?|\b\d{2,3}[kK]\b|\b\d{2,3}[,.]\d{3}\s*€?\b)/g;
  const m = text.match(regex);
  return m ? m[0].trim() : 'Non défini';
}

function cleanTitle(title) {
  return title
    .replace(/\s*-\s*job post\s*$/i, '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s*-\s*emploi.*$/i, '')
    .trim();
}

function getTitleFromPageTitle() {
  const parts = (document.title || '').split(/\s[-–|]\s/);
  return parts[0]?.trim() || null;
}

function getCompanyFromPageTitle() {
  const parts = (document.title || '').split(/\s[-–|]\s/);
  return parts[1]?.trim() || null;
}

// ─── Extracteurs spécifiques (sites connus) ───────────────────────────────────

function getJobDataLinkedIn() {
  const poste = findText([
    'h1.job-details-jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-details-top-card__job-title',
    'h1.t-24',
    'h1',
  ]) || getTitleFromPageTitle();

  const entreprise = findText([
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__subtitle-primary-grouping a',
    '.topcard__org-name-link',
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
    '.jobs-details-top-card__company-url',
  ]) || getCompanyFromPageTitle();

  const location = findText([
    '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__workplace-type',
    '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
  ]);

  const descEl = document.querySelector(
    '.jobs-description__content .jobs-description-content__text,' +
    '.jobs-description__content,' +
    '.jobs-description-content__text,' +
    '.job-view-layout .jobs-box__html-content,' +
    '#job-details,' +
    '.jobs-description'
  );

  const salaryEl = document.querySelector(
    '.job-details-jobs-unified-top-card__job-insight,' +
    '.jobs-unified-top-card__salary-main-rail-card,' +
    '.compensation__salary,' +
    '[data-test-id="compensation"]'
  );

  return {
    entreprise: entreprise || 'Inconnu',
    poste: poste ? cleanTitle(poste) : 'Inconnu',
    statut: 'Postulé',
    salary: extractSalary(salaryEl),
    applicationLink: window.location.href,
    source: 'LinkedIn',
    location: location || 'Inconnu',
    hrDetails: descEl?.innerText?.trim().substring(0, 3000) || '',
  };
}

function getJobDataIndeed() {
  const poste = findText([
    'h1[data-testid="jobsearch-JobInfoHeader-title"]',
    'h2[data-testid="jobsearch-JobInfoHeader-title"]',
    'h1.jobTitle',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '#mosaic-vjHeaderSection h1',
    '.jobsearch-ViewJobLayout h1',
  ]) || getTitleFromPageTitle();

  const entreprise = findText([
    '[data-testid="inlineHeader-companyName"] a',
    '[data-testid="inlineHeader-companyName"]',
    '[data-company-name="true"]',
    '[data-testid="jobsearch-InlineCompanyRating-companyHeader"] a',
    '.jobsearch-InlineCompanyRating a',
    'a[data-testid="jobsearch-EmployerLinkLabel"]',
    '#viewJobSSRRoot a[target="_blank"]',
  ]) || getCompanyFromPageTitle();

  const location = findText([
    '[data-testid="job-location"]',
    '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
    '[data-testid="inlineHeader-companyLocation"]',
  ]);

  const descEl = document.querySelector(
    '#jobDescriptionText,' +
    '[data-testid="jobDescriptionText"],' +
    '.jobsearch-jobDescriptionText,' +
    '#jobDescription'
  );

  // Extraction salaire Indeed (plusieurs méthodes)
  let salary = 'Non défini';

  const salaryGroupEl = document.querySelector(
    'div[role="group"][aria-label="Salaire"],' +
    'div[role="group"][aria-label="Salary"],' +
    'div[role="group"][aria-label="Pay"]'
  );
  if (salaryGroupEl) {
    const span = salaryGroupEl.querySelector('span');
    salary = span
      ? span.textContent?.trim().replace(/\u00A0/g, ' ') || 'Non défini'
      : extractSalary(salaryGroupEl);
  }

  if (salary === 'Non défini') {
    const tileBtns = document.querySelectorAll('button[data-testid$="-tile"]');
    for (const btn of tileBtns) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('salaire') || label.includes('salary') || label.includes('pay')) {
        const span = btn.querySelector('span');
        if (span) { salary = span.textContent?.trim().replace(/\u00A0/g, ' ') || 'Non défini'; break; }
      }
    }
  }

  if (salary === 'Non défini') {
    const el = document.querySelector(
      '[data-testid="attribute_snippet_testid"],' +
      '[data-testid="jobsearch-SalaryEstimate"],' +
      '#salaryInfoAndJobType'
    );
    if (el) salary = extractSalary(el);
  }

  if (salary === 'Non défini') {
    const wrapper = document.getElementById('jobsearch-ViewjobPaneWrapper')
      || document.querySelector('.jobsearch-ViewJobLayout');
    if (wrapper) salary = extractSalary(wrapper);
  }

  return {
    entreprise: entreprise || 'Inconnu',
    poste: poste ? cleanTitle(poste) : 'Inconnu',
    statut: 'Postulé',
    salary,
    applicationLink: window.location.href,
    source: 'Indeed',
    location: location || 'Inconnu',
    hrDetails: descEl?.innerText?.trim().substring(0, 3000) || '',
  };
}

function getJobDataGlassdoor() {
  const poste = document.querySelector('h1[id*="jd-job-title"], h1.heading_Level1__w42c9, h1')?.innerText?.trim()
    || getTitleFromPageTitle();

  const entrepriseRaw = document.querySelector('[class*="EmployerProfile_employerName"], [class*="EmployerProfile"]')?.innerText?.trim() || '';
  const entreprise = entrepriseRaw.split('\n')[0].trim() || getCompanyFromPageTitle();

  const location = document.querySelector('[data-test="location"], [class*="JobDetails_location"]')?.innerText?.trim() || 'Inconnu';
  const salaryEl = document.querySelector('[data-test="detailSalary"], [class*="JobCard_salaryEstimate"]');
  const descEl = document.querySelector('[class*="JobDetails_jobDescriptionWrapper"], [class*="jobDesc"], [id*="JobDescriptionContainer"]');

  return {
    entreprise: entreprise || 'Inconnu',
    poste: poste ? cleanTitle(poste) : 'Inconnu',
    statut: 'Postulé',
    salary: extractSalary(salaryEl),
    applicationLink: window.location.href,
    source: 'Glassdoor',
    location,
    hrDetails: descEl?.innerText?.trim().substring(0, 3000) || '',
  };
}

// ─── Extracteur générique (sites inconnus/appris) ─────────────────────────────

function getJobDataGeneric(domain, cfg) {
  cfg = cfg || {};

  const poste = findText([
    cfg.jobTitle,
    'h1',
    '[class*="job-title" i]',
    '[class*="jobtitle" i]',
    '[id*="job-title" i]',
    '[data-testid*="title" i]',
    '[itemprop="title"]',
  ]) || getTitleFromPageTitle();

  const entreprise = findText([
    cfg.company,
    '[class*="company-name" i]',
    '[class*="employer-name" i]',
    '[class*="employerName" i]',
    '[itemprop="hiringOrganization"] [itemprop="name"]',
    '[itemprop="hiringOrganization"]',
    '[data-testid*="company" i]',
  ]) || getCompanyFromPageTitle();

  const location = findText([
    cfg.location,
    '[class*="location" i]',
    '[data-testid*="location" i]',
    '[itemprop="jobLocation"]',
    '[class*="city" i]',
  ]);

  let salary = 'Non défini';
  const salarySelectors = [cfg.salary, '[class*="salary" i]', '[class*="salaire" i]', '[data-testid*="salary" i]', '[class*="compensation" i]', '[class*="remuneration" i]'].filter(Boolean);
  if (salarySelectors.length) {
    try {
      const el = document.querySelector(salarySelectors.join(', '));
      if (el) salary = extractSalary(el);
    } catch (e) { /* ignore */ }
  }

  const descSelectors = [
    cfg.description,
    '[class*="job-description" i]',
    '[class*="jobdescription" i]',
    '[id*="job-description" i]',
    '[class*="description" i]',
    '[itemprop="description"]',
    'article',
    'main',
  ].filter(Boolean);

  let descEl = null;
  try { descEl = document.querySelector(descSelectors.join(', ')); } catch (e) { /* ignore */ }

  // Label de source = nom du domaine stylisé
  const baseName = domain.split('.')[0];
  const sourceName = cfg.name || (KNOWN_DOMAINS[domain] || (baseName.charAt(0).toUpperCase() + baseName.slice(1)));


  return {
    entreprise: entreprise || 'Inconnu',
    poste: poste ? cleanTitle(poste) : 'Inconnu',
    statut: 'Postulé',
    salary,
    applicationLink: window.location.href,
    source: sourceName,
    location: location || 'Inconnu',
    hrDetails: descEl?.innerText?.trim().substring(0, 3000) || '',
  };
}

// ─── Modale de confirmation ───────────────────────────────────────────────────

const CONFIRM_FIELDS = [
  { key: 'poste',      label: '📝 Poste',       configKey: 'jobTitle'    },
  { key: 'entreprise', label: '🏢 Entreprise',   configKey: 'company'     },
  { key: 'location',   label: '📍 Lieu',         configKey: 'location'    },
  { key: 'salary',     label: '💰 Salaire',      configKey: 'salary'      },
];

/**
 * Affiche la modale de confirmation des données extraites.
 * @param {object}   jobData   Données extraites (pré-remplissage)
 * @param {string}   domain    Domaine courant (pour la sauvegarde)
 * @param {Function} onConfirm Callback(confirmedJobData) quand l'utilisateur valide
 */
function createConfirmModal(jobData, domain, onConfirm) {
  document.getElementById('aa-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'aa-modal';
  modal.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'width:330px',
    'background:#1a1a2e', 'border:1px solid #4285f4', 'border-radius:10px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.5)', 'z-index:2147483647',
    'font-family:Arial,sans-serif', 'font-size:13px', 'color:#e0e0e0',
    'overflow:hidden', 'transition:opacity .2s',
  ].join(';');

  modal.innerHTML = `
    <div id="aa-header" style="background:#4285f4;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;">
      <span style="font-weight:bold;font-size:13px;">📩 Confirmer la candidature</span>
      <button id="aa-close" style="background:none;border:none;color:#fff;cursor:pointer;font-size:17px;line-height:1;padding:0 2px;">×</button>
    </div>

    <div id="aa-body" style="padding:12px;display:flex;flex-direction:column;gap:8px;">
      ${CONFIRM_FIELDS.map(f => `
        <div>
          <div style="font-size:10px;color:#888;margin-bottom:3px;">${f.label}</div>
          <div style="display:flex;gap:5px;align-items:center;">
            <input
              id="aa-f-${f.key}"
              data-field="${f.key}"
              data-config-key="${f.configKey}"
              data-state="auto"
              value="${escapeHTML(jobData[f.key] || '')}"
              placeholder="Non défini"
              style="flex:1;background:#0f0f1e;border:1px solid #444;border-radius:5px;padding:6px 8px;color:#fff;font-size:12px;outline:none;min-width:0;"
            >
            <button
              class="aa-pick"
              data-field="${f.key}"
              data-config-key="${f.configKey}"
              title="Sélectionner sur la page"
              style="background:#0f0f1e;border:1px solid #555;border-radius:5px;padding:5px 7px;cursor:pointer;color:#aaa;font-size:12px;flex-shrink:0;transition:border-color .15s;"
            >🎯</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div id="aa-footer" style="padding:10px 12px;border-top:1px solid #2a2a4a;display:flex;flex-direction:column;gap:8px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#aaa;cursor:pointer;">
        <input type="checkbox" id="aa-mem" checked>
        💾 Mémoriser les sélections pour ce site
      </label>
      <div style="display:flex;gap:8px;">
        <button id="aa-cancel" style="flex:1;padding:7px;background:#2a2a4a;border:none;border-radius:5px;color:#ccc;cursor:pointer;font-size:12px;">Annuler</button>
        <button id="aa-send"   style="flex:1;padding:7px;background:#34a853;border:none;border-radius:5px;color:#fff;cursor:pointer;font-size:12px;font-weight:bold;">✅ Envoyer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ── Fermeture
  modal.querySelector('#aa-close').onclick  = () => modal.remove();
  modal.querySelector('#aa-cancel').onclick = () => modal.remove();

  // ── Saisie manuelle → état "edited" (jaune)
  modal.querySelectorAll('input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.dataset.state = 'edited';
      inp.style.borderColor = '#fbbc05';
    });
  });

  // ── Boutons 🎯 → mode sélection
  modal.querySelectorAll('.aa-pick').forEach(btn => {
    btn.onclick = () => startPickMode(modal, btn.dataset.field, btn.dataset.configKey);
  });

  // ── Envoi
  modal.querySelector('#aa-send').onclick = async () => {
    const memorize = modal.querySelector('#aa-mem').checked;
    const updatedData = { ...jobData };
    const selectorsToSave = {};

    modal.querySelectorAll('input[data-field]').forEach(inp => {
      const val = inp.value.trim();
      if (val) updatedData[inp.dataset.field] = val;
      if (memorize && inp.dataset.state === 'picked' && inp.dataset.selector) {
        selectorsToSave[inp.dataset.configKey] = inp.dataset.selector;
      }
    });

    if (memorize && Object.keys(selectorsToSave).length > 0) {
      await saveSiteConfig(domain, selectorsToSave);
    }

    modal.remove();
    onConfirm(updatedData);
  };

  // ── Drag (déplacement de la modale)
  makeDraggable(modal, modal.querySelector('#aa-header'));

  return modal;
}

/**
 * Rend une modale déplaçable par son header.
 */
function makeDraggable(el, handle) {
  let startX, startY, startLeft, startBottom;

  handle.addEventListener('mousedown', e => {
    if (e.target.id === 'aa-close') return;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    startLeft = rect.left;
    startBottom = window.innerHeight - rect.bottom;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = startLeft + 'px';
    el.style.top  = rect.top + 'px';

    function onMove(e) {
      el.style.left = (startLeft + e.clientX - startX) + 'px';
      el.style.top  = (rect.top  + e.clientY - startY) + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/**
 * Active le mode "point & click" pour sélectionner un élément de la page.
 * La modale se réduit, un bandeau guide l'utilisateur, l'élément cliqué
 * met à jour le champ correspondant + génère le sélecteur CSS.
 */
function startPickMode(modal, fieldKey, configKey) {
  const FIELD_NAMES = {
    poste:      'titre du poste',
    entreprise: 'nom de l\'entreprise',
    location:   'localisation',
    salary:     'salaire',
  };

  // Minimiser la modale
  const body   = modal.querySelector('#aa-body');
  const footer = modal.querySelector('#aa-footer');
  body.style.display   = 'none';
  footer.style.display = 'none';
  modal.style.opacity  = '0.4';
  modal.style.pointerEvents = 'none';

  // Bandeau de guidage
  const banner = document.createElement('div');
  banner.id = 'aa-pick-banner';
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0',
    'background:#4285f4', 'color:#fff', 'padding:10px 16px',
    'font-family:Arial,sans-serif', 'font-size:13px', 'font-weight:bold',
    'z-index:2147483647', 'display:flex', 'align-items:center',
    'justify-content:space-between', 'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
  ].join(';');
  banner.innerHTML = `
    <span>👆 Clique sur le <u>${FIELD_NAMES[fieldKey] || fieldKey}</u></span>
    <button id="aa-pick-cancel" style="background:rgba(0,0,0,0.25);border:none;color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Annuler</button>
  `;
  document.body.appendChild(banner);

  // Curseur crosshair sur toute la page
  document.documentElement.style.cursor = 'crosshair';

  let hovered = null;

  function highlight(el) {
    if (hovered && hovered !== el) unhighlight(hovered);
    if (!el || el === banner || el.closest('#aa-pick-banner') || el.closest('#aa-modal')) return;
    hovered = el;
    el.style.outline      = '2px solid #4285f4';
    el.style.outlineOffset = '2px';
  }

  function unhighlight(el) {
    if (!el) return;
    el.style.outline      = '';
    el.style.outlineOffset = '';
    hovered = null;
  }

  function cleanup() {
    unhighlight(hovered);
    document.removeEventListener('mouseover', onOver,  true);
    document.removeEventListener('click',     onClick, true);
    document.documentElement.style.cursor = '';
    banner.remove();
    body.style.display   = '';
    footer.style.display = '';
    modal.style.opacity  = '1';
    modal.style.pointerEvents = 'auto';
  }

  function onOver(e) {
    highlight(e.target);
  }

  function onClick(e) {
    if (e.target.closest('#aa-pick-banner')) return;
    e.preventDefault();
    e.stopPropagation();

    const el  = e.target;
    const text = (el.innerText || el.textContent || el.value || '').trim();
    // Pour le salaire, on prend le texte du parent si l'élément est trop petit
    const effectiveText = text.length < 3 && el.parentElement
      ? (el.parentElement.innerText || el.parentElement.textContent || '').trim()
      : text;

    const selector = generateSelector(el);
    const input = modal.querySelector(`#aa-f-${fieldKey}`);

    if (input && effectiveText) {
      input.value          = effectiveText.split('\n')[0].trim(); // première ligne seulement
      input.dataset.state   = 'picked';
      input.dataset.selector = selector;
      input.style.borderColor = '#34a853'; // vert = sélectionné depuis la page
    }

    cleanup();
  }

  document.addEventListener('mouseover', onOver,  true);
  document.addEventListener('click',     onClick, true);
  document.getElementById('aa-pick-cancel').onclick = cleanup;
}

// ─── Overlay "Envoyer au middleware" ──────────────────────────────────────────

function isApplyButtonText(el) {
  const text = (el.innerText || el.textContent || el.value || '').toLowerCase().trim();
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  const combined = text + ' ' + aria;
  return APPLY_TEXTS.some(t => combined.includes(t));
}

function attachOverlay(originalEl, domain, siteConfig) {
  if (originalEl.dataset.rhModified) return;
  originalEl.dataset.rhModified = 'true';

  // Les éléments void (input) ne peuvent pas avoir d'enfants — on les wrappe
  let container = originalEl;
  if (originalEl.tagName === 'INPUT') {
    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'display:inline-block;position:relative;';
    originalEl.parentNode?.insertBefore(wrapper, originalEl);
    wrapper.appendChild(originalEl);
    container = wrapper;
  }

  const overlay = document.createElement('button');
  overlay.innerText = '📩 AutoApply';
  overlay.setAttribute('data-autoapply-overlay', 'true');
  overlay.style.cssText =
    'position:absolute;top:0;right:0;background:#4285f4;color:white;' +
    'border:none;padding:5px 8px;border-radius:3px;cursor:pointer;' +
    'font-size:11px;font-weight:bold;z-index:9999;white-space:nowrap;' +
    'line-height:1.2;';

  overlay.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const [port, token] = await Promise.all([getPort(), getAuthToken()]);

    if (!token) {
      showNotification('Token manquant. Connecte-toi sur le dashboard puis copie ton token dans le popup de l\'extension.', 'error');
      return;
    }

    const cfg = await loadSiteConfig(domain);
    let jobData;

    if (domain.includes('linkedin.com')) {
      jobData = getJobDataLinkedIn();
    } else if (domain.includes('indeed.com')) {
      jobData = getJobDataIndeed();
    } else if (domain.includes('glassdoor.com')) {
      jobData = getJobDataGlassdoor();
    } else {
      jobData = getJobDataGeneric(domain, cfg);
    }

    if (!jobData) {
      showNotification('Impossible de récupérer les informations de l\'annonce.', 'error');
      return;
    }

    // ── Afficher la modale de confirmation AVANT de cliquer sur le bouton original
    // (si on clique d'abord, la page peut naviguer avant que l'utilisateur confirme)
    createConfirmModal(jobData, domain, async (confirmedData) => {
      overlay.innerText = '⏳ Envoi...';
      overlay.disabled = true;

      // Déclencher le clic original maintenant que l'utilisateur a confirmé
      originalEl.dataset.rhModified = 'skip';
      try {
        const rect = originalEl.getBoundingClientRect();
        originalEl.dispatchEvent(new MouseEvent('click', {
          view: window, bubbles: true, cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }));
      } catch (err) { originalEl.click(); }

      // Envoyer les données confirmées au middleware
      try {
        const res = await fetch(`http://localhost:${port}/api/candidatures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(confirmedData),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur serveur');

        const currentCfg = await loadSiteConfig(domain);
        await saveSiteConfig(domain, {
          count: (currentCfg?.count || 0) + 1,
          name: confirmedData.source,
        });

        overlay.innerText = '✅ Envoyé !';
        setTimeout(() => {
          overlay.innerText = '📩 AutoApply';
          overlay.disabled = false;
          originalEl.dataset.rhModified = 'true';
        }, 3000);

      } catch (err) {
        console.error('[AutoApply] Erreur envoi:', err);
        overlay.innerText = '❌ Erreur';
        overlay.disabled = false;
        originalEl.dataset.rhModified = 'true';
        showNotification(`❌ Erreur d'envoi : ${err.message}`, 'error');
      }
    });
  };

  container.style.position = 'relative';
  container.appendChild(overlay);
}

async function addApplyOverlay() {
  const domain = getDomainKey();
  const siteConfig = await loadSiteConfig(domain);

  const candidates = document.querySelectorAll('button, a[href], input[type="submit"]');

  candidates.forEach(button => {
    // Ignorer les overlays déjà créés par nous
    if (button.getAttribute('data-autoapply-overlay')) return;
    if (button.dataset.rhModified) return;

    let shouldAttach = false;

    // 1. Texte du bouton correspond à un bouton "postuler"
    if (isApplyButtonText(button)) {
      shouldAttach = true;
    }

    // 2. Le bouton correspond au sélecteur appris pour ce site
    if (!shouldAttach && siteConfig?.applyButton) {
      try {
        const saved = document.querySelectorAll(siteConfig.applyButton);
        if (Array.from(saved).includes(button)) shouldAttach = true;
      } catch (e) { /* sélecteur invalide */ }
    }

    if (shouldAttach) {
      attachOverlay(button, domain, siteConfig);
    }
  });
}

// ─── Mode enseignement (clic droit) ──────────────────────────────────────────

let lastRightClickedElement = null;

document.addEventListener('contextmenu', e => {
  lastRightClickedElement = e.target;
});

async function teachElement(type) {
  const domain = getDomainKey();

  if (type === 'resetSite') {
    await deleteSiteConfig(domain);
    showNotification(`🗑️ Config de « ${domain} » supprimée`, 'info');
    return;
  }

  const el = lastRightClickedElement;
  if (!el) {
    showNotification('❌ Aucun élément mémorisé. Refais un clic droit sur l\'élément.', 'error');
    return;
  }

  const selector = generateSelector(el);
  if (!selector) {
    showNotification('❌ Impossible de générer un sélecteur pour cet élément.', 'error');
    return;
  }

  let matchCount = 0;
  try { matchCount = document.querySelectorAll(selector).length; } catch (e) { /* ignore */ }

  const patch = {};
  patch[type] = selector;
  await saveSiteConfig(domain, patch);

  const labels = {
    applyButton: 'Bouton Postuler',
    jobTitle:    'Titre du poste',
    company:     'Entreprise',
    location:    'Localisation',
    salary:      'Salaire',
    description: 'Description',
  };

  const label = labels[type] || type;
  showNotification(
    `✅ ${label} appris sur « ${domain} »\n${matchCount} élément(s) correspondant(s)\nSélecteur : ${selector}`,
    'success'
  );

  // Si c'est le bouton postuler → attacher l'overlay aux éléments qui correspondent
  // au sélecteur appris et qui n'ont pas encore d'overlay
  if (type === 'applyButton') {
    const freshCfg = await loadSiteConfig(domain);
    if (freshCfg?.applyButton) {
      try {
        document.querySelectorAll(freshCfg.applyButton).forEach(btn => {
          if (!btn.dataset.rhModified && !btn.getAttribute('data-autoapply-overlay')) {
            attachOverlay(btn, domain, freshCfg);
          }
        });
      } catch (e) { /* sélecteur invalide */ }
    }
  }
}

// ─── Notification UI ──────────────────────────────────────────────────────────

function showNotification(message, type = 'success') {
  const existing = document.getElementById('autoapply-notif');
  if (existing) existing.remove();

  const colors = {
    success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    error:   { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    info:    { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
  };
  const c = colors[type] || colors.info;

  // Positionnement : bas-gauche pour ne pas chevaucher la modale (bas-droite)
  const notif = document.createElement('div');
  notif.id = 'autoapply-notif';
  notif.style.cssText = [
    'position:fixed', 'bottom:20px', 'left:20px',
    `background:${c.bg}`, `border:1px solid ${c.border}`, `color:${c.text}`,
    'padding:10px 14px', 'border-radius:6px', 'font-size:13px',
    'font-family:Arial,sans-serif', 'z-index:2147483647', 'max-width:420px',
    'box-shadow:0 2px 10px rgba(0,0,0,0.15)', 'white-space:pre-line', 'line-height:1.5',
  ].join(';');
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

// ─── Messages depuis background.js ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'teachElement') {
    teachElement(msg.type);
    sendResponse({ ok: true });
  }
  return true; // garder le canal ouvert pour réponses asynchrones
});

// ─── Initialisation ───────────────────────────────────────────────────────────


addApplyOverlay();

// Observer les changements DOM (SPA : LinkedIn, Indeed…)
let debounce = null;
new MutationObserver(() => {
  clearTimeout(debounce);
  debounce = setTimeout(addApplyOverlay, 600);
}).observe(document.body, { childList: true, subtree: true });

// Observer les changements d'URL (navigation SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(addApplyOverlay, 1200);
  }
}).observe(document, { subtree: true, childList: true });
