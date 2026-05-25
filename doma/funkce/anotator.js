(function () {
  const HESLO = 'anotator';
  const SK = 'anot_' + location.pathname.replace(/[^a-z0-9]/gi, '_');

  let editing = false;
  let showAnnotations = true;
  let selectMode = false;
  let addMode = false;
  let selectedEl = null;
  let elMenu = null;
  let notes = {};
  let audioBlob = null;
  let audioRecorder = null;
  let audioChunks = [];
  let screenRecorder = null;
  let screenBlob = null;
  let panel = null;
  let notebook = null;
  let notebookOpen = false;

  try { notes = JSON.parse(localStorage.getItem(SK)) || {}; } catch (e) {}
  function save() { localStorage.setItem(SK, JSON.stringify(notes)); }

  // ── SELEKTOR ──────────────────────────────────────────────
  function getSel(el) {
    if (el.id) return '#' + el.id;
    const path = [];
    while (el && el !== document.body) {
      let seg = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const cls = el.className.trim().split(/\s+/).filter(c => !c.startsWith('anot-')).slice(0, 2).join('.');
        if (cls) seg += '.' + cls;
      }
      const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.tagName === el.tagName) : [];
      if (sibs.length > 1) seg += ':nth-child(' + (sibs.indexOf(el) + 1) + ')';
      path.unshift(seg);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  // ── STYLY ─────────────────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
    #anot-mys {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 999990;
      width: 48px; height: 48px;
      background: none; border: none;
      cursor: pointer; padding: 0;
      transform: rotate(180deg);
      transition: transform 0.5s ease;
    }
    #anot-mys img {
      width: 100%; height: 100%;
      display: block;
      filter: brightness(0) invert(1);
      drop-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    #anot-mys.active { transform: rotate(90deg); }

    #anot-panel {
      position: fixed;
      z-index: 999995;
      background: rgba(15,13,10,0.97);
      backdrop-filter: blur(12px);
      border: 1px solid #444;
      border-radius: 6px;
      font-family: 'DM Mono', 'Courier New', monospace;
      font-size: 0.72rem;
      color: #e8e0d5;
      width: 230px;
      display: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
      user-select: none;
    }
    #anot-panel-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.6rem;
      border-bottom: 1px solid #2a2a2a;
      cursor: grab;
      background: rgba(255,255,255,0.04);
      border-radius: 6px 6px 0 0;
      touch-action: none;
    }
    #anot-panel-header:active { cursor: grabbing; }
    #anot-panel-drag { opacity: 0.4; font-size: 0.75rem; cursor: grab; }
    #anot-panel-title { flex: 1; font-size: 0.65rem; letter-spacing: 0.08em; opacity: 0.6; }
    #anot-panel-close {
      background: none; border: none; color: #e8e0d5;
      cursor: pointer; opacity: 0.4; font-size: 0.9rem; padding: 0; line-height: 1;
    }
    #anot-panel-close:hover { opacity: 1; }

    .anot-section { border-bottom: 1px solid #1e1e1e; }
    .anot-section:last-child { border-bottom: none; }
    .anot-sec-head {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.42rem 0.6rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .anot-sec-head:hover { background: rgba(255,255,255,0.05); }
    .anot-sec-ico { width: 1.1rem; text-align: center; font-size: 0.8rem; }
    .anot-sec-lbl { flex: 1; }
    .anot-sec-arr { opacity: 0.3; font-size: 0.55rem; transition: transform 0.2s; }
    .anot-sec-head.open .anot-sec-arr { transform: rotate(90deg); }

    .anot-sec-body {
      display: none;
      padding: 0.3rem 0.6rem 0.45rem 2rem;
      flex-direction: column;
      gap: 0.22rem;
    }
    .anot-sec-body.open { display: flex; }

    .ab {
      background: rgba(255,255,255,0.07);
      border: 1px solid #3a3a3a;
      color: #e8e0d5;
      border-radius: 3px;
      padding: 0.2rem 0.45rem;
      cursor: pointer;
      font-size: 0.66rem;
      font-family: inherit;
      text-align: left;
      transition: background 0.15s;
      display: flex; align-items: center; gap: 0.3rem;
      white-space: nowrap;
    }
    .ab:hover { background: rgba(255,255,255,0.16); }
    .ab.on { background: rgba(212,165,116,0.25); border-color: #d4a574; }
    .ab.rec { background: rgba(180,40,40,0.4); border-color: #c44; animation: apulse 1s infinite; }
    .ab:disabled { opacity: 0.35; cursor: not-allowed; }
    @keyframes apulse { 0%,100%{opacity:1} 50%{opacity:0.55} }

    .arow { display: flex; gap: 0.22rem; flex-wrap: wrap; }
    .astat { font-size: 0.58rem; opacity: 0.45; font-style: italic; margin-top: 0.1rem; }

    /* Element menu */
    #anot-el-menu {
      position: fixed;
      z-index: 999998;
      background: rgba(15,13,10,0.98);
      border: 1px solid #555;
      border-radius: 5px;
      padding: 0.3rem;
      display: none;
      flex-direction: column;
      gap: 0.18rem;
      box-shadow: 0 6px 24px rgba(0,0,0,0.8);
      font-family: 'DM Mono', monospace;
      min-width: 170px;
      touch-action: none;
    }
    #anot-el-menu .em-title {
      font-size: 0.57rem; opacity: 0.38;
      padding: 0 0.15rem 0.15rem;
      border-bottom: 1px solid #2a2a2a;
      margin-bottom: 0.05rem;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* Zápisník */
    #anot-notebook {
      position: fixed;
      z-index: 999997;
      right: -310px;
      top: 0; width: 290px; height: 100vh;
      background: rgba(12,11,9,0.98);
      border-left: 1px solid #444;
      backdrop-filter: blur(14px);
      transition: right 0.32s ease;
      display: flex; flex-direction: column;
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      color: #e8e0d5;
      box-shadow: -8px 0 32px rgba(0,0,0,0.6);
    }
    #anot-notebook.open { right: 0; }
    #anot-nb-head {
      padding: 0.8rem 1rem;
      border-bottom: 1px solid #222;
      display: flex; align-items: center;
    }
    #anot-nb-head h3 { margin: 0; flex: 1; font-size: 0.8rem; font-weight: 400; }
    #anot-nb-close {
      background: none; border: none; color: #e8e0d5;
      cursor: pointer; opacity: 0.4; font-size: 1rem;
    }
    #anot-nb-close:hover { opacity: 1; }
    #anot-nb-body { flex: 1; overflow-y: auto; padding: 0.5rem 0.8rem; }
    #anot-nb-foot {
      padding: 0.5rem 0.8rem; border-top: 1px solid #222;
      display: flex; gap: 0.3rem;
    }
    .nb-entry {
      padding: 0.4rem 0; border-bottom: 1px solid #181818;
    }
    .nb-sel { font-size: 0.54rem; opacity: 0.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .nb-val { font-size: 0.64rem; margin: 0.1rem 0; }
    .nb-acts { display: flex; gap: 0.2rem; margin-top: 0.15rem; }

    /* Badge */
    .anot-badge {
      position: absolute; top: 0; right: 0;
      transform: translateY(-100%);
      background: #d4a574; color: #111;
      font-size: 0.54rem; padding: 0.1rem 0.28rem;
      border-radius: 2px; z-index: 999;
      font-family: 'DM Mono', monospace;
      white-space: nowrap; pointer-events: none;
    }
    .anot-selected { outline: 2px solid #d4a574 !important; outline-offset: 3px; }

    /* Plovoucí poznámka */
    .anot-float {
      position: fixed;
      background: rgba(212,165,116,0.12);
      border: 1px solid #d4a574;
      color: #e8e0d5;
      padding: 0.3rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-family: 'DM Mono', monospace;
      z-index: 99990;
      cursor: move;
      white-space: pre-wrap;
      max-width: 200px;
      touch-action: none;
    }

    /* Hledač */
    #anot-insp-list {
      max-height: 140px; overflow-y: auto;
      margin-top: 0.3rem;
    }
    .insp-item {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.18rem 0; border-bottom: 1px solid #181818;
      font-size: 0.62rem;
    }
    .insp-swatch {
      width: 13px; height: 13px;
      border: 1px solid #444; border-radius: 2px;
      flex-shrink: 0; cursor: pointer;
    }
    .insp-lbl { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .insp-edit { cursor: pointer; opacity: 0.45; }
    .insp-edit:hover { opacity: 1; }

    /* Nahrávací indikátor */
    #anot-rec-ind {
      position: fixed; top: 1rem;
      left: 50%; transform: translateX(-50%);
      background: rgba(170,35,35,0.92);
      color: #fff; padding: 0.3rem 1.1rem;
      border-radius: 20px; z-index: 9999999;
      font-size: 0.75rem; font-family: 'DM Mono', monospace;
      display: none; cursor: pointer;
      animation: apulse 1.4s infinite;
    }
  `;
  document.head.appendChild(css);

  // ── MYŠ TLAČÍTKO ─────────────────────────────────────────
  const mys = document.createElement('button');
  mys.id = 'anot-mys';
  mys.title = 'Anotátor';
  mys.innerHTML = '<img src="doma/ilustrace/mys_ikonka.png" alt="myš">';
  document.body.appendChild(mys);
  mys.addEventListener('click', toggleEdit);

  // Nad patičkou
  function positionMys() {
    const f = document.querySelector('footer, .footer, #footer, [role=contentinfo]');
    if (f) {
      const fh = window.innerHeight - f.getBoundingClientRect().top;
      mys.style.bottom = (fh + 16) + 'px';
    }
  }
  positionMys();
  window.addEventListener('resize', positionMys);

  // ── DRAG (mouse + touch) ──────────────────────────────────
  function makeDraggable(el, handle) {
    handle = handle || el;
    let sx, sy, ol, ot;
    function start(cx, cy) {
      const r = el.getBoundingClientRect();
      sx = cx; sy = cy; ol = r.left; ot = r.top;
    }
    function move(cx, cy) {
      el.style.left = (ol + cx - sx) + 'px';
      el.style.top = (ot + cy - sy) + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
    }
    handle.addEventListener('mousedown', e => {
      if (e.target !== handle && e.target.tagName === 'BUTTON') return;
      start(e.clientX, e.clientY);
      const mm = e2 => move(e2.clientX, e2.clientY);
      const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      e.preventDefault();
    });
    handle.addEventListener('touchstart', e => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
      const tm = e2 => { const t2 = e2.touches[0]; move(t2.clientX, t2.clientY); e2.preventDefault(); };
      const te = () => { window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); };
      window.addEventListener('touchmove', tm, { passive: false });
      window.addEventListener('touchend', te);
    }, { passive: true });
  }

  // ── PANEL ─────────────────────────────────────────────────
  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'anot-panel';
    panel.innerHTML = `
      <div id="anot-panel-header">
        <span id="anot-panel-drag">☰</span>
        <span id="anot-panel-title">✦ anotátor</span>
        <button id="anot-panel-close">✕</button>
      </div>
      <div id="anot-panel-body">

        <div class="anot-section">
          <div class="anot-sec-head" data-s="sel">
            <span class="anot-sec-ico">🎯</span>
            <span class="anot-sec-lbl">Vybrat prvek</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-sel">
            <button class="ab" id="btn-selmode">🖱 Aktivovat výběr</button>
            <div class="astat" id="sel-stat">Klikni na prvek stránky</div>
          </div>
        </div>

        <div class="anot-section">
          <div class="anot-sec-head" data-s="mic">
            <span class="anot-sec-ico">🎙</span>
            <span class="anot-sec-lbl">Mikrofon</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-mic">
            <div class="arow">
              <button class="ab" id="btn-rec">⏺ Nahrát</button>
              <button class="ab" id="btn-play-aud">▶ Přehrát</button>
            </div>
            <button class="ab" id="btn-attach-aud" disabled>📎 Přiřadit k prvku</button>
            <div id="aud-player-wrap" style="display:none; margin-top:0.25rem;"></div>
            <div class="astat" id="mic-stat">Žádná nahrávka</div>
          </div>
        </div>

        <div class="anot-section">
          <div class="anot-sec-head" data-s="scr">
            <span class="anot-sec-ico">🎦</span>
            <span class="anot-sec-lbl">Obrazovka</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-scr">
            <div class="arow">
              <button class="ab" id="btn-screc">⏺ Nahrát</button>
              <button class="ab" id="btn-scplay" disabled>▶ Přehrát</button>
              <button class="ab" id="btn-scdl" disabled>💾</button>
            </div>
            <div id="scr-player-wrap" style="display:none; margin-top:0.25rem;"></div>
            <div class="astat" id="scr-stat">Žádná nahrávka</div>
          </div>
        </div>

        <div class="anot-section">
          <div class="anot-sec-head" data-s="vis">
            <span class="anot-sec-ico">👁</span>
            <span class="anot-sec-lbl">Anotace</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-vis">
            <button class="ab on" id="btn-togvis">👁 Zobrazit anotace</button>
            <button class="ab" id="btn-shareurl">🔗 Sdílet URL stavu</button>
            <button class="ab" id="btn-exportjson">📤 Export JSON</button>
            <div class="astat" id="share-stat"></div>
          </div>
        </div>

        <div class="anot-section">
          <div class="anot-sec-head" data-s="nb">
            <span class="anot-sec-ico">📓</span>
            <span class="anot-sec-lbl">Zápisník</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-nb">
            <button class="ab" id="btn-opennotebook">📋 Otevřít zápisník</button>
            <div class="astat" id="nb-count"></div>
          </div>
        </div>

        <div class="anot-section">
          <div class="anot-sec-head" data-s="add">
            <span class="anot-sec-ico">➕</span>
            <span class="anot-sec-lbl">Přidat prvek</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-add">
            <div class="arow">
              <button class="ab" id="btn-addnote">📝 Poznámka</button>
              <button class="ab" id="btn-addlink">🔗 Odkaz</button>
            </div>
            <button class="ab" id="btn-addmode">🖱 Kliknutím na stránku</button>
          </div>
        </div>

        <div class="anot-section">
          <div class="anot-sec-head" data-s="insp">
            <span class="anot-sec-ico">🔍</span>
            <span class="anot-sec-lbl">Hledač prvků</span>
            <span class="anot-sec-arr">▶</span>
          </div>
          <div class="anot-sec-body" id="sb-insp">
            <div class="arow">
              <button class="ab" id="btn-fonts">Aa Fonty</button>
              <button class="ab" id="btn-colors">🎨 Barvy</button>
            </div>
            <div id="anot-insp-list"></div>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(panel);
    panel.style.left = '20px';
    panel.style.top = '80px';

    makeDraggable(panel, document.getElementById('anot-panel-header'));
    document.getElementById('anot-panel-close').addEventListener('click', () => { panel.style.display = 'none'; });

    // Accordion
    document.querySelectorAll('.anot-sec-head').forEach(h => {
      h.addEventListener('click', () => {
        const id = 'sb-' + h.dataset.s;
        const body = document.getElementById(id);
        const wasOpen = body.classList.contains('open');
        document.querySelectorAll('.anot-sec-body').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.anot-sec-head').forEach(hh => hh.classList.remove('open'));
        if (!wasOpen) { body.classList.add('open'); h.classList.add('open'); }
      });
    });

    bindEvents();
  }

  function bindEvents() {
    // --- Výběr prvku ---
    document.getElementById('btn-selmode').addEventListener('click', () => {
      selectMode = !selectMode;
      const b = document.getElementById('btn-selmode');
      b.classList.toggle('on', selectMode);
      b.textContent = selectMode ? '🎯 Probíhá výběr…' : '🖱 Aktivovat výběr';
    });

    // --- Mikrofon ---
    document.getElementById('btn-rec').addEventListener('click', toggleAudioRec);
    document.getElementById('btn-play-aud').addEventListener('click', () => {
      if (!audioBlob) return alert('Žádná nahrávka.');
      new Audio(URL.createObjectURL(audioBlob)).play();
    });
    document.getElementById('btn-attach-aud').addEventListener('click', () => {
      if (!selectedEl) return alert('Nejdřív vyber prvek.');
      if (!audioBlob) return alert('Nejdřív nahraj zvuk.');
      const sel = getSel(selectedEl);
      if (!notes[sel]) notes[sel] = {};
      notes[sel].hasAudio = true; notes[sel].type = notes[sel].type || 'audio';
      save(); addBadge(selectedEl, '🔊'); updateNbCount();
    });

    // --- Obrazovka ---
    document.getElementById('btn-screc').addEventListener('click', toggleScreenRec);
    document.getElementById('btn-scplay').addEventListener('click', playScreen);
    document.getElementById('btn-scdl').addEventListener('click', () => {
      if (!screenBlob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(screenBlob);
      a.download = 'zaznam-' + Date.now() + '.webm';
      a.click();
    });

    // --- Anotace ---
    document.getElementById('btn-togvis').addEventListener('click', toggleVis);
    document.getElementById('btn-shareurl').addEventListener('click', shareUrl);
    document.getElementById('btn-exportjson').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }));
      a.download = 'anotace.json'; a.click();
    });

    // --- Zápisník ---
    document.getElementById('btn-opennotebook').addEventListener('click', toggleNotebook);

    // --- Přidat ---
    document.getElementById('btn-addnote').addEventListener('click', () => addFloat('poznamka'));
    document.getElementById('btn-addlink').addEventListener('click', () => addFloat('odkaz'));
    document.getElementById('btn-addmode').addEventListener('click', () => {
      addMode = !addMode;
      const b = document.getElementById('btn-addmode');
      b.classList.toggle('on', addMode);
      b.textContent = addMode ? '🖱 Klikni na stránku…' : '🖱 Kliknutím na stránku';
    });

    // --- Hledač ---
    document.getElementById('btn-fonts').addEventListener('click', inspectFonts);
    document.getElementById('btn-colors').addEventListener('click', inspectColors);
  }

  // ── KLIK NA STRÁNKU ───────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!editing) return;
    if (e.target.closest('#anot-panel,#anot-el-menu,#anot-notebook,#anot-mys,#anot-rec-ind')) return;

    if (selectMode) {
      e.preventDefault(); e.stopPropagation();
      const el = e.target.closest('p,h1,h2,h3,h4,h5,h6,li,td,th,em,strong,blockquote,img,a,span,div,section,article,button,label,nav,header,footer') || e.target;
      if (!el || el === document.body) return;
      if (selectedEl) selectedEl.classList.remove('anot-selected');
      selectedEl = el;
      selectedEl.classList.add('anot-selected');
      showElMenu(el, e.clientX, e.clientY);
      selectMode = false;
      const b = document.getElementById('btn-selmode');
      if (b) { b.classList.remove('on'); b.textContent = '🖱 Aktivovat výběr'; }
      return;
    }

    if (addMode) {
      e.preventDefault();
      addMode = false;
      const b = document.getElementById('btn-addmode');
      if (b) { b.classList.remove('on'); b.textContent = '🖱 Kliknutím na stránku'; }
      const typ = prompt('Co přidat? (poznamka / odkaz / text):', 'poznamka');
      if (typ) addFloatAt(typ, e.clientX, e.clientY);
      return;
    }

    // klik mimo el menu = zavřít
    if (elMenu && !e.target.closest('#anot-el-menu')) {
      removeElMenu();
    }
  }, true);

  // ── ELEMENT MENU ──────────────────────────────────────────
  function showElMenu(el, x, y) {
    removeElMenu();
    elMenu = document.createElement('div');
    elMenu.id = 'anot-el-menu';
    const tag = el.tagName.toLowerCase();
    const prev = (el.textContent || '').trim().substring(0, 22) || tag;
    elMenu.innerHTML = `
      <div class="em-title">&lt;${tag}&gt; ${prev}</div>
      <button class="ab" data-a="text">✏️ Upravit text</button>
      <button class="ab" data-a="color">🎨 Barva textu</button>
      <button class="ab" data-a="bg">🖌 Barva pozadí</button>
      <button class="ab" data-a="font">Aa Font / velikost</button>
      <button class="ab" data-a="border">▣ Rámeček</button>
      <button class="ab" data-a="note">📝 Přidat poznámku</button>
      <button class="ab" data-a="aud">🔊 Přiřadit zvuk</button>
      <button class="ab" data-a="dup">⧉ Duplikovat</button>
      <button class="ab" data-a="move">✥ Přesunout</button>
      <button class="ab" data-a="hide">🙈 Skrýt</button>
    `;
    document.body.appendChild(elMenu);

    // Pozice – nepřetéct okraj
    elMenu.style.display = 'flex';
    const mw = elMenu.offsetWidth, mh = elMenu.offsetHeight;
    let lx = x + 10, ly = y;
    if (lx + mw > window.innerWidth - 8) lx = x - mw - 10;
    if (ly + mh > window.innerHeight - 8) ly = window.innerHeight - mh - 8;
    elMenu.style.left = lx + 'px';
    elMenu.style.top = ly + 'px';

    makeDraggable(elMenu);

    elMenu.querySelectorAll('[data-a]').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); handleElAct(b.dataset.a, el); });
    });
  }

  function removeElMenu() {
    if (elMenu) { elMenu.remove(); elMenu = null; }
    if (selectedEl) { selectedEl.classList.remove('anot-selected'); }
  }

  function handleElAct(act, el) {
    const sel = getSel(el);
    if (!notes[sel]) notes[sel] = {};

    switch (act) {
      case 'text': {
        const old = el.textContent.trim();
        const nt = prompt('Nový text:', old);
        if (nt !== null && nt !== old) {
          notes[sel].originalText = old;
          notes[sel].text = nt; notes[sel].type = 'text-edit';
          el.textContent = nt; save(); addBadge(el, '✏️');
        }
        break;
      }
      case 'color': {
        const c = prompt('Barva textu (#hex):', '');
        if (c) { el.style.color = c; notes[sel].styleColor = c; notes[sel].type = notes[sel].type || 'style'; save(); addBadge(el, '🎨'); }
        break;
      }
      case 'bg': {
        const c = prompt('Barva pozadí (#hex):', '');
        if (c) { el.style.backgroundColor = c; notes[sel].styleBg = c; notes[sel].type = notes[sel].type || 'style'; save(); addBadge(el, '🖌'); }
        break;
      }
      case 'font': {
        const f = prompt('Font, velikost (např. Georgia, 18px):', '');
        if (f) {
          const [ff, fs] = f.split(',');
          if (ff) el.style.fontFamily = ff.trim();
          if (fs) el.style.fontSize = fs.trim();
          notes[sel].styleFont = f; notes[sel].type = notes[sel].type || 'style'; save(); addBadge(el, 'Aa');
        }
        break;
      }
      case 'border': {
        const b = prompt('Rámeček (např. 2px solid #d4a574):', '1px solid #d4a574');
        if (b) { el.style.outline = b; el.style.outlineOffset = '2px'; notes[sel].styleBorder = b; notes[sel].type = notes[sel].type || 'style'; save(); addBadge(el, '▣'); }
        break;
      }
      case 'note': {
        const t = prompt('Poznámka:');
        if (t) { notes[sel].note = t; notes[sel].type = notes[sel].type || 'note'; save(); addBadge(el, '📝 ' + t.substring(0, 14)); }
        break;
      }
      case 'aud': {
        if (!audioBlob) { alert('Nejdřív nahraj zvuk (sekce Mikrofon).'); break; }
        notes[sel].hasAudio = true; notes[sel].type = notes[sel].type || 'audio'; save(); addBadge(el, '🔊');
        break;
      }
      case 'dup': {
        const clone = el.cloneNode(true);
        clone.classList.remove('anot-selected');
        el.insertAdjacentElement('afterend', clone);
        makeDraggable(clone);
        notes['dup-' + Date.now()] = { type: 'duplicate', originalSelector: sel }; save();
        break;
      }
      case 'move': {
        el.style.position = el.style.position === 'static' || !el.style.position ? 'relative' : el.style.position;
        el.style.cursor = 'move';
        makeDraggable(el);
        notes[sel].moved = true; notes[sel].type = notes[sel].type || 'moved'; save();
        break;
      }
      case 'hide': {
        el.style.display = 'none'; notes[sel].hidden = true; notes[sel].type = notes[sel].type || 'hidden'; save();
        break;
      }
    }
    removeElMenu();
    updateNbCount();
  }

  function addBadge(el, text) {
    el.style.position = el.style.position || 'relative';
    let b = el.querySelector(':scope > .anot-badge');
    if (!b) { b = document.createElement('span'); b.className = 'anot-badge'; el.prepend(b); }
    b.textContent = text;
    if (!showAnnotations) b.style.display = 'none';
  }

  // ── AUDIO ──────────────────────────────────────────────────
  async function toggleAudioRec() {
    const btn = document.getElementById('btn-rec');
    if (audioRecorder && audioRecorder.state === 'recording') {
      audioRecorder.stop(); btn.classList.remove('rec'); btn.innerHTML = '⏺ Nahrát'; return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRecorder = new MediaRecorder(stream);
      audioChunks = [];
      audioRecorder.ondataavailable = e => audioChunks.push(e.data);
      audioRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        const stat = document.getElementById('mic-stat');
        if (stat) stat.textContent = 'Hotovo (' + Math.round(audioBlob.size / 1024) + ' KB)';
        const wrap = document.getElementById('aud-player-wrap');
        const aud = document.createElement('audio');
        aud.controls = true; aud.src = URL.createObjectURL(audioBlob);
        aud.style.width = '100%'; aud.style.height = '26px';
        wrap.innerHTML = ''; wrap.appendChild(aud); wrap.style.display = 'block';
        const ab = document.getElementById('btn-attach-aud');
        ab.disabled = false;
        recInd(false);
      };
      audioRecorder.start();
      btn.classList.add('rec'); btn.innerHTML = '⏹ Zastavit';
      document.getElementById('mic-stat').textContent = 'Nahrávám…';
      recInd(true, '🔴 Nahrávám zvuk', () => audioRecorder?.stop());
    } catch (e) { alert('Mikrofon nedostupný: ' + e.message); }
  }

  // ── SCREEN ────────────────────────────────────────────────
  async function toggleScreenRec() {
    const btn = document.getElementById('btn-screc');
    if (screenRecorder && screenRecorder.state === 'recording') {
      screenRecorder.stop(); btn.classList.remove('rec'); btn.innerHTML = '⏺ Nahrát'; return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const chunks = [];
      screenRecorder = new MediaRecorder(stream);
      screenRecorder.ondataavailable = e => chunks.push(e.data);
      screenRecorder.onstop = () => {
        screenBlob = new Blob(chunks, { type: 'video/webm' });
        stream.getTracks().forEach(t => t.stop());
        const stat = document.getElementById('scr-stat');
        if (stat) stat.textContent = 'Hotovo (' + Math.round(screenBlob.size / 1024) + ' KB)';
        document.getElementById('btn-scplay').disabled = false;
        document.getElementById('btn-scdl').disabled = false;
        recInd(false);
      };
      screenRecorder.start();
      btn.classList.add('rec'); btn.innerHTML = '⏹ Zastavit';
      document.getElementById('scr-stat').textContent = 'Nahrávám obrazovku…';
      recInd(true, '📹 Nahrávám obrazovku', () => screenRecorder?.stop());
    } catch (e) { alert('Nahrávání selhalo: ' + e.message); }
  }

  function playScreen() {
    if (!screenBlob) return;
    const wrap = document.getElementById('scr-player-wrap');
    wrap.innerHTML = '';
    const v = document.createElement('video');
    v.controls = true; v.src = URL.createObjectURL(screenBlob);
    v.style.width = '100%'; v.style.maxHeight = '110px';
    wrap.appendChild(v); wrap.style.display = 'block'; v.play();
  }

  // ── NAHRÁVACÍ INDIKÁTOR ───────────────────────────────────
  const recIndEl = document.createElement('div');
  recIndEl.id = 'anot-rec-ind';
  document.body.appendChild(recIndEl);

  function recInd(show, text, stopFn) {
    if (!show) { recIndEl.style.display = 'none'; recIndEl.onclick = null; return; }
    recIndEl.textContent = text + ' — klikni pro stop';
    recIndEl.style.display = 'block';
    recIndEl.onclick = stopFn;
  }

  // ── ANOTACE VIDITELNOST ───────────────────────────────────
  function toggleVis() {
    showAnnotations = !showAnnotations;
    const btn = document.getElementById('btn-togvis');
    btn.classList.toggle('on', showAnnotations);
    btn.innerHTML = showAnnotations ? '👁 Skrýt anotace' : '👁 Zobrazit anotace';
    document.querySelectorAll('.anot-badge').forEach(b => { b.style.display = showAnnotations ? '' : 'none'; });
  }

  // ── SDÍLET URL ────────────────────────────────────────────
  function shareUrl() {
    // Anotace bez audio blobů (nelze serializovat)
    const clean = {};
    Object.entries(notes).forEach(([k, v]) => {
      if (v && typeof v === 'object') {
        const { hasAudio, ...rest } = v; // blob přeskočíme, příznak necháme
        clean[k] = v.hasAudio ? { ...rest, hasAudio: true } : rest;
      }
    });
    const enc = btoa(encodeURIComponent(JSON.stringify(clean)));
    const url = location.href.split('#')[0] + '#anot=' + enc;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        const s = document.getElementById('share-stat');
        if (s) { s.textContent = '✓ URL zkopírována!'; setTimeout(() => { s.textContent = ''; }, 3000); }
      }).catch(() => prompt('Zkopíruj URL:', url));
    } else {
      prompt('Zkopíruj URL:', url);
    }
  }

  // ── ZÁPISNÍK ──────────────────────────────────────────────
  function createNotebook() {
    notebook = document.createElement('div');
    notebook.id = 'anot-notebook';
    notebook.innerHTML = `
      <div id="anot-nb-head">
        <h3>📓 Zápisník</h3>
        <button id="anot-nb-close">✕</button>
      </div>
      <div id="anot-nb-body"></div>
      <div id="anot-nb-foot">
        <button class="ab" id="nb-share">🔗 Sdílet</button>
        <button class="ab" id="nb-clear">🗑 Vše</button>
      </div>
    `;
    document.body.appendChild(notebook);
    document.getElementById('anot-nb-close').addEventListener('click', toggleNotebook);
    document.getElementById('nb-share').addEventListener('click', shareUrl);
    document.getElementById('nb-clear').addEventListener('click', () => {
      if (confirm('Smazat všechny anotace?')) { notes = {}; save(); renderNb(); updateNbCount(); }
    });
  }

  function toggleNotebook() {
    if (!notebook) createNotebook();
    notebookOpen = !notebookOpen;
    notebook.classList.toggle('open', notebookOpen);
    if (notebookOpen) renderNb();
  }

  function renderNb() {
    const body = document.getElementById('anot-nb-body');
    if (!body) return;
    body.innerHTML = '';
    const ents = Object.entries(notes);
    if (!ents.length) {
      body.innerHTML = '<div style="opacity:.4;padding:.6rem;font-size:.68rem;">Žádné anotace</div>';
      return;
    }
    ents.forEach(([sel, data]) => {
      if (!data || !data.type) return;
      const val = data.note || data.text || data.content || data.url || (data.hidden ? '(skryto)' : data.type);
      const d = document.createElement('div');
      d.className = 'nb-entry';
      d.innerHTML = `
        <div class="nb-sel">${sel}</div>
        <div class="nb-val">${(val || '').substring(0, 55)}</div>
        <div class="nb-acts">
          <button class="ab" data-sel="${sel}" data-a="vis">${data.hidden ? '👁 Zobrazit' : '🙈 Skrýt'}</button>
          <button class="ab" data-sel="${sel}" data-a="go">🎯</button>
          <button class="ab" data-sel="${sel}" data-a="del">🗑</button>
        </div>
      `;
      body.appendChild(d);
    });
    body.querySelectorAll('[data-a]').forEach(b => {
      b.addEventListener('click', () => {
        const sel = b.dataset.sel; const a = b.dataset.a;
        if (a === 'del') { delete notes[sel]; save(); renderNb(); updateNbCount(); }
        else if (a === 'go') { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        else if (a === 'vis') {
          const el = document.querySelector(sel);
          notes[sel].hidden = !notes[sel].hidden;
          if (el) el.style.display = notes[sel].hidden ? 'none' : '';
          save(); renderNb();
        }
      });
    });
  }

  function updateNbCount() {
    const c = document.getElementById('nb-count');
    if (c) c.textContent = Object.keys(notes).length + ' položek';
  }

  // ── PŘIDAT PLOVOUCÍ PRVEK ─────────────────────────────────
  function addFloat(typ) {
    addFloatAt(typ, Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
  }

  function addFloatAt(typ, x, y) {
    let el, content;
    const id = 'anot-float-' + Date.now();
    if (typ === 'poznamka' || typ === 'text') {
      content = prompt('Poznámka:');
      if (!content) return;
      el = document.createElement('div');
      el.className = 'anot-float';
      el.textContent = content;
    } else if (typ === 'odkaz') {
      const url = prompt('URL:'); const lbl = prompt('Text odkazu:');
      if (!url || !lbl) return;
      el = document.createElement('a');
      el.href = url; el.textContent = lbl; el.target = '_blank';
      el.className = 'anot-float'; el.style.color = '#d4a574';
      content = lbl + ' → ' + url;
    } else return;

    el.id = id;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.position = 'fixed';
    document.body.appendChild(el);
    makeDraggable(el);
    notes[id] = { type: 'float-' + typ, content: content };
    save(); updateNbCount();
  }

  // ── HLEDAČ ────────────────────────────────────────────────
  function inspectFonts() {
    const list = document.getElementById('anot-insp-list');
    const fonts = new Set();
    document.querySelectorAll('*').forEach(el => {
      if (el.closest('#anot-panel,#anot-notebook,#anot-el-menu')) return;
      getComputedStyle(el).fontFamily.split(',').forEach(f => fonts.add(f.trim().replace(/['"]/g, '')));
    });
    list.innerHTML = '';
    [...fonts].slice(0, 15).forEach(font => {
      const d = document.createElement('div');
      d.className = 'insp-item';
      d.innerHTML = `<span class="insp-lbl" style="font-family:'${font}'">${font}</span><span class="insp-edit" title="Změnit">✏️</span>`;
      d.querySelector('.insp-edit').addEventListener('click', () => {
        const nf = prompt('Nahradit "' + font + '" za:', font);
        if (!nf) return;
        document.querySelectorAll('*').forEach(el => {
          if (getComputedStyle(el).fontFamily.includes(font)) el.style.fontFamily = nf;
        });
        notes['__font_' + Date.now()] = { type: 'font-override', from: font, to: nf }; save();
      });
      list.appendChild(d);
    });
  }

  function inspectColors() {
    const list = document.getElementById('anot-insp-list');
    const colors = new Map();
    document.querySelectorAll('*').forEach(el => {
      if (el.closest('#anot-panel,#anot-notebook,#anot-el-menu')) return;
      const cs = getComputedStyle(el);
      [cs.color, cs.backgroundColor].forEach(c => {
        if (c && c !== 'rgba(0, 0, 0, 0)' && !c.startsWith('rgba(0, 0, 0, 0)'))
          colors.set(c, (colors.get(c) || 0) + 1);
      });
    });
    list.innerHTML = '';
    [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([color, count]) => {
      const d = document.createElement('div');
      d.className = 'insp-item';
      d.innerHTML = `
        <span class="insp-swatch" style="background:${color}"></span>
        <span class="insp-lbl">${color}</span>
        <span style="opacity:.35;font-size:.54rem;">${count}×</span>
        <span class="insp-edit">✏️</span>
      `;
      d.querySelector('.insp-edit').addEventListener('click', () => {
        const nc = prompt('Nová barva (místo "' + color + '"):', '#');
        if (!nc) return;
        document.querySelectorAll('*').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.color === color) el.style.color = nc;
          if (cs.backgroundColor === color) el.style.backgroundColor = nc;
        });
        notes['__color_' + Date.now()] = { type: 'color-override', from: color, to: nc }; save();
      });
      list.appendChild(d);
    });
  }

  // ── AKTIVACE / DEAKTIVACE ─────────────────────────────────
  function toggleEdit() {
    if (editing) { deactivate(); }
    else {
      const p = prompt('Heslo:');
      if (p === HESLO) activate();
      else if (p !== null) alert('Špatné heslo.');
    }
  }

  function activate() {
    editing = true;
    mys.classList.add('active');
    if (!panel) createPanel();
    panel.style.display = 'block';
    updateNbCount();
    applyStored();
  }

  function deactivate() {
    editing = false;
    mys.classList.remove('active');
    if (panel) panel.style.display = 'none';
    if (notebook) { notebook.classList.remove('open'); notebookOpen = false; }
    removeElMenu();
    if (selectedEl) { selectedEl.classList.remove('anot-selected'); selectedEl = null; }
    selectMode = addMode = false;
  }

  // ── NAČÍST ULOŽENÉ ────────────────────────────────────────
  function applyStored() {
    Object.entries(notes).forEach(([sel, data]) => {
      if (!data || !data.type || sel.startsWith('anot-float') || sel.startsWith('__')) return;
      const el = document.querySelector(sel);
      if (!el) return;
      if (data.hidden) el.style.display = 'none';
      if (data.text) el.textContent = data.text;
      if (data.styleColor) el.style.color = data.styleColor;
      if (data.styleBg) el.style.backgroundColor = data.styleBg;
      if (data.styleBorder) { el.style.outline = data.styleBorder; el.style.outlineOffset = '2px'; }
      if (data.styleFont) {
        const [ff, fs] = data.styleFont.split(',');
        if (ff) el.style.fontFamily = ff.trim();
        if (fs) el.style.fontSize = fs.trim();
      }
      if (data.note) addBadge(el, '📝 ' + data.note.substring(0, 14));
      if (data.type === 'text-edit') addBadge(el, '✏️');
      if (data.hasAudio) addBadge(el, '🔊');
    });
  }

  // Načíst z URL hash
  if (location.hash.includes('anot=')) {
    try {
      const enc = location.hash.split('anot=')[1];
      const loaded = JSON.parse(decodeURIComponent(atob(enc)));
      notes = { ...notes, ...loaded };
      save();
      // Aplikovat hned (bez hesla - pouze vizuální replay)
      applyStored();
    } catch (e) {}
  }

})();
