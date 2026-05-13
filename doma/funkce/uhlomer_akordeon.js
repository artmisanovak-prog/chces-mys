<!-- ═══════════════════════════════════
     SAMOSTATNÝ MODUL: UHLOMĚR MYŠÍHO ČTENÍ
     vlož kamkoliv do <body>
═══════════════════════════════════ -->
<div id="mys-uhlomer-modul" style="max-width:720px; margin:3rem auto; padding:0 1.5rem; font-family: 'DM Mono', monospace; color: var(--cream);">
  <style>
    /* lokální styly, nezasahují zbytek stránky */
    #mys-uhlomer-modul { --cream: #e8e0d0; --dim: rgba(232,224,208,.42); --acc: #a89880; --border: rgba(168,152,128,.15); }
    #mys-uhlomer-modul h2 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 1.8rem; letter-spacing: 0.08em; color: var(--acc); margin-bottom: 0.5rem; }
    #mys-uhlomer-modul .perex { font-size: 0.85rem; color: var(--dim); line-height: 1.8; margin-bottom: 1.8rem; }
    #mys-uhlomer-modul .wheel-box { text-align: center; margin: 1.5rem 0; }
    #mys-uhlomer-modul canvas { max-width: 280px; height: auto; cursor: pointer; }
    #mys-uhlomer-modul .acc-item { border-bottom: 1px solid var(--border); }
    #mys-uhlomer-modul .acc-trigger {
      width: 100%; background: transparent; border: none;
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 0.8rem 0; cursor: pointer; color: var(--acc);
      font-family: 'DM Mono', monospace; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase;
      text-align: left; transition: color 0.2s;
    }
    #mys-uhlomer-modul .acc-trigger:hover, #mys-uhlomer-modul .acc-trigger.open { color: var(--cream); }
    #mys-uhlomer-modul .acc-trigger .sub { font-size: 0.65rem; color: var(--dim); text-transform: none; margin-left: 0.5rem; }
    #mys-uhlomer-modul .acc-arrow { font-size: 0.7rem; transition: transform 0.2s; flex-shrink: 0; }
    #mys-uhlomer-modul .acc-trigger.open .acc-arrow { transform: rotate(180deg); }
    #mys-uhlomer-modul .acc-body { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
    #mys-uhlomer-modul .acc-body.open { max-height: 600px; }
    #mys-uhlomer-modul .acc-inner { padding: 0.5rem 0 1.2rem; font-size: 0.78rem; line-height: 1.9; color: rgba(232,224,208,0.72); }
    #mys-uhlomer-modul .acc-inner strong { color: var(--acc); font-weight: 500; }
    #mys-uhlomer-modul .note { font-size: 0.7rem; color: var(--dim); font-style: italic; margin-top: 1rem; }
  </style>

  <h2>Klíč k úhlům aneb Jak myš čte pohádky</h2>
  <p class="perex">
    Myš si zapisuje do ticha. Do mezer a skulin mezi slovama. Nepíše, co se stalo. Píše, <strong>jak</strong> se na to díváme.<br>
    Tohle není diagnostická tabulka. Tohle je <strong>návod, jak číst myší</strong>.
  </p>

  <div class="wheel-box">
    <canvas id="mysWheelCanvas" width="300" height="300"></canvas>
    <p style="font-size:0.7rem; color:var(--dim); margin-top:0.5rem;">Klikni na segment → rozbalí se vysvětlení úhlu</p>
  </div>

  <div id="mysAccordion"></div>

  <p class="note">
    Myš nesoudí. Myš neříká, který úhel je lepší. Myš počítá.<br>
    Úhly nejsou protikladné, nejsou to osobnostní typy. Fenomény nejsou lidé, ale jevy v jazyce.
  </p>
</div>

<script>
(function() {
  // ═══ DATA ÚHLŮ (podle myšího textu) ═══
  const UHLY_MYS = [
    { nazev: 'Všeobecný (Konkrétní)',  stupne: 0,   barva: '#ffffff',
      jadro: 'Drží se faktů. Děj je děj. Není třeba hledat skryté významy.',
      stopa: 'Převyprávění děje, konstatování faktů, odpor k interpretaci.',
      poznamka: 'Zde někdo důvěřuje tomu, co je napsáno. Ne proto, že by byl naivní. Protože ví, že pod povrchem často nic není.'
    },
    { nazev: 'Analogický (Kulturní)',   stupne: 30,  barva: '#a8d5a2',
      jadro: 'Hledá vzorce. Přirovnává k něčemu, co už zná.',
      stopa: 'Odkaz na jiný příběh, mýtus, archetyp, historickou paralelu.',
      poznamka: 'Zde někdo věří, že nic není nové pod sluncem. Každý příběh už byl vyprávěn – jen v jiném převleku.'
    },
    { nazev: 'Filozofický',             stupne: 60,  barva: '#b3d4ff',
      jadro: 'Hledá univerzální pravdu, podstatu bytí, smysl za smyslem.',
      stopa: 'Obecná pravda, metafyzický tón, důraz na podstatu, ne na děj.',
      poznamka: 'Zde někdo neodpovídá na otázku. Odpovídá na otázku, která je za otázkou. A možná ani to ne.'
    },
    { nazev: 'Naivní',                  stupne: 90,  barva: '#40e0d0',
      jadro: 'Ptá se jednoduše. Odpovídá přímo. Nepřidává.',
      stopa: 'Přímočará morálka, jednoduchá emoce, čistý dojem bez racionalizace.',
      poznamka: 'Zde někdo nepotřebuje být chytrý. Potřebuje být pravdivý. A to je mnohem těžší.'
    },
    { nazev: 'Jazykový',               stupne: 120, barva: '#c8a2c8',
      jadro: 'Slyší slovo, větu, rytmus. Forma je obsah.',
      stopa: 'Citace konkrétní formulace, analýza rytmu, hříčka, zvukomalba.',
      poznamka: 'Zde někdo nerozlišuje mezi tím, co se říká, a jak se to říká. Pro něj je způsob vyjádření tím nejvyšším sdělením.'
    },
    { nazev: 'Metaforický (Symbolický)', stupne: 150, barva: '#2e8b57',
      jadro: 'Vše je symbolem něčeho většího. Nic není jen to, co je.',
      stopa: 'Dekódování symbolů, hledání skrytého významu, převod obrazu do abstrakce.',
      poznamka: 'Zde někdo čte pohádku jako šifru. Každé zvíře, každý předmět, každý pohyb je klíčem k něčemu, co není vysloveno.'
    },
    { nazev: 'Asociační',              stupne: 180, barva: '#d2b48c',
      jadro: 'Myšlení skrz osobní asociace, nečekané souvislosti.',
      stopa: 'Řetěz asociací, odbočky, osobní příhody, skokové myšlení.',
      poznamka: 'Zde někdo nemyslí lineárně. Myslí síťově. Každé slovo je uzel, každá věta spouští deset dalších.'
    },
    { nazev: 'Intro (Introspektivní)',  stupne: 210, barva: '#ffd700',
      jadro: 'Projekce vlastního prožitku. Příběh je záminka k sebepoznání.',
      stopa: 'Osobní zkušenost, emoce, vzpomínka. „Cítím…“, „Dotklo se mě…“, „Připomnělo mi to…“',
      poznamka: 'Zde někdo nereflektuje pohádku. Reflektuje sebe skrze pohádku. A je ochoten to přiznat.'
    },
    { nazev: 'Ironický',               stupne: 240, barva: '#ffa500',
      jadro: 'Vidí propast mezi záměrem a výsledkem, mezi pózou a skutečností.',
      stopa: 'Odhalení pokrytectví, trapnosti, sebeklamu. Lehký sarkasmus, hořký úsměv.',
      poznamka: 'Zde někdo ví, že věci nejsou tím, čím se zdají. A dělá mu dobře, že to ví dřív než ostatní.'
    },
    { nazev: 'Groteskní',              stupne: 270, barva: '#dc143c',
      jadro: 'Vidí přehnané, karikující, temně komické. Smích, který škrábe.',
      stopa: 'Důraz na přehnanost, trapnost, černý humor, karikaturu.',
      poznamka: 'Zde někdo ví, že tragédie a komedie jsou sestry. A že nejlepší způsob, jak mluvit o bolesti, je udělat z ní cirkus.'
    },
    { nazev: 'Absurdní',               stupne: 300, barva: '#c71585',
      jadro: 'Hledá rozpor, paradox, místo, kde svět přestal dávat smysl.',
      stopa: 'Důraz na nesmysl, na zhroucení pravidel, na absurditu systému.',
      poznamka: 'Zde se někdo nespokojil s vysvětlením. Zde někdo potřeboval, aby svět byl důsledně nedůsledný.'
    },
    { nazev: 'Surrealistický',         stupne: 330, barva: '#8b4513',
      jadro: 'Spojuje nespojitelné. Myslí v obrazech, ne v argumentech.',
      stopa: 'Bizarní spojení, snová logika, obraz bez vysvětlení. Krása, která se nehodí.',
      poznamka: 'Zde někdo neinterpretuje. Zde někdo nechá příběh, aby se v něm rozléval. A pak zapíše, co vyplavalo.'
    }
  ];

  const canvas = document.getElementById('mysWheelCanvas');
  const ctx = canvas.getContext('2d');
  const CX = 150, CY = 150, RMAX = 132, RMIN = 38;

  function drawWheel() {
    ctx.clearRect(0,0,300,300);
    const sa = (Math.PI*2)/12;
    UHLY_MYS.forEach((u,i) => {
      const startA = -Math.PI/2 + i*sa + 0.04;
      const endA = startA + sa - 0.08;
      // barevný segment
      ctx.beginPath(); ctx.moveTo(CX,CY); ctx.arc(CX,CY,RMAX,startA,endA); ctx.closePath();
      ctx.fillStyle = u.barva + '20'; // jemná výplň
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,152,128,.2)'; ctx.lineWidth = 1; ctx.stroke();
      // popisek
      const midA = startA + (sa-0.08)/2;
      const lr = (RMAX+RMIN)/2 + 6;
      const lx = CX + Math.cos(midA)*lr;
      const ly = CY + Math.sin(midA)*lr;
      ctx.save(); ctx.translate(lx,ly); ctx.rotate(midA + Math.PI/2);
      ctx.fillStyle = u.barva;
      ctx.font = '300 7px "DM Mono", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(u.nazev.split(' ')[0], 0, 0); // zkráceně
      ctx.restore();
    });
    // vnitřní kruh
    ctx.beginPath(); ctx.arc(CX,CY,RMIN,0,Math.PI*2);
    ctx.fillStyle = '#0f0f0f'; ctx.fill();
    ctx.strokeStyle = 'rgba(168,152,128,.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(168,152,128,.3)'; ctx.font = '300 9px "DM Mono"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('12 úhlů', CX, CY);
  }

  // ═══ AKORDEON ═══
  const accContainer = document.getElementById('mysAccordion');
  function buildAccordion() {
    accContainer.innerHTML = '';
    UHLY_MYS.forEach((u, idx) => {
      const item = document.createElement('div');
      item.className = 'acc-item';
      item.id = 'acc-item-'+idx;
      item.innerHTML = `
        <button class="acc-trigger" data-idx="${idx}">
          <span>${u.nazev} <span class="sub">${u.stupne}°</span></span>
          <span class="acc-arrow">▼</span>
        </button>
        <div class="acc-body">
          <div class="acc-inner">
            <p><strong>Jádro:</strong> ${u.jadro}</p>
            <p><strong>Myš poznamená:</strong> „${u.poznamka}“</p>
            <p><strong>Stopa v odpovědi:</strong> ${u.stopa}</p>
          </div>
        </div>
      `;
      accContainer.appendChild(item);
      const btn = item.querySelector('.acc-trigger');
      btn.addEventListener('click', function() {
        toggleAccordion(idx);
      });
    });
  }

  function toggleAccordion(idx) {
    const item = document.getElementById('acc-item-'+idx);
    if (!item) return;
    const trigger = item.querySelector('.acc-trigger');
    const body = item.querySelector('.acc-body');
    const isOpen = body.classList.contains('open');
    // Zavři všechny ostatní (volitelně)
    document.querySelectorAll('#mys-uhlomer-modul .acc-body.open').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('#mys-uhlomer-modul .acc-trigger.open').forEach(t => t.classList.remove('open'));
    if (!isOpen) {
      trigger.classList.add('open');
      body.classList.add('open');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  }

  // ═══ KLIK NA KOLO ═══
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = 300 / rect.width;
    const mx = (e.clientX - rect.left) * scale - CX;
    const my = (e.clientY - rect.top) * scale - CY;
    const dist = Math.sqrt(mx*mx + my*my);
    if (dist < RMIN || dist > RMAX) return;
    let angle = Math.atan2(my, mx) + Math.PI/2;
    if (angle < 0) angle += Math.PI*2;
    const idx = Math.floor(angle / (Math.PI*2/12));
    if (UHLY_MYS[idx]) {
      toggleAccordion(idx);
      document.getElementById('acc-item-'+idx).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  drawWheel();
  buildAccordion();
})();
</script>
