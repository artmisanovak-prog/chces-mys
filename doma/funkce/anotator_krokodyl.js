<!-- ===== OPRAVDU FUNGUJÍCÍ ANOTAČNÍ REŽIM (kontextové menu u prvku) ===== -->
<style>
    /* Vstupní tlačítko */
    .secret-note-btn {
        position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
        width: 3rem; height: 3rem; border-radius: 50%;
        background: rgba(10, 138, 138, 0.6); color: white; border: none;
        font-size: 1.4rem; cursor: pointer; backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .secret-note-btn.active { background: #ff5722; }

    /* Kontextové menu u prvku */
    .context-popup {
        position: absolute; z-index: 10001;
        background: #fff; border: 2px solid #111;
        padding: 0.6rem; min-width: 180px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        font-family: sans-serif; font-size: 0.8rem;
    }
    .context-popup button {
        display: block; width: 100%; margin: 0.2rem 0; padding: 0.4rem;
        cursor: pointer; border: 1px solid #ccc; background: #f9f9f9;
        text-align: left; font-size: 0.8rem;
    }
    .context-popup button:hover { background: #eee; }

    /* Zelené tečky pro existující poznámky */
    .note-marker {
        position: absolute; top: -5px; right: -5px;
        width: 10px; height: 10px; background: #4caf50; border-radius: 50%;
        z-index: 998; cursor: pointer; box-shadow: 0 0 4px rgba(0,0,0,0.3);
    }

    /* Export panel (zobrazení poznámek) */
    .export-panel {
        position: fixed; top: 0; right: 0; width: 340px; max-width: 90vw;
        height: 100vh; background: #fff; border-left: 2px solid #111;
        z-index: 10010; padding: 1.5rem; overflow-y: auto;
        box-shadow: -4px 0 20px rgba(0,0,0,0.2);
        font-family: sans-serif; font-size: 0.85rem; color: #111;
    }
    .export-panel audio { width: 100%; margin-top: 0.3rem; }
    .close-export { float: right; cursor: pointer; font-size: 1.8rem; color: #555; }
</style>


<script>
(function() {
    const PASSWORD = "anotator";
    const STORAGE_KEY = 'notes_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');
    let notes = {};
    let editing = false;
    let recorder = null;
    let recording = false;
    let activeElement = null;

    try { notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e) {}

    // --- Vstupní tlačítko ---
    const mainBtn = document.createElement('button');
    mainBtn.className = 'secret-note-btn';
    mainBtn.innerHTML = '🔑';
    document.body.appendChild(mainBtn);

    mainBtn.addEventListener('click', () => {
        if (editing) { deactivate(); return; }
        const pwd = prompt('Heslo:');
        if (pwd === PASSWORD) activate();
        else if (pwd !== null) alert('Špatně.');
    });

    function activate() { editing = true; mainBtn.classList.add('active'); document.body.style.cursor = 'crosshair'; renderDots(); }
    function deactivate() {
        editing = false;
        if (recording) stopRecording(true);
        mainBtn.classList.remove('active');
        document.body.style.cursor = '';
        document.querySelectorAll('.note-marker').forEach(m => m.remove());
        closeContextPopup();
        closeExportPanel();
    }

    // --- Klik na prvek v režimu úprav ---
    document.addEventListener('click', function(e) {
        if (!editing) return;
        const target = e.target.closest('p, h1, h2, h3, h4, h5, h6, a, li, td, th, em, strong, blockquote, img, figcaption, div, section, article, button');
        if (!target) return;
        e.preventDefault(); e.stopPropagation();
        activeElement = target;
        showContextPopup(target, e.clientX, e.clientY);
    }, true);

    // --- Kontextové menu ---
    let popup = null;
    function showContextPopup(target, x, y) {
        closeContextPopup();
        popup = document.createElement('div');
        popup.className = 'context-popup';
        popup.innerHTML = `
            <button id="ctx-text">📝 Napsat poznámku</button>
            <button id="ctx-audio">🎤 Nahrát zvuk</button>
            <button id="ctx-edit">✏️ Upravit</button>
            <button id="ctx-add">➕ Přidat prvek</button>
            <button id="ctx-open">📋 Otevřít poznámky</button>
            <button id="ctx-close">❌ Zavřít</button>
        `;
        document.body.appendChild(popup);
        
        // Umístění co nejblíž ke kliknutí, ale aby se vešlo na obrazovku
        const rect = popup.getBoundingClientRect();
        let left = x, top = y;
        if (x + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
        if (y + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
        popup.style.position = 'fixed';
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';

        // Události
        popup.querySelector('#ctx-text').addEventListener('click', () => { closeContextPopup(); addTextNote(); });
        popup.querySelector('#ctx-audio').addEventListener('click', () => { closeContextPopup(); toggleAudio(); });
        popup.querySelector('#ctx-edit').addEventListener('click', () => { closeContextPopup(); editElement(); });
        popup.querySelector('#ctx-add').addEventListener('click', () => { closeContextPopup(); addElement(); });
        popup.querySelector('#ctx-open').addEventListener('click', () => { closeContextPopup(); openExportPanel(); });
        popup.querySelector('#ctx-close').addEventListener('click', closeContextPopup);
    }

    function closeContextPopup() { if (popup) { popup.remove(); popup = null; } }

    // --- Akce menu ---
    function addTextNote() {
        if (!activeElement) return;
        const sel = getSelector(activeElement);
        const old = typeof notes[sel] === 'string' ? notes[sel] : '';
        const txt = prompt('Poznámka:', old);
        if (txt === null) return;
        notes[sel] = txt.trim() || '';
        saveAndRender();
    }

    function toggleAudio() {
        if (!activeElement) return;
        if (recording) { stopRecording(false); return; }
        startRecording();
    }

    function editElement() {
        // Jednoduchá úprava textu prvku
        if (!activeElement) return;
        const oldText = activeElement.textContent.trim();
        const newText = prompt('Upravit text:', oldText);
        if (newText === null) return;
        activeElement.textContent = newText;
        // Uložíme i jako poznámku, že byl prvek upraven?
        const sel = getSelector(activeElement);
        notes[sel] = 'UPRAVENO: ' + newText;
        saveAndRender();
    }

    function addElement() {
        // Přidá jednoduché tlačítko s odkazem za aktivní prvek
        if (!activeElement) return;
        const url = prompt('URL odkazu (např. https://...):');
        if (!url) return;
        const label = prompt('Text tlačítka:', 'Nový odkaz');
        if (!label) return;
        const btn = document.createElement('a');
        btn.href = url;
        btn.textContent = label;
        btn.style.cssText = 'display:inline-block;padding:0.4rem 1rem;border:1px solid #111;color:#111;text-decoration:none;margin:0.3rem;';
        btn.target = '_blank';
        activeElement.insertAdjacentElement('afterend', btn);
        // Uložíme info o přidaném prvku
        const sel = getSelector(activeElement);
        notes[sel] = (notes[sel] || '') + ' | PŘIDÁN ODKAZ: ' + url;
        saveAndRender();
    }

    // --- Zvuk ---
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            recorder = new MediaRecorder(stream);
            const chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    notes[getSelector(activeElement)] = reader.result;
                    saveAndRender();
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
                recording = false;
                alert('Nahráno.');
            };
            recorder.start();
            recording = true;
            alert('Nahrávání... Pro ukončení klikni znovu na 🎤 (přes menu u prvku).');
        }).catch(() => alert('Bez přístupu k mikrofonu.'));
    }

    function stopRecording(cancel) {
        if (recorder && recorder.state === 'recording') {
            if (cancel) recorder.onstop = null;
            recorder.stop();
        }
    }

    // --- Pomocné ---
    function getSelector(el) {
        if (el.id) return '#' + el.id;
        let path = [];
        while (el && el !== document.body) {
            let seg = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                const classes = el.className.trim().split(/\s+/).slice(0,2);
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

    function saveAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        renderDots();
    }

    function renderDots() {
        document.querySelectorAll('.note-marker').forEach(m => m.remove());
        Object.keys(notes).forEach(sel => {
            try {
                const el = document.querySelector(sel);
                if (el) {
                    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
                    const dot = document.createElement('span');
                    dot.className = 'note-marker';
                    dot.title = typeof notes[sel] === 'string' ? notes[sel] : '🎤 zvuk';
                    el.appendChild(dot);
                }
            } catch(e) {}
        });
    }

    // --- Export panel ---
    let exportPanel = null;
    function openExportPanel() {
        closeExportPanel();
        exportPanel = document.createElement('div');
        exportPanel.className = 'export-panel';
        exportPanel.innerHTML = '<span class="close-export" onclick="this.parentElement.remove()">×</span><h3>Poznámky</h3>';
        const keys = Object.keys(notes);
        if (keys.length === 0) exportPanel.innerHTML += '<p>Žádné.</p>';
        else keys.forEach(k => {
            const div = document.createElement('div');
            div.style.marginBottom = '1rem';
            div.innerHTML = '<strong>' + k + '</strong><br>';
            const val = notes[k];
            if (typeof val === 'string' && val.startsWith('data:audio')) {
                div.innerHTML += '<audio controls src="' + val + '"></audio>';
            } else {
                div.innerHTML += val;
            }
            exportPanel.appendChild(div);
        });
        document.body.appendChild(exportPanel);
    }
    function closeExportPanel() { if (exportPanel) { exportPanel.remove(); exportPanel = null; } }
})();
</script>
