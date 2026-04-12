function initTheme2(data) {
    const buttonsDiv = document.getElementById('buttons');
    const nameEl = document.getElementById('angleName');
    const descEl = document.getElementById('angleDesc');
    const textEl = document.getElementById('angleText');
    const generativeBlock = document.getElementById('generativeBlock');
    const generativeSentenceEl = document.getElementById('generativeSentence');
    const generatorLink = document.getElementById('generatorLink');

    buttonsDiv.innerHTML = '';

    function updateGeneratorLink(angleName, key) {
        const encodedKey = encodeURIComponent(key);
        const encodedAngle = encodeURIComponent(angleName);
        const url = `generator.html?zvir=Myš&uhel=${encodedAngle}&klic=${encodedKey}`;
        generatorLink.href = url;
    }

    data.forEach((angle) => {
        const btn = document.createElement('button');
        btn.textContent = angle.name;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.angle-list button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            nameEl.textContent = angle.name;
            descEl.textContent = angle.desc;
            textEl.innerHTML = `<p>${angle.text}</p>`;
            if (angle.key) {
                generativeSentenceEl.textContent = angle.key;
                generativeBlock.style.display = 'block';
                updateGeneratorLink(angle.name, angle.key);
            } else {
                generativeBlock.style.display = 'none';
            }
        });
        buttonsDiv.appendChild(btn);
    });

    // Auto-select first
    if (data.length) {
        document.querySelector('.angle-list button')?.click();
    }
}
