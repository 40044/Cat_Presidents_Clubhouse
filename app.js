let alleTageDaten = {};
let audioEnabled = false;
let lastPlayed = ""; 
const tage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// Leeres Array für die Songs aus songs.json
let songListe = [];

window.addEventListener('DOMContentLoaded', () => {
    init();
    initTabNavigation();
});

async function init() {
    await loadChampiData();
    await loadSongs(); // Songs dynamisch laden
    
    updateDisplay();
    setInterval(updateDisplay, 1000);

    loadFilterState();
    renderJukebox();
}

async function loadSongs() {
    try {
        const response = await fetch('songs.json');
        if (!response.ok) {
            throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
        }
        songListe = await response.json();
    } catch (error) {
        console.error("Fehler beim Laden der songs.json. Mögliche Ursachen: CORS-Blockade (lokales Dateisystem) oder falscher Pfad.", error);
        alert("Fehler beim Laden der Songs! Bitte sicherstellen, dass die Seite über einen lokalen Server (http://localhost...) aufgerufen wird und nicht direkt aus dem Dateisystem (file://...).");
    }
}

function enableAudio() {
    if (!audioEnabled) {
        audioEnabled = true;
        const status = document.getElementById('sound-status');
        if (status) {
            status.innerText = "🔊 SOUNDS AKTIV!";
            status.className = "sound-on";
        }
        const miauAudio = document.getElementById('audio-miau');
        if (miauAudio) {
            miauAudio.play().then(() => { 
                miauAudio.pause(); 
                miauAudio.currentTime = 0; 
            }).catch(() => {});
        }
    }
}

async function loadChampiData() {
    const spreadsheetId = '1rDCPInp1BjzJ2ced7Pv24ZCi8La6mRCCfFEovNiSEoE';
    const fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    try {
        const res = await fetch(fetchUrl);
        const text = await res.text();
        const sep = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
        const rows = text.split(/\r?\n/).map(r => r.split(sep));

        for (let tIdx = 0; tIdx < 7; tIdx++) {
            const colIdx = (tIdx === 0) ? 7 : tIdx; 
            const list = [];
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (r.length > colIdx && r[0] && r[colIdx]) {
                    const time = r[0].trim();
                    const name = r[colIdx].trim();
                    if (time.includes(':') && name.length > 2 && name !== "---") {
                        const p = time.split(':');
                        list.push({ min: parseInt(p[0]) * 60 + parseInt(p[1]), display: time, name });
                    }
                }
            }
            alleTageDaten[tIdx] = list.sort((a, b) => a.min - b.min);
        }
    } catch(e) {
        console.error("Fehler beim Laden der Champi-Daten:", e);
    }
}

function updateDisplay() {
    const jetzt = new Date();
    const deZeit = new Date(jetzt.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    const curMin = deZeit.getHours() * 60 + deZeit.getMinutes();
    const curDay = deZeit.getDay();
    
    const tagElem = document.getElementById('heutiger-tag');
    const localTimeElem = document.getElementById('local-time');
    if (tagElem) tagElem.innerText = tage[curDay];
    if (localTimeElem) {
        localTimeElem.innerText = `Club-Zeit: ${deZeit.getHours()}:${deZeit.getMinutes() < 10 ? '0' : ''}${deZeit.getMinutes()} Uhr`;
    }

    const heutigeChampis = alleTageDaten[curDay] || [];
    let next = null;
    let html = '';

    heutigeChampis.forEach(c => {
        const past = c.min <= curMin;
        html += `<div class="plan-entry" style="${past ? 'opacity:0.3;' : ''}"><span>${c.name}</span><span class="time-tag">${c.display}</span></div>`;
        if (!next && c.min > curMin) {
            const target = new Date(deZeit);
            target.setHours(Math.floor(c.min / 60), c.min % 60, 0, 0);
            next = { ...c, target };
        }
    });
    
    const planElem = document.getElementById('tages-plan');
    if (planElem) planElem.innerHTML = html;

    if (!next) {
        const morgenIdx = (curDay + 1) % 7;
        const morgenChampis = alleTageDaten[morgenIdx] || [];
        if (morgenChampis.length > 0) {
            const c = morgenChampis[0];
            const target = new Date(deZeit);
            target.setDate(target.getDate() + 1);
            target.setHours(Math.floor(c.min / 60), c.min % 60, 0, 0);
            next = { ...c, target };
        }
    }
    
    if (next) {
        const diff = next.target - deZeit;
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        
        const champiNameElem = document.getElementById('champi-name');
        const countdownElem = document.getElementById('countdown');
        if (champiNameElem) champiNameElem.innerText = next.name;
        if (countdownElem) countdownElem.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

        if (audioEnabled) {
            if (m === 10 && s === 0 && lastPlayed !== "10m") {
                const miau = document.getElementById('audio-miau');
                if (miau) miau.play();
                lastPlayed = "10m";
            }
            if (m === 5 && s === 0 && lastPlayed !== "5m") {
                const soundFile = "Champi-Barometer_Songs/" + next.name.toLowerCase().replace(/\s+/g, '') + ".mp3";
                const player = document.getElementById('audio-champi');
                if (player) {
                    player.src = soundFile;
                    player.play().catch(() => console.log("Sound nicht gefunden: " + soundFile));
                }
                lastPlayed = "5m";
            }
            if (m === 9 || m === 4) lastPlayed = ""; 
        }
    }
}

function onFilterChange() {
    saveFilterState();
    renderJukebox();
}

function saveFilterState() {
    localStorage.setItem('filter_bpp', document.getElementById('chk-bpp').checked);
    localStorage.setItem('filter_js', document.getElementById('chk-js').checked);
    localStorage.setItem('filter_vbis', document.getElementById('chk-vbis').checked);
    if (document.getElementById('chk-fav')) {
        localStorage.setItem('filter_fav', document.getElementById('chk-fav').checked);
    }
    localStorage.setItem('loop_mode', document.getElementById('loop-mode').value);
}

function loadFilterState() {
    const savedBpp = localStorage.getItem('filter_bpp');
    const savedJs = localStorage.getItem('filter_js');
    const savedVbis = localStorage.getItem('filter_vbis');
    const savedFav = localStorage.getItem('filter_fav');
    const savedLoop = localStorage.getItem('loop_mode');

    document.getElementById('chk-bpp').checked = (savedBpp === null) ? true : (savedBpp === 'true');
    document.getElementById('chk-js').checked = (savedJs === null) ? true : (savedJs === 'true');
    document.getElementById('chk-vbis').checked = (savedVbis === null) ? true : (savedVbis === 'true');
    if (document.getElementById('chk-fav')) {
        document.getElementById('chk-fav').checked = (savedFav === 'true');
    }
    if (savedLoop) {
        document.getElementById('loop-mode').value = savedLoop;
    }
}

let gefilterteSongListe = [];
let aktuellerSongIndex = -1;
let favoriteSongs = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');

function toggleFavorite(songFile) {
    if (favoriteSongs.includes(songFile)) {
        favoriteSongs = favoriteSongs.filter(f => f !== songFile);
    } else {
        favoriteSongs.push(songFile);
    }
    localStorage.setItem('favoriteSongs', JSON.stringify(favoriteSongs));
    renderJukebox();
}

function renderJukebox() {
    const container = document.getElementById('jukebox-playlist-body');
    if (!container) return;

    const showBpp = document.getElementById('chk-bpp').checked;
    const showJs = document.getElementById('chk-js').checked;
    const showVbis = document.getElementById('chk-vbis').checked;
    const showFav = document.getElementById('chk-fav') ? document.getElementById('chk-fav').checked : false;
    
    const searchInput = document.getElementById('song-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filter anwenden
    gefilterteSongListe = songListe.filter(song => {
        let bandMatch = false;
        if (song.band === 'bpp' && showBpp) bandMatch = true;
        if (song.band === 'js' && showJs) bandMatch = true;
        if (song.band === 'vbis' && showVbis) bandMatch = true;
        if (!bandMatch) return false;

        if (showFav && !favoriteSongs.includes(song.datei)) {
            return false;
        }

        if (searchTerm && !song.titel.toLowerCase().includes(searchTerm)) {
            return false;
        }

        return true;
    });

    if (gefilterteSongListe.length === 0) {
        container.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.6; padding:20px;">Keine Songs gefunden.</td></tr>`;
        return;
    }

    let html = '';
    gefilterteSongListe.forEach((song, index) => {
        let bandLabel = '';
        if (song.band === 'bpp') bandLabel = 'Baby Pink Panda';
        else if (song.band === 'js') bandLabel = 'Jorvik Sisters';
        else if (song.band === 'vbis') bandLabel = '4 Brüder im Staub';

        const isFav = favoriteSongs.includes(song.datei);
        const starIcon = isFav ? '⭐' : '☆';

        html += `
            <tr>
                <td style="text-align: center;">
                    <button class="btn-play-row" onclick="playSongByIndex(${index})">▶</button>
                </td>
                <td style="text-align: center;">
                    <button class="btn-star-row" onclick="toggleFavorite('${song.datei}')" title="Als Favorit markieren/entfernen">${starIcon}</button>
                </td>
                <td><strong>${song.titel}</strong></td>
                <td><span class="band-tag">${bandLabel}</span></td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

function playSongByIndex(index) {
    if (index < 0 || index >= gefilterteSongListe.length) return;
    
    aktuellerSongIndex = index;
    const song = gefilterteSongListe[index];
    const path = "songs_SSO/" + encodeURIComponent(song.datei);

    let bandLabel = '';
    if (song.band === 'bpp') bandLabel = 'Baby Pink Panda';
    else if (song.band === 'js') bandLabel = 'Jorvik Sisters';
    else if (song.band === 'vbis') bandLabel = '4 Brüder im Staub';

    const mainPlayer = document.getElementById('main-audio-player');
    const titleElem = document.getElementById('player-song-title');
    const bandElem = document.getElementById('player-band-name');

    if (mainPlayer) {
        mainPlayer.src = path;
        mainPlayer.play();
        mainPlayer.onended = handleSongEnded;
    }
    if (titleElem) titleElem.innerText = song.titel;
    if (bandElem) bandElem.innerText = bandLabel;
}

function handleSongEnded() {
    const loopMode = document.getElementById('loop-mode') ? document.getElementById('loop-mode').value : 'none';

    if (loopMode === 'single') {
        playSongByIndex(aktuellerSongIndex);
    } else if (loopMode === 'playlist') {
        const naechsterIndex = (aktuellerSongIndex + 1) % gefilterteSongListe.length;
        playSongByIndex(naechsterIndex);
    } else {
        if (aktuellerSongIndex + 1 < gefilterteSongListe.length) {
            playSongByIndex(aktuellerSongIndex + 1);
        }
    }
}

function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', (evt) => {
            const dataTab = button.getAttribute('data-tab');
            if (dataTab) {
                switchTab(evt, dataTab);
            }
        });
    });
}

function switchTab(evt, tabName) {
    if (!tabName) return;
    const cleanTabName = tabName.replace(/^tab-/, '');
    const targetId = `tab-${cleanTabName}`;

    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active-content'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const activeTab = document.getElementById(targetId);
    if (activeTab) {
        activeTab.classList.add('active-content');
    }

    if (evt && evt.currentTarget && evt.currentTarget.classList.contains('tab-btn')) {
        evt.currentTarget.classList.add('active');
    } else {
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${cleanTabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    }
}

// Global für HTML-Inline-Events verfügbar machen
window.enableAudio = enableAudio;
window.onFilterChange = onFilterChange;
window.playSongByIndex = playSongByIndex;
window.toggleFavorite = toggleFavorite;