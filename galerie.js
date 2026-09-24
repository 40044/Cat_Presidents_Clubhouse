let aktiverBildIndex = 1;
const folderPath = 'Katzen_Bilder';

window.addEventListener('DOMContentLoaded', () => {
    initGallery();
});

function initGallery() {
    const galleryContainer = document.getElementById('cat-gallery');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    const closeBtn = document.getElementById('closeBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!galleryContainer) return;
    galleryContainer.innerHTML = ''; 

    const alleBilderPfade = [];

    // 1. Tin-Bilder (1 bis 28) - jetzt als modernes WebP
    for (let i = 1; i <= 28; i++) {
        alleBilderPfade.push(`${folderPath}/tin-${i}.webp`);
    }

    // 2. Coli-Bilder (1 bis 23) - jetzt als modernes WebP
    for (let i = 1; i <= 23; i++) {
        alleBilderPfade.push(`${folderPath}/coli-${i}.webp`);
    }

    const gesamtBilderCount = alleBilderPfade.length;

    // Lazy Loading via IntersectionObserver
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '50px' });

    alleBilderPfade.forEach((imagePath, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cat-gallery-item';

        const img = document.createElement('img');
        img.dataset.src = imagePath; 
        img.alt = `Club Katze ${index + 1}`;

        itemDiv.addEventListener('click', () => {
            aktiverBildIndex = index + 1;
            oeffneGrossansicht(alleBilderPfade);
        });

        itemDiv.appendChild(img);
        galleryContainer.appendChild(itemDiv);

        imageObserver.observe(img);
    });

    function oeffneGrossansicht(bilderListe) {
        modalImg.src = bilderListe[aktiverBildIndex - 1];
        modal.style.display = 'flex';
    }

    function schliesseGrossansicht() {
        modal.style.display = 'none';
    }

    closeBtn.addEventListener('click', schliesseGrossansicht);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) schliesseGrossansicht();
    });

    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        aktiverBildIndex--;
        if (aktiverBildIndex < 1) aktiverBildIndex = gesamtBilderCount;
        oeffneGrossansicht(alleBilderPfade);
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        aktiverBildIndex++;
        if (aktiverBildIndex > gesamtBilderCount) aktiverBildIndex = 1;
        oeffneGrossansicht(alleBilderPfade);
    });

    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
                aktiverBildIndex--;
                if (aktiverBildIndex < 1) aktiverBildIndex = gesamtBilderCount;
                oeffneGrossansicht(alleBilderPfade);
            } else if (e.key === 'ArrowRight') {
                aktiverBildIndex++;
                if (aktiverBildIndex > gesamtBilderCount) aktiverBildIndex = 1;
                oeffneGrossansicht(alleBilderPfade);
            } else if (e.key === 'Escape') {
                schliesseGrossansicht();
            }
        }
    });
}
