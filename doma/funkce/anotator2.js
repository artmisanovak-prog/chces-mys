(function() {
    // ===== KONFIGURACE =====
    const PASSWORD = 'anotator';
    const STORAGE_KEY_PREFIX = 'anot_';

    // ===== STAV =====
    let editing = false;
    let showAnnotations = false;
    let selectMode = false;
    let addMode = false;          // režim přidávání prvku (+)
    let selectedEl = null;
    let contextMenu = null;
    let currentAudioBlob = null; // naposledy nahraný zvuk
    let audioRecorder = null;
    let audioChunks = [];
    let screenRecorder = null;
    let screenStream = null;
    let notes = {};              // { selector: { type, content, hidden, ... } }
    let toolbox = null;
    let collapsedArrow = null;
    let notebookPanel = null;
    let tableGrid = null;

    // ===== POMOCNÉ FUNKCE =====
    const storageKey = STORAGE_KEY_PREFIX + location.pathname.replace(/[^a-z0-9]/gi, '_');
    try { notes = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch(e) {}

    function saveNotes() { localStorage.setItem(storageKey, JSON.stringify(notes)); }

    function getSelector(el) {
        if (el.id) return '#' + el.id;
        let path = [];
        while (el && el !== document.body) {
            let seg = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                const cls = el.className.trim().split(/\s+/).filter(c => !c.startsWith('anot-')).slice(0,2).join('.');
                if (cls) seg += '.' + cls;
            }
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
                if (siblings.length > 1) seg += ':nth-child(' + (siblings.indexOf(el)+1) + ')';
            }
            path.unshift(seg);
            el = parent;
        }
        return path.join(' > ');
    }

    // ===== INJECT STYLES =====
    const styles = document.createElement('style');
    styles.textContent = `
        .anot-mouse-btn {
            position: fixed; bottom: 2rem; right: 1.5rem; z-index: 999999;
            width: 52px; height: 52px; cursor: pointer; border: none;
            background: transparent; padding: 0; transition: transform 0.3s;
        }
        .anot-mouse-btn svg { width: 100%; height: 100%; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4)); }
        .anot-mouse-btn.active { transform: rotate(-90deg); }

        .anot-panel {
            position: fixed; z-index: 1000000; background: rgba(20,20,20,0.9);
            backdrop-filter: blur(8px); border: 1px solid #888; border-radius: 4px;
            padding: 0.2rem 0.3rem; display: none; gap: 0.2rem; align-items: center;
            font-family: system-ui, sans-serif; color: #eee; user-select: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .anot-panel button, .anot-context-menu button {
            background: rgba(255,255,255,0.1); border: 1px solid #666;
            color: #eee; font-size: 0.7rem; cursor: pointer; padding: 0.15rem 0.35rem;
            border-radius: 3px; line-height: 1; transition: background 0.2s;
            white-space: nowrap;
        }
        .anot-panel button:hover, .anot-context-menu button:hover { background: rgba(255,255,255,0.25); }
        .anot-panel button.active-tool { background: #555; border-color: #fff; }
        .anot-context-menu {
            position: absolute; z-index: 1000001; background: rgba(20,20,20,0.95);
            border: 1px solid #888; border-radius: 4px; padding: 0.3rem;
            display: none; flex-direction: column; gap: 0.2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        }
        .anot-selected { outline: 2px solid #aaa !important; outline-offset: 2px; }
        .anot-badge {
            position: absolute; background: #eee; color: #111; font-size: 0.6rem;
            padding: 0.1rem 0.3rem; border-radius: 3px; z-index: 999;
            font-family: system-ui, sans-serif; white-space: nowrap; pointer-events: auto;
            display: none;
        }
        .anot-badge.visible { display: inline-block; }
        .anot-notebook {
            position: fixed; z-index: 1000002; background: rgba(30,30,30,0.95);
            backdrop-filter: blur(10px); border: 1px solid #888;
            padding: 0.8rem; min-width: 250px; max-height: 70vh; overflow-y: auto;
            font-family: system-ui, sans-serif; color: #eee; display: none;
        }
        .anot-notebook h4 { margin: 0 0 0.5rem; font-size: 1rem; }
        .anot-notebook .note-entry { margin-bottom: 0.5rem; font-size: 0.7rem; display: flex; align-items: center; gap: 0.3rem; }
        .anot-notebook .note-entry button { font-size: 0.6rem; }
        .anot-table-grid {
            position: fixed; z-index: 1000003; background: rgba(20,20,20,0.9);
            border: 1px solid #888; display: none; padding: 0.2rem;
            grid-gap: 1px; user-select: none;
        }
        .anot-table-grid .grid-cell {
            background: #222; border: 1px solid #555; min-width: 40px; min-height: 25px;
            color: #eee; font-size: 0.7rem; text-align: center; vertical-align: middle;
            contenteditable: true; outline: none; cursor: text;
        }
        .anot-collapsed-arrow {
            position: fixed; z-index: 1000004; background: rgba(20,20,20,0.8);
            border: 1px solid #888; border-radius: 4px; padding: 0.2rem 0.4rem;
            font-size: 0.8rem; cursor: pointer; color: #eee; display: none;
        }
        .anot-recording-indicator {
            position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
            background: #d33; color: white; padding: 0.3rem 1.2rem; border-radius: 20px;
            z-index: 1000010; font-size: 0.8rem; display: none; gap: 0.5rem; align-items: center;
        }
    `;
    document.head.appendChild(styles);

    // ===== VYTVOŘENÍ UI =====
    function createMouseIcon() {
        const btn = document.createElement('button');
        btn.className = 'anot-mouse-btn';
      btn.innerHTML = '<img src="mys_ikonka.png" style="width:100%;height:100%;filter:brightness(0) invert(1);">';
        btn.title = 'Klikni pro aktivaci anotací';
        document.body.appendChild(btn);
        btn.addEventListener('click', toggleEditMode);
        return btn;
    }

    function createToolbox() {
        toolbox = document.createElement('div');
        toolbox.className = 'anot-panel';
        toolbox.innerHTML = `
            <button id="anot-drag-handle" title="Chyť a přesuň panel">🫴</button>
            <button id="anot-select" title="Vybrat prvek">🎯</button>
            <button id="anot-add" title="Přidat prvek">➕</button>
            <button id="anot-record" title="Nahrát zvuk">⏺️</button>
            <button id="anot-play" title="Přehrát zvuk">▶️</button>
            <button id="anot-screen" title="Nahrát obrazovku">🎦</button>
            <button id="anot-toggle" title="Zobrazit/skrýt anotace">👀</button>
            <button id="anot-notebook" title="Zápisník">📓</button>
            <button id="anot-collapse" title="Sbalit panel">◀</button>
        `;
        document.body.appendChild(toolbox);
        toolbox.style.left = '20px';
        toolbox.style.top = '80px';

        // Drag pouze za handle
        const handle = document.getElementById('anot-drag-handle');
        makeDraggable(toolbox, handle);

        // Eventy
        document.getElementById('anot-select').addEventListener('click', toggleSelectMode);
        document.getElementById('anot-add').addEventListener('click', toggleAddMode);
        document.getElementById('anot-record').addEventListener('click', toggleAudioRecording);
        document.getElementById('anot-play').addEventListener('click', playLastAudio);
        document.getElementById('anot-screen').addEventListener('click', toggleScreenRecording);
        document.getElementById('anot-toggle').addEventListener('click', toggleAnnotations);
        document.getElementById('anot-notebook').addEventListener('click', openNotebook);
        document.getElementById('anot-collapse').addEventListener('click', collapseToolbox);
    }

    function createCollapsedArrow() {
        collapsedArrow = document.createElement('div');
        collapsedArrow.className = 'anot-collapsed-arrow';
        collapsedArrow.textContent = '▶';
        collapsedArrow.title = 'Rozbalit panel (dlouhý stisk pro přesun)';
        document.body.appendChild(collapsedArrow);

        // Dlouhý stisk pro přesun
        let pressTimer;
        collapsedArrow.addEventListener('mousedown', (e) => {
            pressTimer = setTimeout(() => {
                makeDraggable(collapsedArrow);
                collapsedArrow.dispatchEvent(new MouseEvent('mousedown', e));
            }, 500);
        });
        collapsedArrow.addEventListener('mouseup', () => clearTimeout(pressTimer));
        collapsedArrow.addEventListener('mouseleave', () => clearTimeout(pressTimer));
        collapsedArrow.addEventListener('click', (e) => {
            if (!pressTimer) return;
            clearTimeout(pressTimer);
            expandToolbox();
        });
    }

    function makeDraggable(el, handle = el) {
        let isDragging = false, startX, startY, origLeft, origTop;
        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target !== handle) return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            const rect = el.getBoundingClientRect();
            origLeft = rect.left; origTop = rect.top;
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            el.style.left = (origLeft + e.clientX - startX) + 'px';
            el.style.top = (origTop + e.clientY - startY) + 'px';
        });
        window.addEventListener('mouseup', () => { isDragging = false; });
    }

    // ===== KONTEXTNÍ MENU PRO VYBRANÝ PRVEK =====
    function showContextMenu(el) {
        removeContextMenu();
        contextMenu = document.createElement('div');
        contextMenu.className = 'anot-context-menu';
        contextMenu.innerHTML = `
            <button id="ctx-edit">Upravit text</button>
            <button id="ctx-duplicate">Duplikovat</button>
            <button id="ctx-hide">Skrýt</button>
            <button id="ctx-annotate">➕</button>
        `;
        document.body.appendChild(contextMenu);
        const rect = el.getBoundingClientRect();
        contextMenu.style.left = (rect.right + 10) + 'px';
        contextMenu.style.top = rect.top + 'px';
        contextMenu.style.display = 'flex';

        document.getElementById('ctx-edit').onclick = () => { editElementText(el); removeContextMenu(); };
        document.getElementById('ctx-duplicate').onclick = () => { duplicateElement(el); removeContextMenu(); };
        document.getElementById('ctx-hide').onclick = () => { hideElement(el); removeContextMenu(); };
        document.getElementById('ctx-annotate').onclick = () => { annotateElement(el); removeContextMenu(); };
    }

    function removeContextMenu() {
        if (contextMenu) { contextMenu.remove(); contextMenu = null; }
    }

    // ===== OPERACE S PRVKY =====
    function editElementText(el) {
        const old = el.textContent.trim();
        const txt = prompt('Nový text:', old);
        if (txt === null || txt === old) return;
        const sel = getSelector(el);
        if (!notes[sel]) notes[sel] = {};
        notes[sel].originalText = old;
        notes[sel].text = txt;
        notes[sel].type = 'text-edit';
        el.textContent = txt;
        saveNotes();
        showAnnotationOnElement(el, sel);
    }

    function duplicateElement(el) {
        const clone = el.cloneNode(true);
        clone.classList.remove('anot-selected');
        el.insertAdjacentElement('afterend', clone);
        const sel = getSelector(clone);
        notes[sel] = { type: 'duplicate', originalSelector: getSelector(el) };
        saveNotes();
    }

    function hideElement(el) {
        el.style.display = 'none';
        const sel = getSelector(el);
        if (!notes[sel]) notes[sel] = {};
        notes[sel].hidden = true;
        saveNotes();
    }

    function annotateElement(el) {
        // Otevře malé menu pro přidání anotace k prvku
        const type = prompt('Typ anotace (text, audio, link):', 'text');
        if (!type) return;
        const sel = getSelector(el);
        switch (type) {
            case 'text':
                const txt = prompt('Poznámka:');
                if (txt) { notes[sel] = { type: 'note', content: txt, hidden: false }; saveNotes(); showAnnotationOnElement(el, sel); }
                break;
            case 'audio':
                // Použij globální nahrávání a přiřaď k prvku
                if (!currentAudioBlob) { alert('Nejdřív nahraj zvuk.'); return; }
                notes[sel] = { type: 'audio', data: currentAudioBlob, hidden: false }; saveNotes();
                break;
            case 'link':
                const url = prompt('URL:');
                const label = prompt('Text tlačítka:');
                if (url && label) {
                    const btn = document.createElement('a');
                    btn.href = url; btn.textContent = label; btn.target = '_blank';
                    btn.style.cssText = 'display:inline-block;padding:0.2rem 0.5rem;margin:0.2rem;border:1px solid #ccc;background:#333;color:#eee;text-decoration:none;font-size:0.7rem;';
                    el.insertAdjacentElement('afterend', btn);
                    notes[sel + '-link'] = { type: 'link', url, label, hidden: false };
                    saveNotes();
                }
                break;
        }
    }

    function showAnnotationOnElement(el, sel) {
        // Zobrazí badge
        const data = notes[sel];
        if (!data || data.hidden) return;
        let badge = el.querySelector('.anot-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'anot-badge';
            el.style.position = 'relative';
            el.appendChild(badge);
        }
        if (data.type === 'note') badge.textContent = data.content.substring(0, 25);
        else if (data.type === 'text-edit') badge.textContent = '✏️';
        else if (data.type === 'audio') badge.textContent = '🔊';
        else if (data.type === 'link') badge.textContent = '🔗';
        badge.classList.add('visible');
    }

    // ===== TOGGLE FUNKCE =====
    function toggleEditMode() {
        if (editing) deactivate();
        else {
            const pwd = prompt('Heslo:');
            if (pwd === PASSWORD) activate();
            else if (pwd !== null) alert('Špatné heslo.');
        }
    }

    function activate() {
        editing = true;
        showAnnotations = true; // výchozí stav
        document.querySelector('.anot-mouse-btn').classList.add('active');
        document.body.style.cursor = 'crosshair';
        if (!toolbox) { createToolbox(); createCollapsedArrow(); }
        toolbox.style.display = 'flex';
        collapsedArrow.style.display = 'none';
        updateToggleButton();
        applyAnnotationVisibility();
    }

    function deactivate() {
        editing = false;
        document.querySelector('.anot-mouse-btn').classList.remove('active');
        document.body.style.cursor = '';
        if (toolbox) toolbox.style.display = 'none';
        if (collapsedArrow) collapsedArrow.style.display = 'none';
        removeContextMenu();
        if (selectedEl) { selectedEl.classList.remove('anot-selected'); selectedEl = null; }
        selectMode = addMode = false;
        updateToggleButton();
        // Ponecháme anotace pokud byly zobrazeny? Dle zadání asi skrýt
        if (!showAnnotations) applyAnnotationVisibility();
    }

    function toggleSelectMode() {
        selectMode = !selectMode;
        addMode = false;
        document.getElementById('anot-select').classList.toggle('active-tool', selectMode);
        document.getElementById('anot-add').classList.remove('active-tool');
        if (selectedEl) { selectedEl.classList.remove('anot-selected'); selectedEl = null; removeContextMenu(); }
    }

    function toggleAddMode() {
        addMode = !addMode;
        selectMode = false;
        document.getElementById('anot-add').classList.toggle('active-tool', addMode);
        document.getElementById('anot-select').classList.remove('active-tool');
        if (selectedEl) { selectedEl.classList.remove('anot-selected'); selectedEl = null; removeContextMenu(); }
    }

    // ===== KLIK NA STRÁNKU =====
    document.addEventListener('click', function(e) {
        if (!editing) return;
        if (e.target.closest('.anot-mouse-btn, .anot-panel, .anot-context-menu, .anot-collapsed-arrow, .anot-notebook, .anot-table-grid, .anot-recording-indicator')) return;

        if (selectMode) {
            const el = e.target.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, em, strong, blockquote, img, a, span, div, section, article, button');
            if (!el) return;
            e.preventDefault();
            if (selectedEl) selectedEl.classList.remove('anot-selected');
            selectedEl = el;
            selectedEl.classList.add('anot-selected');
            showContextMenu(el);
            selectMode = false;
            document.getElementById('anot-select').classList.remove('active-tool');
        } else if (addMode) {
            e.preventDefault();
            const x = e.clientX, y = e.clientY;
            const type = prompt('Co přidat? (text, obrazek, odkaz, poznamka):');
            if (!type) return;
            const sel = 'custom-' + Date.now();
            let el;
            switch (type) {
                case 'text':
                    const txt = prompt('Text:');
                    if (!txt) return;
                    el = document.createElement('span');
                    el.textContent = txt;
                    el.style.position = 'fixed'; el.style.left = x+'px'; el.style.top = y+'px';
                    el.style.color = '#eee'; el.style.background = '#333'; el.style.padding = '0.2rem';
                    document.body.appendChild(el);
                    notes[sel] = { type: 'text', content: txt, hidden: false };
                    break;
                case 'obrazek':
                    const url = prompt('URL obrázku:');
                    if (!url) return;
                    el = document.createElement('img');
                    el.src = url; el.style.position = 'fixed'; el.style.left = x+'px'; el.style.top = y+'px';
                    el.style.maxWidth = '200px';
                    document.body.appendChild(el);
                    notes[sel] = { type: 'image', src: url, hidden: false };
                    break;
                case 'odkaz':
                    const linkUrl = prompt('URL:');
                    const label = prompt('Text:');
                    if (!linkUrl || !label) return;
                    el = document.createElement('a');
                    el.href = linkUrl; el.textContent = label; el.target = '_blank';
                    el.style.position = 'fixed'; el.style.left = x+'px'; el.style.top = y+'px';
                    el.style.background = '#333'; el.style.color = '#eee'; el.style.padding = '0.2rem';
                    document.body.appendChild(el);
                    notes[sel] = { type: 'link', url: linkUrl, label, hidden: false };
                    break;
                case 'poznamka':
                    const note = prompt('Poznámka:');
                    if (!note) return;
                    el = document.createElement('div');
                    el.textContent = note;
                    el.style.position = 'fixed'; el.style.left = x+'px'; el.style.top = y+'px';
                    el.style.background = '#fffa'; el.style.color = '#111'; el.style.padding = '0.2rem';
                    document.body.appendChild(el);
                    notes[sel] = { type: 'note', content: note, hidden: false };
                    break;
            }
            if (el) {
                el.classList.add('anot-annotation');
                saveNotes();
                applyAnnotationVisibility();
            }
            addMode = false;
            document.getElementById('anot-add').classList.remove('active-tool');
        }
    });

    // ===== ZVUKOVÉ NAHRÁVÁNÍ =====
    async function toggleAudioRecording() {
        if (audioRecorder && audioRecorder.state === 'recording') {
            audioRecorder.stop();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioRecorder = new MediaRecorder(stream);
            audioChunks = [];
            audioRecorder.ondataavailable = e => audioChunks.push(e.data);
            audioRecorder.onstop = () => {
                currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(t => t.stop());
                audioRecorder = null;
                document.querySelector('.anot-recording-indicator').style.display = 'none';
            };
            audioRecorder.start();
            showRecordingIndicator('🔴 Nahrávání zvuku...');
        } catch(e) { alert('Nepodařilo se získat mikrofon.'); }
    }

    function playLastAudio() {
        if (!currentAudioBlob) { alert('Žádná nahrávka.'); return; }
        const audio = new Audio(URL.createObjectURL(currentAudioBlob));
        audio.play();
    }

    // ===== NAHRÁVÁNÍ OBRAZOVKY =====
    async function toggleScreenRecording() {
        if (screenRecorder && screenRecorder.state === 'recording') {
            screenRecorder.stop();
            return;
        }
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            screenRecorder = new MediaRecorder(screenStream);
            const chunks = [];
            screenRecorder.ondataavailable = e => chunks.push(e.data);
            screenRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'zaznam.webm';
                a.click();
                screenStream.getTracks().forEach(t => t.stop());
                screenRecorder = null;
                document.querySelector('.anot-recording-indicator').style.display = 'none';
            };
            screenRecorder.start();
            showRecordingIndicator('📹 Nahrávání obrazovky...');
        } catch(e) { alert('Nahrávání obrazovky selhalo.'); }
    }

    function showRecordingIndicator(text) {
        let ind = document.querySelector('.anot-recording-indicator');
        if (!ind) {
            ind = document.createElement('div');
            ind.className = 'anot-recording-indicator';
            document.body.appendChild(ind);
        }
        ind.textContent = text + ' (klikni pro ukončení)';
        ind.style.display = 'flex';
        ind.onclick = () => {
            if (audioRecorder) audioRecorder.stop();
            if (screenRecorder) screenRecorder.stop();
        };
    }

    // ===== VIDITELNOST ANOTACÍ =====
    function toggleAnnotations() {
        showAnnotations = !showAnnotations;
        updateToggleButton();
        applyAnnotationVisibility();
    }

    function updateToggleButton() {
        const btn = document.getElementById('anot-toggle');
        if (btn) btn.classList.toggle('active-tool', showAnnotations);
    }

    function applyAnnotationVisibility() {
        document.querySelectorAll('.anot-annotation, .anot-badge').forEach(el => {
            if (el.classList.contains('anot-badge')) {
                el.style.display = showAnnotations ? '' : 'none';
            } else {
                el.style.display = showAnnotations ? '' : 'none';
            }
        });
        // Také prvky skryté přes notebook
        Object.entries(notes).forEach(([sel, data]) => {
            if (data.hidden) {
                const el = document.querySelector(sel);
                if (el) el.style.display = 'none';
            }
        });
    }

    // ===== ZÁPISNÍK =====
    function openNotebook() {
        if (notebookPanel) {
            notebookPanel.style.display = notebookPanel.style.display === 'none' ? 'block' : 'none';
            return;
        }
        notebookPanel = document.createElement('div');
        notebookPanel.className = 'anot-notebook';
        notebookPanel.innerHTML = `<h4>📓 Zápisník</h4><div id="anot-notes-list"></div>
            <button id="anot-export-url">📤 Export URL</button>`;
        document.body.appendChild(notebookPanel);
        notebookPanel.style.left = '50px';
        notebookPanel.style.top = '50px';
        makeDraggable(notebookPanel);

        renderNotesList();
        document.getElementById('anot-export-url').addEventListener('click', exportAsDataUrl);
    }

    function renderNotesList() {
        const list = document.getElementById('anot-notes-list');
        list.innerHTML = '';
        Object.entries(notes).forEach(([sel, data]) => {
            if (!data.type) return;
            const div = document.createElement('div');
            div.className = 'note-entry';
            const label = data.content || data.text || data.url || data.src || data.originalText || '';
            div.innerHTML = `
                <span>${sel}: ${label.substring(0,30)}</span>
                <button class="toggle-note-vis" data-sel="${sel}">${data.hidden ? '👁️' : '🙈'}</button>
                <button class="del-note" data-sel="${sel}">🗑</button>
            `;
            list.appendChild(div);
        });
        document.querySelectorAll('.toggle-note-vis').forEach(btn => {
            btn.addEventListener('click', function() {
                const sel = this.dataset.sel;
                notes[sel].hidden = !notes[sel].hidden;
                saveNotes();
                applyAnnotationVisibility();
                renderNotesList();
            });
        });
        document.querySelectorAll('.del-note').forEach(btn => {
            btn.addEventListener('click', function() {
                delete notes[this.dataset.sel];
                saveNotes();
                renderNotesList();
                applyAnnotationVisibility();
            });
        });
    }

    function exportAsDataUrl() {
        const html = `<html><body><pre>${JSON.stringify(notes, null, 2)}</pre></body></html>`;
        const blob = new Blob([html], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        prompt('Zkopíruj tuto URL:', url);
    }

    // ===== TABULKA =====
    document.getElementById('anot-table')?.addEventListener('click', createTable); // tlačítko tabulka chybí, dodělám
    // Přidám tlačítko do panelu
    function addTableButton() {
        const btn = document.createElement('button');
        btn.id = 'anot-table';
        btn.textContent = '📋';
        btn.title = 'Vytvořit tabulku';
        toolbox.appendChild(btn);
        btn.addEventListener('click', createTable);
    }
    // Zavoláno po vytvoření toolboxu
    setTimeout(addTableButton, 100);

    function createTable() {
        const dims = prompt('Rozměry (např. 3x3):', '3x3');
        if (!dims) return;
        const [cols, rows] = dims.split('x').map(Number);
        if (!cols || !rows) return;

        if (tableGrid) tableGrid.remove();
        tableGrid = document.createElement('div');
        tableGrid.className = 'anot-table-grid';
        tableGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        tableGrid.style.display = 'grid';
        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = '';
            cell.addEventListener('dblclick', () => { cell.textContent = '✅'; });
            tableGrid.appendChild(cell);
        }
        document.body.appendChild(tableGrid);
        tableGrid.style.left = '100px';
        tableGrid.style.top = '100px';
        makeDraggable(tableGrid);
    }

    // ===== COLLAPSE/EXPAND =====
    function collapseToolbox() {
        toolbox.style.display = 'none';
        if (!collapsedArrow) createCollapsedArrow();
        const rect = toolbox.getBoundingClientRect();
        collapsedArrow.style.left = rect.left + 'px';
        collapsedArrow.style.top = rect.top + 'px';
        collapsedArrow.style.display = 'block';
    }

    function expandToolbox() {
        toolbox.style.display = 'flex';
        collapsedArrow.style.display = 'none';
    }

    // ===== INICIALIZACE =====
    createMouseIcon();
})();
