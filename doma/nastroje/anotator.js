// anotator.js — plovoucí poznámkový nástroj Myši
// Vlož do složky s HTML a přidej: <script src="anotator.js"></script>

(function() {
    const PASSWORD = "anotator";
    const STORAGE_KEY = 'mys_notes_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');
    const LOCK_KEY = 'mys_lock_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');

    let notes = {};
    let editing = false;
    let selectMode = false;
    let selectedElement = null;
    let showEdits = false;
    let locked = localStorage.getItem(LOCK_KEY) === 'true';
    let recording = false;
    let mediaRecorder = null;
    let audioChunks = [];

    let panel = null, mouseBtn = null, toolbox = null, collapsedArrow = null;

    try { notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { notes = {}; }
    if (locked) { showEdits = true; }

    // ========== STYLY ==========
    const style = document.createElement('style');
    style.textContent = `
        .mys-anotator-btn {
            position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 9999;
            width: 44px; height: 44px; border-radius: 50%;
            background: var(--bg, #0f0d0a); border: 1px solid var(--accent, #a89880);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all .2s; box-shadow: 0 2px 8px rgba(0,0,0,.4);
        }
        .mys-anotator-btn img { width: 26px; height: 26px; filter: brightness(0) invert(.8); }
        .mys-anotator-btn.active { background: var(--accent, #a89880); }
        .mys-anotator-btn.active img { filter: brightness(0) invert(0); }

        .mys-toolbox {
            position: fixed; z-index: 10001; display: none; gap: 4px; align-items: center;
            background: var(--surface, #181410); border: 1px solid var(--border, rgba(168,152,128,.3));
            border-radius: 6px; padding: 6px 8px; box-shadow: 0 6px 18px rgba(0,0,0,.5);
            font-family: var(--mono, monospace); font-size: .7rem; color: var(--cream, #e8e0d0);
            cursor: grab; user-select: none;
        }
        .mys-toolbox.visible { display: flex; }
        .mys-toolbox button {
            width: 30px; height: 30px; border-radius: 4px; cursor: pointer;
            border: 1px solid var(--border, rgba(168,152,128,.2));
            background: transparent; color: var(--dim, rgba(232,224,208,.5));
            font-size: .8rem; display: flex; align-items: center; justify-content: center;
            transition: all .15s;
        }
        .mys-toolbox button:hover { border-color: var(--accent, #a89880); color: var(--accent, #a89880); }
        .mys-toolbox button.active-tool { background: rgba(168,152,128,.15); border-color: var(--accent, #a89880); color: var(--accent, #a89880); }
        .mys-toolbox button.locked { background: rgba(168,152,128,.15); border-color: var(--accent, #a89880); color: var(--accent, #a89880); }

        .mys-collapsed-arrow {
            position: fixed; z-index: 10001; display: none; width: 30px; height: 30px;
            border-radius: 4px; cursor: pointer; align-items: center; justify-content: center;
            background: var(--surface, #181410); border: 1px solid var(--border, rgba(168,152,128,.3));
            color: var(--dim, rgba(232,224,208,.5)); font-size: .9rem;
        }
        .mys-collapsed-arrow.visible { display: flex; }

        .selected-element { outline: 2px solid var(--accent, #a89880) !important; outline-offset: 2px; }

        .mys-note-badge {
            position: absolute; top: -1.2rem; right: 0; background: var(--accent, #a89880);
            color: var(--bg, #0f0d0a); font-size: .5rem; padding: 1px 5px;
            border-radius: 2px; font-family: var(--mono, monospace); cursor: default;
            white-space: nowrap; z-index: 997;
        }
        .mys-note-badge .badge-close { cursor: pointer; margin-left: 3px; opacity: .7; }

        .mys-prompt-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(3px);
            z-index: 99999; display: none; align-items: center; justify-content: center;
        }
        .mys-prompt-overlay.visible { display: flex; }
        .mys-prompt-box {
            background: var(--surface, #181410); border: 1px solid var(--accent, #a89880);
            padding: 1.5rem; width: 320px; max-width: 90vw; border-radius: 6px;
            font-family: var(--mono, monospace); color: var(--cream, #e8e0d0);
        }
        .mys-prompt-box input, .mys-prompt-box textarea {
            width: 100%; padding: .4rem; margin-top: .5rem; border-radius: 3px;
            background: var(--bg, #0f0d0a); border: 1px solid var(--border, rgba(168,152,128,.2));
            color: var(--cream, #e8e0d0); font-family: inherit; font-size: .8rem;
        }
        .mys-prompt-box textarea { min-height: 80px; resize: vertical; }
        .mys-prompt-btns { display: flex; gap: .5rem; justify-content: flex-end; margin-top: 1rem; }
        .mys-prompt-btns button {
            padding: .4rem 1rem; border-radius: 3px; cursor: pointer;
            border: 1px solid var(--accent, #a89880); background: transparent;
            color: var(--accent, #a89880); font-family: inherit; font-size: .7rem;
            text-transform: uppercase;
        }
        .mys-prompt-btns button.primary { background: var(--accent, #a89880); color: var(--bg, #0f0d0a); }

        .mys-recording-indicator {
            position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
            background: var(--accent, #a89880); color: var(--bg, #0f0d0a);
            padding: .5rem 2rem; border-radius: 20px; z-index: 10020;
            font-family: var(--mono, monospace); font-weight: bold; display: none;
            align-items: center; gap: .8rem; box-shadow: 0 4px 12px rgba(0,0,0,.5);
        }
        .mys-recording-indicator.visible { display: flex; }
        .mys-recording-indicator button {
            background: var(--bg, #0f0d0a); color: var(--accent, #a89880);
            border: none; padding: .2rem 1rem; border-radius: 10px; cursor: pointer;
            font-family: inherit; font-weight: bold; font-size: .7rem;
        }

        .mys-export-panel {
            position: fixed; top: 0; right: 0; width: 340px; max-width: 90vw;
            height: 100vh; background: var(--surface, #181410);
            border-left: 1px solid var(--border, rgba(168,152,128,.3));
            z-index: 10010; padding: 1.5rem; overflow-y: auto;
            font-family: var(--mono, monospace); font-size: .8rem; color: var(--cream, #e8e0d0);
            box-shadow: -4px 0 18px rgba(0,0,0,.6);
        }
        .mys-export-panel h3 { font-family: var(--serif, serif); font-weight: 300; font-size: 1.3rem; color: var(--accent, #a89880); margin-bottom: 1rem; }
        .mys-export-panel .close-btn { float: right; background: none; border: none; color: var(--dim); font-size: 1.5rem; cursor: pointer; }
        .mys-note-entry { border-bottom: 1px solid var(--border); padding: .8rem 0; }
        .mys-note-entry strong { color: var(--accent, #a89880); font-weight: 400; display: block; margin-bottom: .3rem; }
        .mys-note-entry input, .mys-note-entry textarea { width: 100%; padding: .3rem; margin: .3rem 0; background: var(--bg); border: 1px solid var(--border); color: var(--cream); font-family: inherit; font-size: .75rem; }
        .mys-note-entry audio { width: 100%; margin-top: .3rem; }
        .mys-note-entry button { padding: .2rem .6rem; margin-right: .3rem; cursor: pointer; border: 1px solid var(--accent, #a89880); background: transparent; color: var(--accent, #a89880); font-family: inherit; font-size: .65rem; }
    `;
    document.head.appendChild(style);

    // ========== IKONA MYŠI ==========
    mouseBtn = document.createElement('button');
    mouseBtn.className = 'mys-anotator-btn';
    mouseBtn.innerHTML = '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🐭%3C/text%3E%3C/svg%3E" alt="Myš">';
    mouseBtn.title = 'Klikni pro zadání hesla';
    document.body.appendChild(mouseBtn);

    // ========== TOOLBOX ==========
    toolbox = document.createElement('div');
    toolbox.className = 'mys-toolbox';
    toolbox.innerHTML = `
        <button id="mysSelBtn" title="Vybrat prvek">🎯</button>
        <button id="mysEditBtn" title="Opravit text">✏️</button>
        <button id="mysNoteBtn" title="Poznámka">📝</button>
        <button id="mysAudioBtn" title="Nahrát zvuk">🎤</button>
        <button id="mysToggleBtn" title="Zobrazit/skrýt">👁</button>
        <button id="mysLockBtn" title="Zámek">${locked ? '🔒' : '🔓'}</button>
        <button id="mysExportBtn" title="Poznámky">📓</button>
        <button id="mysCollapseBtn" title="Sbalit">◀</button>
    `;
    toolbox.style.left = '80px';
    toolbox.style.top = 'calc(100vh - 120px)';
    document.body.appendChild(toolbox);
    makeDraggable(toolbox);

    // Sbalovací šipka
    collapsedArrow = document.createElement('div');
    collapsedArrow.className = 'mys-collapsed-arrow';
    collapsedArrow.innerHTML = '▶';
    collapsedArrow.title = 'Rozbalit panel';
    document.body.appendChild(collapsedArrow);
    makeDraggable(collapsedArrow);
    collapsedArrow.addEventListener('click', () => {
        toolbox.classList.add('visible');
        toolbox.style.display = 'flex';
        collapsedArrow.classList.remove('visible');
        collapsedArrow.style.display = 'none';
    });

    // ========== INDIKÁTOR NAHRÁVÁNÍ ==========
    const recIndicator = document.createElement('div');
    recIndicator.className = 'mys-recording-indicator';
    recIndicator.innerHTML = '🔴 Nahrávám... <button id="mysStopRecBtn">UKONČIT</button>';
    document.body.appendChild(recIndicator);
    recIndicator.querySelector('button').addEventListener('click', stopRecording);

    // ========== EXPORT PANEL ==========
    let exportPanel = null;

    // ========== UDÁLOSTI TOOLBOXU ==========
    document.getElementById('mysSelBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        selectMode = !selectMode;
        this.classList.toggle('active-tool', selectMode);
        document.body.style.cursor = selectMode ? 'crosshair' : '';
        if (!selectMode && selectedElement) {
            selectedElement.classList.remove('selected-element');
            selectedElement = null;
        }
    });

    document.getElementById('mysEditBtn').addEventListener('click', async function(e) {
        e.stopPropagation();
        if (!selectedElement) { alert('Nejprve vyber prvek.'); return; }
        const oldText = selectedElement.textContent.trim();
        const newText = await customPrompt('Nový text:', 'textarea', oldText);
        if (newText === null || newText === oldText) return;
        const sel = getSelector(selectedElement);
        if (!notes[sel]) notes[sel] = {};
        notes[sel].type = 'text-edit';
        notes[sel].originalText = oldText;
        notes[sel].newText = newText;
        selectedElement.textContent = newText;
        saveNotes();
    });

    document.getElementById('mysNoteBtn').addEventListener('click', async function(e) {
        e.stopPropagation();
        if (!selectedElement) { alert('Nejprve vyber prvek.'); return; }
        const sel = getSelector(selectedElement);
        const current = notes[sel]?.type === 'text-note' ? notes[sel].content : '';
        const txt = await customPrompt('Textová poznámka:', 'textarea', current);
        if (txt === null) return;
        const cat = await customPrompt('Kategorie (nepovinné):', 'text', notes[sel]?.category || '');
        if (cat === null) return;
        if (!notes[sel]) notes[sel] = {};
        notes[sel].type = 'text-note';
        notes[sel].content = txt;
        notes[sel].category = cat;
        notes[sel].date = Date.now();
        saveNotes();
        if (showEdits) applyEditVisibility();
    });

    document.getElementById('mysAudioBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (!selectedElement) { alert('Nejprve vyber prvek.'); return; }
        if (recording) { stopRecording(); return; }
        startRecording();
    });

    document.getElementById('mysToggleBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        showEdits = !showEdits;
        this.classList.toggle('active-tool', showEdits);
        applyEditVisibility();
    });

    document.getElementById('mysLockBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        locked = !locked;
        localStorage.setItem(LOCK_KEY, locked ? 'true' : 'false');
        this.textContent = locked ? '🔒' : '🔓';
        this.classList.toggle('locked', locked);
        if (!locked && !editing) {
            showEdits = false;
            document.getElementById('mysToggleBtn').classList.remove('active-tool');
            applyEditVisibility();
        }
    });

    document.getElementById('mysExportBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        openExportPanel();
    });

    document.getElementById('mysCollapseBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        const rect = toolbox.getBoundingClientRect();
        toolbox.classList.remove('visible');
        toolbox.style.display = 'none';
        collapsedArrow.style.left = rect.left + 'px';
        collapsedArrow.style.top = rect.top + 'px';
        collapsedArrow.classList.add('visible');
        collapsedArrow.style.display = 'flex';
    });

    // Klikání na prvky stránky (výběr)
    document.body.addEventListener('click', function(e) {
        if (!editing || !selectMode) return;
        if (e.target.closest('.mys-anotator-btn, .mys-toolbox, .mys-collapsed-arrow, .mys-prompt-overlay, .mys-recording-indicator, .mys-export-panel, .mys-note-badge')) return;
        const target = e.target.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, em, strong, blockquote, a, span, div, section, article, button');
        if (!target) return;
        e.preventDefault(); e.stopPropagation();
        if (selectedElement) selectedElement.classList.remove('selected-element');
        selectedElement = target;
        selectedElement.classList.add('selected-element');
        selectMode = false;
        document.getElementById('mysSelBtn').classList.remove('active-tool');
        document.body.style.cursor = '';
    }, true);

    // ========== PŘEPÍNÁNÍ REŽIMU ==========
    mouseBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (editing) {
            deactivate();
        } else {
            const pwd = await customPrompt('Heslo pro vstup do režimu úprav', 'password');
            if (pwd === PASSWORD) activate();
            else if (pwd !== null) alert('Špatné heslo.');
        }
    });

    function activate() {
        editing = true;
        showEdits = locked;
        mouseBtn.classList.add('active');
        mouseBtn.title = 'Režim úprav aktivní';
        toolbox.classList.add('visible');
        toolbox.style.display = 'flex';
        if (collapsedArrow) { collapsedArrow.classList.remove('visible'); collapsedArrow.style.display = 'none'; }
        document.getElementById('mysToggleBtn').classList.toggle('active-tool', showEdits);
        document.getElementById('mysLockBtn').textContent = locked ? '🔒' : '🔓';
        document.getElementById('mysLockBtn').classList.toggle('locked', locked);
        if (showEdits) applyEditVisibility();
    }

    function deactivate() {
        if (!locked) { showEdits = false; applyEditVisibility(); }
        editing = false;
        mouseBtn.classList.remove('active');
        mouseBtn.title = 'Klikni pro zadání hesla';
        toolbox.classList.remove('visible');
        toolbox.style.display = 'none';
        if (collapsedArrow) { collapsedArrow.classList.remove('visible'); collapsedArrow.style.display = 'none'; }
        document.body.style.cursor = '';
        if (selectedElement) { selectedElement.classList.remove('selected-element'); selectedElement = null; }
        selectMode = false;
        document.getElementById('mysSelBtn').classList.remove('active-tool');
        if (exportPanel) closeExportPanel();
        if (!locked) clearBadges();
    }

    // ========== POZNÁMKY ==========
    function applyEditVisibility() {
        clearBadges();
        if (!showEdits) return;
        Object.entries(notes).forEach(([sel, data]) => {
            if (!data || data.hidden) return;
            const el = document.querySelector(sel);
            if (!el) return;
            if (data.type === 'text-edit') el.textContent = data.newText;
            if (data.type === 'text-note') {
                const badge = document.createElement('span');
                badge.className = 'mys-note-badge';
                const preview = data.content.substring(0, 25) + (data.content.length > 25 ? '…' : '');
                badge.innerHTML = `${preview} <span class="badge-close" data-sel="${sel}">✕</span>`;
                if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
                el.appendChild(badge);
                badge.querySelector('.badge-close').addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    notes[this.dataset.sel].hidden = true;
                    saveNotes();
                    applyEditVisibility();
                });
            }
        });
    }

    function clearBadges() {
        document.querySelectorAll('.mys-note-badge').forEach(b => b.remove());
    }

    // ========== ZVUK ==========
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    const sel = getSelector(selectedElement);
                    if (!notes[sel]) notes[sel] = {};
                    notes[sel].type = 'audio';
                    notes[sel].data = reader.result;
                    notes[sel].date = Date.now();
                    saveNotes();
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
                recording = false;
                document.querySelector('.mys-recording-indicator').classList.remove('visible');
            };
            mediaRecorder.start();
            recording = true;
            document.querySelector('.mys-recording-indicator').classList.add('visible');
        } catch(e) { alert('Bez přístupu k mikrofonu.'); }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }

    // ========== EXPORT PANEL ==========
    function openExportPanel() {
        if (exportPanel) closeExportPanel();
        exportPanel = document.createElement('div');
        exportPanel.className = 'mys-export-panel';
        let html = '<button class="close-btn" id="mysCloseExport">×</button><h3>📓 Poznámky</h3>';
        const entries = Object.entries(notes).filter(([_, d]) => d && d.type);
        if (!entries.length) {
            html += '<p style="color:var(--dim);">Žádné poznámky.</p>';
        } else {
            html += '<button id="mysExportTxtBtn" style="margin-bottom:1rem;padding:.3rem .8rem;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;">📥 Export TXT</button>';
            html += entries.map(([sel, data]) => {
                const cat = data.category || '';
                const isAudio = data.type === 'audio';
                const content = data.content || data.newText || '';
                return `<div class="mys-note-entry">
                    <strong>${sel}</strong>
                    <input placeholder="Kategorie" value="${cat}" data-sel="${sel}" class="cat-input">
                    ${isAudio ? `<audio controls src="${data.data}"></audio>` : `<textarea rows="2" data-sel="${sel}" class="text-input">${content}</textarea>`}
                    <button class="save-btn" data-sel="${sel}">💾 Uložit</button>
                    <button class="del-btn" data-sel="${sel}">🗑 Smazat</button>
                </div>`;
            }).join('');
        }
        exportPanel.innerHTML = html;
        document.body.appendChild(exportPanel);

        exportPanel.querySelector('#mysCloseExport').addEventListener('click', closeExportPanel);
        const exportTxtBtn = exportPanel.querySelector('#mysExportTxtBtn');
        if (exportTxtBtn) exportTxtBtn.addEventListener('click', exportTxt);

        exportPanel.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const sel = this.dataset.sel;
                const catInput = exportPanel.querySelector(`.cat-input[data-sel="${sel}"]`);
                const textInput = exportPanel.querySelector(`.text-input[data-sel="${sel}"]`);
                if (!notes[sel]) notes[sel] = {};
                if (catInput) notes[sel].category = catInput.value;
                if (textInput) notes[sel].content = textInput.value;
                saveNotes();
                if (showEdits) applyEditVisibility();
                alert('Uloženo.');
            });
        });
        exportPanel.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                delete notes[this.dataset.sel];
                saveNotes();
                if (showEdits) applyEditVisibility();
                openExportPanel();
            });
        });
    }

    function closeExportPanel() {
        if (exportPanel) { exportPanel.remove(); exportPanel = null; }
    }

    function exportTxt() {
        let txt = `=== POZNÁMKY K ${location.href} ===\n\n`;
        Object.entries(notes).forEach(([sel, data]) => {
            if (!data || !data.type) return;
            txt += `SELEKTOR: ${sel}\nKATEGORIE: ${data.category || ''}\n`;
            if (data.type === 'audio') txt += 'TYP: zvuková poznámka\n\n';
            else txt += `TEXT: ${data.content || data.newText || ''}\n\n`;
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([txt], {type: 'text/plain'}));
        a.download = 'poznamky.txt'; a.click();
    }

    // ========== POMOCNÉ ==========
    function getSelector(el) {
        if (el.id) return '#' + el.id;
        let path = [];
        while (el && el !== document.body) {
            let seg = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                const classes = el.className.trim().split(/\s+/).slice(0,2).filter(c => c !== 'selected-element' && c !== 'mys-note-badge');
                if (classes.length) seg += '.' + classes.join('.');
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

    function saveNotes() { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }

    function customPrompt(text, type = 'text', defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mys-prompt-overlay visible';
            const inputHtml = type === 'textarea'
                ? `<textarea id="mysPromptInput">${defaultValue}</textarea>`
                : `<input type="${type}" id="mysPromptInput" value="${defaultValue}">`;
            overlay.innerHTML = `
                <div class="mys-prompt-box">
                    <div style="margin-bottom:.5rem; color:var(--accent);">${text}</div>
                    ${inputHtml}
                    <div class="mys-prompt-btns">
                        <button id="mysPromptCancel">Zrušit</button>
                        <button class="primary" id="mysPromptOk">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = document.getElementById('mysPromptInput');
            input.focus();
            document.getElementById('mysPromptOk').addEventListener('click', () => {
                const val = input.value;
                overlay.remove();
                resolve(val);
            });
            document.getElementById('mysPromptCancel').addEventListener('click', () => {
                overlay.remove();
                resolve(null);
            });
        });
    }

    function makeDraggable(el) {
        let isDragging = false, startX, startY, origLeft, origTop;
        el.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            const rect = el.getBoundingClientRect();
            origLeft = rect.left; origTop = rect.top;
            el.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            el.style.left = (origLeft + e.clientX - startX) + 'px';
            el.style.top = (origTop + e.clientY - startY) + 'px';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) { isDragging = false; el.style.cursor = 'grab'; }
        });
    }

})();
