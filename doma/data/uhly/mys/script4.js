function initTheme4(data) {
    const buttonsDiv = document.getElementById('buttons');
    const nameEl = document.getElementById('angleName');
    const descEl = document.getElementById('angleDesc');
    const textEl = document.getElementById('angleText');
    const generativeBlock = document.getElementById('generativeBlock');
    const generativeSentenceEl = document.getElementById('generativeSentence');
    const generatorLink = document.getElementById('generatorLink');
    const output = document.getElementById('output');

    buttonsDiv.innerHTML = '';

    function updateGeneratorLink(angleName, key) {
        const url = `generator.html?zvir=Myš&uhel=${encodeURIComponent(angleName)}&klic=${encodeURIComponent(key)}`;
        generatorLink.href = url;
    }

    function scrollToOutput() {
        setTimeout(() => {
            output.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
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
            scrollToOutput();
        });
        buttonsDiv.appendChild(btn);
    });

    if (data.length) {
        document.querySelector('.angle-list button')?.click();
    }
}
