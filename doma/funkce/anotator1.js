// Mys-Zápisník — Anotátor pro Chceš myš?
// Vlož před </body>: <script src="../../funkce/anotator.js"></script>

(function() {
    // ========== KONFIGURACE ==========
    const PASSWORD = "anotator";
    const STORAGE_PREFIX = 'mys_notes_';

    // Získání klíče pro localStorage podle aktuální stránky
    const pageKey = window.location.pathname.replace(/[^a-z0-9]/gi, '_');
    const STORAGE_KEY = STORAGE_PREFIX + pageKey;

    let notes = {};
    let editing = false;
    let selectedElement = null;
    let panel = null;
    let mouseBtn = null;

    // Načtení uložených poznámek
    try { notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { notes = {}; }

    // ========== CSS STYLY ==========
    const style = document.createElement('style');
    style.textContent = `
        .mys-anotator-btn {
            position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 9999;
            width: 44px; height: 44px; cursor: pointer;
            background: var(--bg, #0f0d0a); border: 1px solid var(--accent, #a89880);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            transition: all .25s; box-shadow: 0 2px 8px rgba(0,0,0,.4);
        }
        .mys-anotator-btn img { width: 28px; height: 28px; filter: brightness(0) invert(.8); }
        .mys-anotator-btn.active { background: var(--accent, #a89880); }
        .mys-anotator-btn.active img { filter: brightness(0) invert(0); }

        .mys-anotator-panel {
            display: none; position: fixed; bottom: 5rem; left: 1.5rem; z-index: 9998;
            width: 260px; background: var(--surface, #181410);
            border: 1px solid var(--border, rgba(168,152,128,.3));
            border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.6);
            font-family: var(--mono, monospace); font-size: 12px;
            color: var(--cream, #e8e0d0); overflow: hidden;
        }
        .mys-anotator-panel.visible { display: block; }

        .mys-anotator-panel .header {
            padding: .7rem 1rem; border-bottom: 1px solid var(--border, rgba(168,152,128,.2));
            font-family: var(--serif, serif); font-size: .9rem; color: var(--accent, #a89880);
            display: flex; justify-content: space-between; align-items: center;
        }
        .mys-anotator-panel .header button {
            background: none; border: none; color: var(--dim, rgba(232,224,208,.5));
            cursor: pointer; font-size: .8rem; padding: 0 .3rem;
        }

        .mys-anotator-panel .toolbar {
            display: flex; gap: .3rem; padding: .5rem 1rem;
            border-bottom: 1px solid var(--border, rgba(168,152,128,.15));
        }
        .mys-anotator-panel .toolbar button {
            width: 28px; height: 28px; border-radius: 3px;
            border: 1px solid var(--border, rgba(168,152,128,.2));
            background: transparent; color: var(--dim, rgba(232,224,208,.5));
            cursor: pointer; font-size: .7rem; transition: all .15s;
        }
        .mys-anotator-panel .toolbar button:hover { border-color: var(--accent, #a89880); color: var(--accent, #a89880); }
        .mys-anotator-panel .toolbar button.active-tool { border-color: var(--accent, #a89880); color: var(--accent, #a89880); background: rgba(168,152,128,.1); }

        .mys-anotator-panel .notes-list {
            max-height: 200px; overflow-y: auto; padding: .5rem 1rem;
        }
        .mys-anotator-panel .notes-list::-webkit-scrollbar { width: 2px; }
        .mys-anotator-panel .notes-list::-webkit-scrollbar-thumb { background: var(--accent, #a89880); }

        .mys-note-item {
            border-bottom: 1px solid var(--border, rgba(168,152,128,.1));
            padding: .4rem 0; font-size: .7rem;
        }
        .mys-note-item .note-selector { color: var(--dim, rgba(232,224,208,.4)); font-size: .6rem; }
        .mys-note-item .note-text { color: var(--cream, #e8e0d0); margin-top: .2rem; }
        .mys-note-item .note-actions { display: flex; gap: .3rem; margin-top: .3rem; }
        .mys-note-item .note-actions button {
            background: none; border: 1px solid var(--border, rgba(168,152,128,.2));
            color: var(--dim, rgba(232,224,208,.5)); cursor: pointer;
            font-size: .55rem; padding: .1rem .4rem; border-radius: 2px;
        }
        .mys-note-item .note-actions button:hover { border-color: var(--accent, #a89880); color: var(--accent, #a89880); }

        .selected-element { outline: 2px solid var(--accent, #a89880) !important; outline-offset: 2px; }

        .mys-prompt-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 99999;
            display: none; align-items: center; justify-content: center;
        }
        .mys-prompt-overlay.visible { display: flex; }
        .mys-prompt-box {
            background: var(--surface, #181410); border: 1px solid var(--accent, #a89880);
            padding: 1.5rem; width: 300px; max-width: 90vw;
            font-family: var(--mono, monospace); color: var(--cream, #e8e0d0);
        }
        .mys-prompt-box input, .mys-prompt-box textarea {
            width: 100%; padding: .4rem; margin-top: .5rem;
            background: var(--bg, #0f0d0a); border: 1px solid var(--border, rgba(168,152,128,.2));
            color: var(--cream, #e8e0d0); font-family: inherit; font-size: .8rem;
        }
        .mys-prompt-box button {
            margin-top: .8rem; padding: .4rem 1rem; background: var(--accent, #a89880);
            color: var(--bg, #0f0d0a); border: none; cursor: pointer;
            font-family: inherit; font-size: .7rem; text-transform: uppercase;
        }
    `;
    document.head.appendChild(style);

    // ========== VYTVOŘENÍ UI ==========
    function createUI() {
        // Tlačítko Myši
        mouseBtn = document.createElement('div');
        mouseBtn.className = 'mys-anotator-btn';
        mouseBtn.innerHTML = '<img src="../../ilustrace/mys_ikonka.png" alt="Myš" style="width:28px;height:28px;filter:brightness(0) invert(.8);">';
        mouseBtn.title = 'Klikni pro zadání hesla';
        document.body.appendChild(mouseBtn);

        // Panel
        panel = document.createElement('div');
        panel.className = 'mys-anotator-panel';
        panel.innerHTML = `
            <div class="header">
                <span>📝 Zápisník Myši</span>
                <button id="mysClosePanel">✕</button>
            </div>
            <div class="toolbar">
                <button id="mysToolSelect" title="Vybrat prvek">🎯</button>
                <button id="mysToolEdit" title="Opravit text" disabled>✏️</button>
                <button id="mysToolNote" title="Přidat poznámku" disabled>💬</button>
                <button id="mysToolAudio" title="Nahrát zvuk" disabled>🎤</button>
                <button id="mysToolExport" title="Vygenerovat URL">🔗</button>
            </div>
            <div class="notes-list" id="mysNotesList">
                <div style="color:var(--dim, rgba(232,224,208,.4)); font-style:italic; padding:.5rem 0; font-size:.7rem;">Vyber prvek (🎯) a přidej poznámku.</div>
            </div>
        `;
        document.body.appendChild(panel);

        bindEvents();
    }

    // ========== UDÁLOSTI ==========
    function bindEvents() {
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

        document.getElementById('mysClosePanel').addEventListener('click', function(e) {
            e.stopPropagation();
            panel.classList.remove('visible');
        });

        // Výběr prvku
        document.getElementById('mysToolSelect').addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active-tool');
            document.body.style.cursor = this.classList.contains('active-tool') ? 'crosshair' : '';
            if (!this.classList.contains('active-tool') && selectedElement) {
                selectedElement.classList.remove('selected-element');
                selectedElement = null;
                updateToolButtons();
            }
        });

        // Oprava textu
        document.getElementById('mysToolEdit').addEventListener('click', async function(e) {
            e.stopPropagation();
            if (!selectedElement) return;
            const oldText = selectedElement.textContent.trim();
            const newText = await customPrompt('Nový text:', 'text', oldText);
            if (newText === null || newText === oldText) return;
            const sel = getSelector(selectedElement);
            if (!notes[sel]) notes[sel] = {};
            notes[sel].type = 'text-edit';
            notes[sel].originalText = oldText;
            notes[sel].newText = newText;
            selectedElement.textContent = newText;
            saveNotes();
            renderNotes();
        });

        // Přidání poznámky
        document.getElementById('mysToolNote').addEventListener('click', async function(e) {
            e.stopPropagation();
            if (!selectedElement) return;
            const sel = getSelector(selectedElement);
            const current = notes[sel]?.type === 'text-note' ? notes[sel].content : '';
            const txt = await customPrompt('Textová poznámka:', 'textarea', current);
            if (txt === null) return;
            if (!notes[sel]) notes[sel] = {};
            notes[sel].type = 'text-note';
            notes[sel].content = txt;
            notes[sel].date = Date.now();
            saveNotes();
            renderNotes();
        });

        // Nahrání zvuku
        document.getElementById('mysToolAudio').addEventListener('click', async function(e) {
            e.stopPropagation();
            if (!selectedElement) return;
            const sel = getSelector(selectedElement);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                const chunks = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (!notes[sel]) notes[sel] = {};
                        notes[sel].type = 'audio';
                        notes[sel].data = reader.result;
                        notes[sel].date = Date.now();
                        saveNotes();
                        renderNotes();
                    };
                    reader.readAsDataURL(blob);
                    stream.getTracks().forEach(t => t.stop());
                };
                recorder.start();
                alert('Nahrávám... Klikni na OK pro ukončení.');
                recorder.stop();
            } catch(e) {
                alert('Bez přístupu k mikrofonu.');
            }
        });

        // Export URL
        document.getElementById('mysToolExport').addEventListener('click', function(e) {
            e.stopPropagation();
            if (Object.keys(notes).length === 0) { alert('Žádné poznámky.'); return; }
            const data = encodeURIComponent(JSON.stringify(notes));
            const url = window.location.origin + window.location.pathname + '?mys_notes=' + data;
            navigator.clipboard?.writeText(url).then(() => alert('URL otisk byl zkopírován.'));
        });

        // Klikání na prvky stránky
        document.body.addEventListener('click', function(e) {
            if (!editing) return;
            if (e.target.closest('.mys-anotator-btn, .mys-anotator-panel, .mys-prompt-overlay')) return;
            const selectTool = document.getElementById('mysToolSelect');
            if (!selectTool.classList.contains('active-tool')) return;

            const target = e.target.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, em, strong, blockquote, a, span, div, section, article, button');
            if (!target) return;
            e.preventDefault();
            e.stopPropagation();
            if (selectedElement) selectedElement.classList.remove('selected-element');
            selectedElement = target;
            selectedElement.classList.add('selected-element');
            selectTool.classList.remove('active-tool');
            document.body.style.cursor = '';
            updateToolButtons();
        }, true);
    }

    function updateToolButtons() {
        const hasSelection = selectedElement !== null;
        document.getElementById('mysToolEdit').disabled = !hasSelection;
        document.getElementById('mysToolNote').disabled = !hasSelection;
        document.getElementById('mysToolAudio').disabled = !hasSelection;
    }

    // ========== POZNÁMKY ==========
    function renderNotes() {
        const container = document.getElementById('mysNotesList');
        const entries = Object.entries(notes);
        if (entries.length === 0) {
            container.innerHTML = '<div style="color:var(--dim); font-style:italic; padding:.5rem 0; font-size:.7rem;">Žádné poznámky. Vyber prvek a přidej.</div>';
            return;
        }
        container.innerHTML = entries.map(([sel, data]) => {
            const preview = data.type === 'audio' ? '🔊 Zvuková poznámka' : (data.content || data.newText || '').substring(0, 40);
            const date = data.date ? new Date(data.date).toLocaleDateString('cs-CZ') : '';
            return `<div class="mys-note-item">
                <div class="note-selector">${sel}</div>
                <div class="note-text">${preview}${preview.length > 39 ? '…' : ''}</div>
                <div class="note-actions">
                    <button class="mys-jump-btn" data-sel="${sel}">📍 Skočit</button>
                    <button class="mys-del-btn" data-sel="${sel}">✕ Smazat</button>
                </div>
            </div>`;
        }).join('');

        // Skočit na prvek
        container.querySelectorAll('.mys-jump-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const el = document.querySelector(this.dataset.sel);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('selected-element');
                    setTimeout(() => el.classList.remove('selected-element'), 1500);
                }
            });
        });

        // Smazat poznámku
        container.querySelectorAll('.mys-del-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                delete notes[this.dataset.sel];
                saveNotes();
                renderNotes();
            });
        });
    }

    // ========== POMOCNÉ FUNKCE ==========
    function getSelector(el) {
        if (el.id) return '#' + el.id;
        let path = [];
        while (el && el !== document.body && el !== document.documentElement) {
            let seg = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                const classes = el.className.trim().split(/\s+/).filter(c => c && c !== 'selected-element' && c !== 'mys-highlight').slice(0, 2);
                if (classes.length) seg += '.' + classes.join('.');
            }
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
                if (siblings.length > 1) seg += ':nth-child(' + (siblings.indexOf(el) + 1) + ')';
            }
            path.unshift(seg);
            el = parent;
        }
        return path.join(' > ');
    }

    function saveNotes() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }

    // ========== HESLO PROMPT ==========
    function customPrompt(text, type = 'text', defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mys-prompt-overlay visible';
            overlay.innerHTML = `
                <div class="mys-prompt-box">
                    <div style="margin-bottom:.5rem; color:var(--accent);">${text}</div>
                    ${type === 'textarea' ? 
                        `<textarea id="mysPromptInput" style="min-height:80px;">${defaultValue}</textarea>` :
                        `<input type="${type}" id="mysPromptInput" value="${defaultValue}">`
                    }
                    <div style="display:flex; gap:.5rem; justify-content:flex-end;">
                        <button id="mysPromptCancel" style="background:transparent; border:1px solid var(--border); color:var(--dim);">Zrušit</button>
                        <button id="mysPromptOk">OK</button>
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

    function activate() {
        editing = true;
        mouseBtn.classList.add('active');
        mouseBtn.title = 'Režim úprav aktivní';
        panel.classList.add('visible');
        renderNotes();
        updateToolButtons();
    }

    function deactivate() {
        editing = false;
        mouseBtn.classList.remove('active');
        mouseBtn.title = 'Klikni pro zadání hesla';
        panel.classList.remove('visible');
        document.body.style.cursor = '';
        if (selectedElement) {
            selectedElement.classList.remove('selected-element');
            selectedElement = null;
        }
        document.getElementById('mysToolSelect').classList.remove('active-tool');
        updateToolButtons();
    }

    // Zpracování URL parametru (pro import)
    function processUrlImport() {
        const params = new URLSearchParams(window.location.search);
        const data = params.get('mys_notes');
        if (data) {
            try {
                const imported = JSON.parse(decodeURIComponent(data));
                if (confirm('Byly nalezeny sdílené poznámky. Chceš je načíst?')) {
                    notes = imported;
                    saveNotes();
                    if (editing) renderNotes();
                }
            } catch(e) {}
        }
    }

    // ========== START ==========
    createUI();
    processUrlImport();

})();
