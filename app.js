let alleTageDaten = {};
let audioEnabled = false;
let lastPlayed = ""; 
const tage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

const songListe = [
    { titel: "Fripps Welt", datei: "Fripps_Welt.mp3", band: "js" },
    { titel: "Die Ra-Kate", datei: "Die_Ra-Kate.mp3", band: "js" },
    { titel: "Lvl 13", datei: "Lvl_13.mp3", band: "js" },
    { titel: "Farah", datei: "Farah.mp3", band: "js" },
    { titel: "Simple Things", datei: "Simple_Things.mp3", band: "js" },
    { titel: "Satteltaschen Parade", datei: "Satteltaschen_Parade.mp3", band: "js" },
    { titel: "Überall Tanzen", datei: "Überall_Tanzen.mp3", band: "js" },
    { titel: "Schnarchstunde im Stall", datei: "Schnarchstunde_im_Stall.mp3", band: "js" },
    { titel: "Sturm ueber Valedale", datei: "Sturm_ueber_Valedale.mp3", band: "js" },
    { titel: "Licht gegen Maschinen", datei: "Licht_gegen_Maschinen.mp3", band: "js" },
    { titel: "Die perfekte Line", datei: "Die_perfekte_Line.mp3", band: "vbis" },
    { titel: "Der lange Ritt", datei: "Der_lange_Ritt.mp3", band: "vbis" },
    { titel: "Geisterstunde", datei: "Erster_und_Letzter.mp3", band: "vbis" },
    { titel: "Das wilde Banjo", datei: "Das_wilde_Banjo.mp3", band: "vbis" },
    { titel: "Champireihe", datei: "Champireihe.mp3", band: "js" },
    { titel: "Pleite", datei: "Pleite.mp3", band: "js" },
    { titel: "Fuck Off Fashion", datei: "Fuck_Off_Fashion.mp3", band: "bpp" },
    { titel: "Lass mich mal durch", datei: "Lass_mich_mal_durch.mp3", band: "js" },
    { titel: "Verpiss dich", datei: "Verpiss_dich.mp3", band: "bpp" },
    { titel: "Die Reihe", datei: "Die_Reihe.mp3", band: "js" },
    { titel: "Ein starkes Team", datei: "Ein_starkes_Team.mp3", band: "js" },
    { titel: "Keine Fahnen", datei: "Keine_Fahnen.mp3", band: "js" },
    { titel: "Illegale Rennen", datei: "Illegale_Rennen.mp3", band: "bpp" },
    { titel: "Zaunrennen", datei: "Zaunrennen.mp3", band: "js" },
    { titel: "Slalomrennen", datei: "Slalomrennen.mp3", band: "js" },
    { titel: "Happy Birthday", datei: "Happy_Birthday.mp3", band: "js" },
    { titel: "Der Frieden kommt", datei: "Der_Frieden_kommt.mp3", band: "js" },
    { titel: "Cat President", datei: "Cat_President.mp3", band: "bpp" },
    { titel: "Drachenhexe", datei: "Drachenhexe.mp3", band: "bpp" },
    { titel: "Keine Geschenke", datei: "Keine_Geschenke.mp3", band: "bpp" },
    { titel: "Lieber Lautt 2", datei: "Lieber_Lautt-2.mp3", band: "bpp" },
    { titel: "Märchengast", datei: "Märchengast.mp3", band: "bpp" },
    { titel: "Verstecktes Dorf", datei: "Verstecktes_Dorf.mp3", band: "bpp" },
    { titel: "Wind in den Haaren", datei: "Wind-in_den_Haaren.mp3", band: "bpp" },
    { titel: "Wo sind die Wölfe", datei: "Wo_sind_die_Wölfe.mp3", band: "bpp" },
    { titel: "Zirkus von Pandoria", datei: "Zirkus_von_Pandoria.mp3", band: "bpp" }
];

window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await loadChampiData();
    updateDisplay();
    setInterval(updateDisplay, 1000);

    loadFilterState();
    renderJukebox();
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
                const soundFile = next.name.toLowerCase().replace(/\s+/g, '') + ".mp3";
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
    localStorage.setItem('loop_mode', document.getElementById('loop-mode').value);
}

function loadFilterState() {
    const savedBpp = localStorage.getItem('filter_bpp');
    const savedJs = localStorage.getItem('filter_js');
    const savedVbis = localStorage.getItem('filter_vbis');
    const savedLoop = localStorage.getItem('loop_mode');

    document.getElementById('chk-bpp').checked = (savedBpp === null) ? true : (savedBpp === 'true');
    document.getElementById('chk-js').checked = (savedJs === null) ? true : (savedJs === 'true');
    document.getElementById('chk-vbis').checked = (savedVbis === null) ? true : (savedVbis === 'true');
    if (savedLoop) {
        document.getElementById('loop-mode').value = savedLoop;
    }
}

function stopOtherSongs(currentAudio) {
    const allAudios = document.querySelectorAll('#jukebox-playlist audio');
    allAudios.forEach(audio => {
        if (audio !== currentAudio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
}

function renderJukebox() {
    const container = document.getElementById('jukebox-playlist');
    const showBpp = document.getElementById('chk-bpp').checked;
    const showJs = document.getElementById('chk-js').checked;
    const showVbis = document.getElementById('chk-vbis').checked;

    const gefilterteSongs = songListe.filter(song => {
        if (song.band === 'bpp' && showBpp) return true;
        if (song.band === 'js' && showJs) return true;
        if (song.band === 'vbis' && showVbis) return true;
        return false;
    });

    if (gefilterteSongs.length === 0) {
        container.innerHTML = '<p style="opacity: 0.6; padding: 10px;">Keine Band ausgewählt. Bitte aktiviere mindestens ein Kästchen.</p>';
        return;
    }

    let html = '';
    gefilterteSongs.forEach((song, index) => {
        const saubererPfad = encodeURI(song.datei);
        let bandLabel = '';
        if (song.band === 'bpp') bandLabel = 'Baby Pink Panda';
        else if (song.band === 'js') bandLabel = 'Jorvik Sisters';
        else if (song.band === 'vbis') bandLabel = 'Vier Brüder im Staub';

        html += `
            <div class="plan-entry jukebox-entry">
                <strong>🐱 ${song.titel} <span style="font-size:0.8em; opacity:0.7;">(${bandLabel})</span></strong>
                <audio id="jukebox-player-${index}" controls preload="none" onplay="stopOtherSongs(this)" onended="playNextSong(${index})">
                    <source src="${saubererPfad}" type="audio/mpeg">
                </audio>
            </div>
        `;
    });
    container.innerHTML = html;
}

function playNextSong(currentIndex) {
    const loopMode = document.getElementById('loop-mode').value;
    
    if (loopMode === 'single') {
        const currentPlayer = document.getElementById(`jukebox-player-${currentIndex}`);
        if (currentPlayer) {
            currentPlayer.currentTime = 0;
            currentPlayer.play();
        }
        return;
    }

    let nextIndex = currentIndex + 1;
    let nextPlayer = document.getElementById(`jukebox-player-${nextIndex}`);

    if (!nextPlayer && loopMode === 'playlist') {
        nextIndex = 0;
        nextPlayer = document.getElementById(`jukebox-player-${nextIndex}`);
    }

    if (nextPlayer) {
        nextPlayer.currentTime = 0;
        nextPlayer.play();
    }
}
