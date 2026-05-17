(function() {
    // KONFIGURACE
    const ICON_SRC = '/doma/ilustrace/mys_ikonka_akcent.jpg'; // Tvoje cesta k ikoně myši
    const STORAGE_KEY = 'mysi_zapisnik_data';

    // --- Inicializace struktury ---
    function createMyTool() {
        // 1. Vytvoříme plovoucí okno
        const noteWindow = document.createElement('div');
        noteWindow.id = 'mysi-zapisnik';
        noteWindow.style.cssText = `
            position: fixed;
            top: 100px;
            left: 100px;
            width: 400px;
            height: 500px;
            background: #1a1a1a;
            color: #eee;
            border: 2px solid #444;
            border-radius: 8px;
            padding: 0;
            z-index: 999999;
            box-shadow: 0 10px 25px rgba(0,0,0,0.6);
            display: none;
            resize: both;
            overflow: hidden;
            font-family: monospace;
            flex-direction: column;
            font-size: 14px;
        `;

        // 2. Hlavička (pro přetahování)
        const header = document.createElement('div');
        header.style.cssText = `
            cursor: move;
            background: #333;
            padding: 8px 12px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <span style="font-weight:bold; color: #ccc;">📋 Zápisník myši</span>
            <span>
                <button id="mys-close-btn" style="background:transparent;border:none;color:red;cursor:pointer;font-size:18px;">✕</button>
            </span>
        `;
        noteWindow.appendChild(header);

        // 3. Tělo (seznam odkazů)
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 12px;
            overflow-y: auto;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        content.id = 'mys-content';
        noteWindow.appendChild(content);

        // 4. Patička (ovládání)
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 8px 12px;
            background: #222;
            border-top: 1px solid #444;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            flex-shrink: 0;
        `;
        footer.innerHTML = `
            <button id="mys-copy-btn" style="flex:1;cursor:pointer;background:#3a3a3a;border:1px solid #555;color:#fff;padding:4px;">📋 Kopírovat URL</button>
            <button id="mys-filter-btn" style="cursor:pointer;background:#3a3a3a;border:1px solid #555;color:#fff;padding:4px;">🔍 Filtrovat</button>
            <button id="mys-clear-btn" style="cursor:pointer;background:#3a3a3a;border:1px solid #555;color:#f00;padding:4px;">🗑 Smazat vše</button>
        `;
        noteWindow.appendChild(footer);

        document.body.appendChild(noteWindow);

        // 5. Ikona myši (tlačítko pro otevření)
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'mys-toggle-btn';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px; 
            z-index: 999998;
            width: 48px;
            height: 48px;
            cursor: pointer;
            background-image: url(${ICON_SRC});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            filter: brightness(0) invert(1); /* Změní obrázek na bílou */
            opacity: 0.6;
            transition: opacity 0.2s;
            border: none;
        `;
        toggleBtn.onmouseover = () => toggleBtn.style.opacity = '1';
        toggleBtn.onmouseout = () => toggleBtn.style.opacity = '0.6';
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = noteWindow.style.display === 'flex';
            noteWindow.style.display = isOpen ? 'none' : 'flex';
            if (!isOpen) loadAndDisplayItems();
        };
        document.body.appendChild(toggleBtn);

        // --- FUNKCIONALITY ---

        // 1. Přetahování okna
        let isDragging = false, offsetX, offsetY;
        header.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - noteWindow.offsetLeft;
            offsetY = e.clientY - noteWindow.offsetTop;
        };
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            noteWindow.style.left = (e.clientX - offsetX) + 'px';
            noteWindow.style.top = (e.clientY - offsetY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        // 2. Změna velikosti tažením okraje (zajištěno CSS `resize: both`)
        
        // 3. Zavření okna (skrytí do ikony)
        document.getElementById('mys-close-btn').onclick = () => {
            noteWindow.style.display = 'none';
        };

        // --- DATA A SPRÁVA ---

        function getData() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } 
            catch { return []; }
        }

        function setData(data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        function renderItems(items) {
            const container = document.getElementById('mys-content');
            container.innerHTML = '';
            if (items.length === 0) {
                container.innerHTML = '<div style="color:#666;text-align:center;margin-top:30px;">Zatím žádné uložené odkazy.</div>';
                return;
            }
            items.forEach((item, index) => {
                const entry = document.createElement('div');
                entry.style.cssText = `
                    background: #2a2a2a;
                    border-left: 3px solid #ffaa00;
                    padding: 6px 10px;
                    border-radius: 4px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    cursor: pointer;
                `;
                // Zobrazíme jen Název, Datum, Nástroj (bez URL)
                entry.innerHTML = `
                    <div style="display:flex;justify-content:space-between;color:#ccc;">
                        <span><strong>${escapeHtml(item.title || 'Bez názvu')}</strong></span>
                        <span style="font-size:11px;color:#888;">${item.date || ''}</span>
                    </div>
                    <div style="font-size:11px;color:#ffaa00;display:flex;gap:6px;">
                        <span>🔧 ${escapeHtml(item.tool || 'N/A')}</span>
                        <span style="color:#666;">|</span>
                        <span style="color:#aaa;cursor:pointer;" class="mys-copy-specific" data-url="${escapeHtml(item.url)}">📋 Kopírovat URL</span>
                        <span style="color:#f00;cursor:pointer;margin-left:auto;" class="mys-delete-item" data-index="${index}">🗑</span>
                    </div>
                `;
                container.appendChild(entry);
            });

            // Event listenery na kopírování konkrétních URL
            container.querySelectorAll('.mys-copy-specific').forEach(el => {
                el.onclick = (e) => {
                    e.stopPropagation();
                    const url = el.getAttribute('data-url');
                    copyToClipboard(url);
                };
            });
            
            // Event listenery na mazání
            container.querySelectorAll('.mys-delete-item').forEach(el => {
                el.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(el.getAttribute('data-index'));
                    let data = getData();
                    data.splice(idx, 1);
                    setData(data);
                    renderItems(data); // Znovu vykreslíme
                };
            });
        }

        function escapeHtml(text) {
            if (!text) return '';
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('URL zkopírováno!');
            }).catch(() => {
                // Fallback pro staré prohlížeče
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('URL zkopírováno!');
            });
        }

        function loadAndDisplayItems() {
            const data = getData();
            renderItems(data);
        }

        // --- TLAČÍTKA V PATIČCE ---

        // Kopírovat URL (aktuální stránky, nebo z clipboardu)
        document.getElementById('mys-copy-btn').onclick = async () => {
            let urlToSave = window.location.href; // Výchozí je aktuální stránka
            // Můžeš zkusit vzít clipboard text, pokud chceš, ale pro jednoduchost bereme aktuální URL
            try {
                const clipboardText = await navigator.clipboard.readText();
                if (clipboardText && clipboardText.startsWith('http')) {
                    urlToSave = clipboardText;
                }
            } catch { /* Ignorovat */ }

            const date = new Date().toLocaleDateString('cs-CZ');
            // Jednoduché určení nástroje (můžeš vylepšit)
            const toolGuess = document.querySelector('title')?.innerText || 'Nástroj neznámý';
            
            let newItem = {
                url: urlToSave,
                title: document.title || 'Nová stránka',
                date: date,
                tool: toolGuess
            };
            
            let data = getData();
            data.unshift(newItem); // Nové nahoře
            setData(data);
            loadAndDisplayItems();
            alert('Uloženo! (aktuální stránka)');
        };

        // Filtrovat (jen ukázka logiky)
        let filterActive = false;
        let allData = getData();
        document.getElementById('mys-filter-btn').onclick = () => {
            if (!filterActive) {
                const filterText = prompt("Zadej filtr (např. datum, nástroj):");
                if (!filterText) return;
                const filtered = allData.filter(item => 
                    (item.title && item.title.toLowerCase().includes(filterText.toLowerCase())) ||
                    (item.tool && item.tool.toLowerCase().includes(filterText.toLowerCase())) ||
                    (item.date && item.date.includes(filterText))
                );
                renderItems(filtered);
                filterActive = true;
                document.getElementById('mys-filter-btn').style.background = '#ffaa00';
                document.getElementById('mys-filter-btn').style.color = '#000';
            } else {
                // Zruš filtr
                renderItems(allData);
                filterActive = false;
                document.getElementById('mys-filter-btn').style.background = '#3a3a3a';
                document.getElementById('mys-filter-btn').style.color = '#fff';
            }
        };

        // Smazat vše
        document.getElementById('mys-clear-btn').onclick = () => {
            if (confirm('Smazat všechny uložené odkazy?')) {
                setData([]);
                allData = [];
                loadAndDisplayItems();
                if (filterActive) {
                    filterActive = false;
                    document.getElementById('mys-filter-btn').style.background = '#3a3a3a';
                    document.getElementById('mys-filter-btn').style.color = '#fff';
                }
            }
        };

        // Načtení při otevření
        loadAndDisplayItems();
        allData = getData(); // refresh
    }

    // Spustit až se DOM načte
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createMyTool);
    } else {
        createMyTool();
    }
})();
