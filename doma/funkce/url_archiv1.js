<!-- Univerzální plovoucí nástroj Myši pro práci s URL · Chceš myš? -->
<style>
  .mys-tool-btn {
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 1000;
    width: 44px; height: 44px; border-radius: 50%;
    border: 1px solid var(--accent, #a89880); background: var(--surface, #181410);
    color: var(--accent, #a89880); font-size: 1.1rem; cursor: pointer;
    transition: all .2s; display: flex; align-items: center; justify-content: center;
  }
  .mys-tool-btn:hover { background: var(--accent, #a89880); color: var(--bg, #0f0d0a); }

  .mys-tool-panel {
    display: none; position: fixed; z-index: 999; width: 340px; max-height: 400px;
    background: var(--surface, #181410); border: 1px solid var(--border, rgba(168,152,128,.3));
    border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.5);
    font-family: var(--mono, monospace); font-size: 13px; color: var(--cream, #e8e0d0);
    overflow: hidden; bottom: 4.5rem; right: 1.5rem;
  }
  .mys-tool-panel.visible { display: flex; flex-direction: column; }

  .mys-tool-tabs { display: flex; border-bottom: 1px solid var(--border, rgba(168,152,128,.2)); }
  .mys-tool-tab {
    flex: 1; padding: .6rem; text-align: center; cursor: pointer;
    color: var(--dim, rgba(232,224,208,.5)); font-size: .65rem;
    text-transform: uppercase; letter-spacing: .1em; transition: all .2s;
    border-bottom: 2px solid transparent;
  }
  .mys-tool-tab.active { color: var(--accent, #a89880); border-bottom-color: var(--accent, #a89880); }

  .mys-tool-content { flex: 1; overflow-y: auto; padding: .8rem; }

  .mys-url-item {
    border: 1px solid var(--border, rgba(168,152,128,.15)); padding: .5rem;
    margin-bottom: .4rem; border-radius: 3px; cursor: pointer;
    transition: background .15s;
  }
  .mys-url-item:hover { background: rgba(168,152,128,.05); }
  .mys-url-item .url-name { font-size: .75rem; margin-bottom: .3rem; }
  .mys-url-item .url-full {
    display: none; font-size: .6rem; color: var(--dim, rgba(232,224,208,.5));
    word-break: break-all; margin-bottom: .4rem;
  }
  .mys-url-item.open .url-full { display: block; }
  .mys-url-item .url-actions { display: none; gap: .3rem; }
  .mys-url-item.open .url-actions { display: flex; flex-wrap: wrap; }
  .mys-url-item button {
    background: none; border: 1px solid var(--accent, #a89880); color: var(--accent, #a89880);
    font-family: inherit; font-size: .6rem; padding: .2rem .6rem; cursor: pointer;
    border-radius: 2px; transition: all .15s;
  }
  .mys-url-item button:hover { background: var(--accent, #a89880); color: var(--bg, #0f0d0a); }

  .mys-tool-content input {
    width: 100%; padding: .4rem; background: var(--bg, #0f0d0a);
    border: 1px solid var(--border, rgba(168,152,128,.2)); color: var(--cream, #e8e0d0);
    font-family: inherit; font-size: .7rem; margin-bottom: .5rem;
  }
  .mys-tool-content .mys-hint {
    font-size: .6rem; color: var(--dim, rgba(232,224,208,.4)); margin-bottom: .6rem; font-style: italic; line-height: 1.5;
  }
</style>

<div class="mys-tool-btn" id="mysToolBtn" title="Nástroj Myši pro URL">🔗</div>
<div class="mys-tool-panel" id="mysToolPanel">
  <div class="mys-tool-tabs">
    <div class="mys-tool-tab active" data-tab="saved">📋 Uložené</div>
    <div class="mys-tool-tab" data-tab="create">➕ Vytvořit</div>
    <div class="mys-tool-tab" data-tab="import">📥 Importovat</div>
  </div>
  <div class="mys-tool-content" id="mysToolContent"></div>
</div>

<script>
(function() {
  const STORAGE = 'chcesmys_mys_urls';
  let urls = JSON.parse(localStorage.getItem(STORAGE) || '[]');
  let currentTab = 'saved';
  const panel = document.getElementById('mysToolPanel');
  const content = document.getElementById('mysToolContent');

  function save() { localStorage.setItem(STORAGE, JSON.stringify(urls)); }

  function render() {
    content.innerHTML = '';
    if (currentTab === 'saved') {
      if (urls.length === 0) {
        content.innerHTML = '<div class="mys-hint">Zatím žádné uložené odkazy. Vytvoř první.</div>';
        return;
      }
      urls.sort((a,b) => b.date - a.date).forEach((u, i) => {
        const div = document.createElement('div');
        div.className = 'mys-url-item';
        div.innerHTML = `
          <div class="url-name">${u.name || 'Bez názvu'}</div>
          <div class="url-full">${u.url}</div>
          <div class="url-actions">
            <button class="open-btn">↗ Otevřít</button>
            <button class="copy-btn">📋 Kopírovat</button>
            <button class="share-btn">↗ Sdílet</button>
            <button class="fav-btn">⭐ Oblíbené</button>
            <button class="delete-btn">🗑 Smazat</button>
          </div>
        `;
        // Rozbalení / sbalení karty
        div.addEventListener('click', function(e) {
          if (e.target.tagName === 'BUTTON') return;
          div.classList.toggle('open');
        });
        // Otevřít
        div.querySelector('.open-btn').addEventListener('click', function(e) { e.stopPropagation(); window.open(u.url, '_blank'); });
        // Kopírovat
        div.querySelector('.copy-btn').addEventListener('click', function(e) {
          e.stopPropagation(); navigator.clipboard?.writeText(u.url); alert('Zkopírováno');
        });
        // Sdílet
        div.querySelector('.share-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          if (navigator.share) navigator.share({ url: u.url });
          else { navigator.clipboard?.writeText(u.url); alert('Odkaz byl zkopírován pro sdílení.'); }
        });
        // Oblíbené
        div.querySelector('.fav-btn').addEventListener('click', function(e) {
          e.stopPropagation(); u.fav = !u.fav; save(); render();
        });
        if (u.fav) div.querySelector('.fav-btn').textContent = '⭐ Odebrat';
        // Smazat
        div.querySelector('.delete-btn').addEventListener('click', function(e) {
          e.stopPropagation(); if (confirm('Smazat tento odkaz?')) { urls.splice(i, 1); save(); render(); }
        });
        content.appendChild(div);
      });
    } else if (currentTab === 'create') {
      content.innerHTML = `
        <div class="mys-hint">Ulož si odkaz na aktuální kartu. Pojmenuj ho, ať víš, ke které pohádce nebo úhlu patří.</div>
        <input type="text" id="newName" placeholder="Název (např. Kocour – ironický úhel)">
        <button onclick="window.mysCreateUrl()" style="width:100%;margin-top:.5rem;background:var(--accent, #a89880);color:var(--bg, #0f0d0a);border:none;padding:.4rem;font-family:inherit;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;">Uložit odkaz</button>
      `;
    } else if (currentTab === 'import') {
      content.innerHTML = `
        <div class="mys-hint">Vlož odkaz, který ti někdo poslal, a otevři ho v tomto nástroji.</div>
        <input type="text" id="importUrl" placeholder="Vlož URL...">
        <button onclick="window.mysImportUrl()" style="width:100%;margin-top:.5rem;background:var(--accent, #a89880);color:var(--bg, #0f0d0a);border:none;padding:.4rem;font-family:inherit;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;">Otevřít</button>
      `;
    }
  }

  window.mysCreateUrl = function() {
    const name = document.getElementById('newName')?.value?.trim();
    if (!name) { alert('Zadej název.'); return; }
    urls.push({ name, url: window.location.href, date: Date.now(), fav: false });
    save(); currentTab = 'saved';
    document.querySelectorAll('.mys-tool-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'saved'));
    render();
  };

  window.mysImportUrl = function() {
    const url = document.getElementById('importUrl')?.value?.trim();
    if (url) window.open(url, '_blank');
  };

  window.toggleMysPanel = function() {
    panel.classList.toggle('visible');
    if (panel.classList.contains('visible')) render();
  };

  document.getElementById('mysToolBtn').addEventListener('click', window.toggleMysPanel);

  document.querySelectorAll('.mys-tool-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      currentTab = this.dataset.tab;
      document.querySelectorAll('.mys-tool-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      render();
    });
  });

  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && e.target.id !== 'mysToolBtn') panel.classList.remove('visible');
  });
})();
</script>
