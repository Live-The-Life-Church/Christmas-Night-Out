/**
 * RECOMMENDED REPLACEMENT: Family Photo Search JavaScript (No Escape-Key Collapse)
 * 
 * This is the updated JavaScript snippet for the Squarespace Santa Photos search page.
 * It removes the Escape-key handler that collapses search results, allowing results
 * to remain visible when the Escape key is pressed.
 * 
 * WHERE TO USE THIS:
 * - Paste this code into a Code Block in your Squarespace page
 * - Replace the existing search JavaScript with this updated version
 * - This should be used with the corresponding HTML and CSS from new_search.html
 * 
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed the Escape-key handler that called collapseResults()
 * - Escape key press no longer collapses search results
 * - All other functionality remains the same (search, expand, download)
 * 
 * MANIFEST URL:
 * - Uses: https://raw.githubusercontent.com/Live-The-Life-Church/Christmas-Night-Out/refs/heads/main/cno_2025_photos_manifest.json
 * - This URL points to the filtered manifest containing only santa-photos-2025 entries (sourcePage: santaphotobackend/santa-photos-2025#page)
 */

/* Manifest-based search + expand-on-results (no visible collapse button, no Escape-key collapse).
   Uses IDs: familySearch, familySearchBtn, searchCount, noResults
   Renders into #results-grid and toggles #search-results .expanded
*/
(async function () {
  const MANIFEST_URL = 'https://raw.githubusercontent.com/Live-The-Life-Church/Christmas-Night-Out/refs/heads/main/cno_2025_photos_manifest.json';

  const searchBox = document.getElementById('familySearch');
  const searchBtn = document.getElementById('familySearchBtn');
  const noResults = document.getElementById('noResults');
  const searchCount = document.getElementById('searchCount');

  const resultsSection = document.getElementById('search-results');
  const resultsGrid = document.getElementById('results-grid');
  const resultsCountEl = document.getElementById('results-count');

  // small helpers
  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
  function norm(text){
    if(!text) return '';
    // normalize diacritics, collapse whitespace, lowercase
    return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase().trim();
  }

  // load manifest
  let manifest = [];
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error('Manifest fetch failed: ' + res.status);
    const raw = await res.json();

    manifest = raw.map(m => ({
      url: (m.url || m.image || m.src || '').toString(),
      caption: (m.caption || '').toString().trim(),
      lastName: (m.lastName || '').toString(),
      firstName: (m.firstName || '').toString(),
      familyId: m.familyId || m.family || ''
    })).filter(m => m.url);

  } catch (err) {
    console.error('Failed to load manifest at', MANIFEST_URL, err);
    const inner = document.querySelector('.family-search-inner');
    if (inner) inner.insertAdjacentHTML('beforeend', '<p style="color: #ffbcbc; font-weight:700;">Failed to load photo manifest. Check MANIFEST_URL.</p>');
    return;
  }

  // download helpers
  function getFilenameFromUrl(url, caption) {
    if (!url) return (caption ? caption.replace(/\s+/g,'_') : 'photo') + '.jpg';
    try {
      const u = new URL(url, window.location.href);
      const name = (u.pathname.split('/').pop().split('?')[0]) || '';
      if (name) return name;
    } catch(e){}
    return (caption?caption.replace(/\s+/g,'_'):'photo') + '.jpg';
  }

  async function downloadViaFetch(url, filename, btn) {
    if (!url) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Downloading...'; }
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('Network response not OK: ' + res.status);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.style.display='none'; a.href = objUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.warn('fetch-download failed; opening that URL in a new tab as fallback', err);
      window.open(url, '_blank', 'noopener');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Download'; }
    }
  }

  // render a single card
  function createCard(obj){
    const card = document.createElement('div'); card.className = 'sr-card';
    const img = document.createElement('img'); img.src = obj.url; img.alt = obj.caption || 'Family photo';
    img.loading = 'lazy';

    const controls = document.createElement('div'); controls.className = 'sr-controls';
    const btn = document.createElement('button'); btn.className = 'sr-download'; btn.type = 'button'; btn.textContent = 'Download';
    btn.setAttribute('aria-label', 'Download photo');

    btn.addEventListener('click', function () {
      const filename = getFilenameFromUrl(obj.url, obj.caption);
      // Try direct download first (works in most browsers)
      const a = document.createElement('a');
      a.href = obj.url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Also trigger fetch-based download as fallback for CORS-protected images
      downloadViaFetch(obj.url, filename, btn);
    }, { passive: true });

    controls.appendChild(btn);
    card.appendChild(img);
    card.appendChild(controls);
    return card;
  }

  function clearResults() {
    resultsGrid.innerHTML = '';
  }

  function expandResults() {
    resultsSection.classList.add('expanded');
    resultsSection.setAttribute('aria-hidden', 'false');
  }
  function collapseResults() {
    resultsSection.classList.remove('expanded');
    resultsSection.setAttribute('aria-hidden', 'true');
  }

  // core search: case-insensitive token matching across caption/first/last
  function doSearchRaw(rawQuery) {
    const q = norm(rawQuery || '');
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    if (!tokens.length) {
      clearResults();
      collapseResults();
      searchCount.style.display = 'none';
      noResults.style.display = 'none';
      resultsCountEl.textContent = '';
      return;
    }

    const matches = manifest.filter(m => {
      const hay = norm((m.caption || '') + ' ' + (m.lastName || '') + ' ' + (m.firstName || ''));
      return tokens.every(t => hay.includes(t));
    });

    clearResults();

    if (matches.length) {
      const fragment = document.createDocumentFragment();
      matches.forEach(m => fragment.appendChild(createCard(m)));
      resultsGrid.appendChild(fragment);

      resultsCountEl.textContent = `${matches.length} result${matches.length>1?'s':''} for "${rawQuery.trim()}"`;
      searchCount.style.display = 'none';
      noResults.style.display = 'none';

      expandResults();

      const rect = resultsSection.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

    } else {
      resultsCountEl.textContent = '';
      clearResults();
      collapseResults();
      searchCount.style.display = 'none';
      noResults.style.display = 'block';
    }
  }

  // wire up input/button events
  // NOTE: Escape-key handler removed - no longer collapses results on Escape
  searchBtn.addEventListener('click', () => doSearchRaw(searchBox.value || ''));
  searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      doSearchRaw(searchBox.value || ''); 
    }
    // Escape-key handler intentionally removed:
    // Previously: else if (e.key === 'Escape') { collapseResults(); noResults.style.display = 'none'; searchBox.blur(); }
    // Now: Escape key has no effect on search results
  });

  // initial state
  clearResults();
  collapseResults();
  resultsCountEl.textContent = '';
  searchCount.style.display = 'none';
  noResults.style.display = 'none';

  // expose for debugging if needed
  window.__familyPhotoSearch = { doSearchRaw, manifestLength: manifest.length };
  console.log('Photo manifest loaded — items:', manifest.length);

})();
