// Benachrichtigungs-Erlaubnis beim Browser anfordern
function initNotifications() {
    if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
    }
}

// ==========================================
// 1. FIREBASE CONFIGURATION & INITIALISIERUNG
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCBa3LQ_Zr-QULwlg3HXbSIkDUdSb4vkkw",
    authDomain: "catpresidentschat.firebaseapp.com",
    projectId: "catpresidentschat",
    storageBucket: "catpresidentschat.firebasestorage.app",
    messagingSenderId: "184683983511",
    appId: "1:184683983511:web:82ade60a28c0416fc86fd2"
};

// Firebase initialisieren
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variable für Initial-Ladezustand
let initialLoadComplete = false;

// Automatisch nach ganz unten scrollen (zu den neuesten Nachrichten)
function scrollChatToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // Sofortiger Scroll-Versuch
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Render-Cycle & Layout absichern (z.B. nach Tab-Wechsel display: none -> display: block)
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    });
}

// ==========================================
// 2. GLOBALE VARIABLEN & INITIALISIERUNG
// ==========================================
let alleTageDaten = {};
let audioEnabled = false;
let lastPlayed = "";
const tage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// Leeres Array für die Songs aus songs.json
let songListe = [];

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        init();
        initTabNavigation();
        initFirebaseChat();
    });
} else {
    init();
    initTabNavigation();
    initFirebaseChat();
}

async function init() {
    initNotifications();
    await loadChampiData();
    await loadSongs();

    updateDisplay();
    setInterval(updateDisplay, 1000);

    loadFilterState();
    renderJukebox();
}

// ==========================================
// 3. FIREBASE CHAT LOGIK & ROTER PUNKT & POP-UP
// ==========================================
function initFirebaseChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatUsername = document.getElementById('chat-username');
    const chatMessages = document.getElementById('chat-messages');

    // Automatisch Nachrichten löschen, die älter als 30 Tage sind
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    db.collection('messages')
        .where('timestamp', '<', thirtyDaysAgo)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const batch = db.batch();
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                return batch.commit();
            }
        })
        .then(() => {
            // Optional: console.log("Alte Chat-Last erfolgreich aufgeräumt.");
        })
        .catch((error) => {
            console.error("Fehler beim Aufräumen alter Nachrichten: ", error);
        });

    // Gespeicherten Namen automatisch laden
    if (chatUsername && localStorage.getItem('chat_username')) {
        chatUsername.value = localStorage.getItem('chat_username');
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            initNotifications();
            const messageText = chatInput ? chatInput.value.trim() : '';
            const username = chatUsername ? chatUsername.value.trim() : 'Anonym';

            if (messageText !== '' && username !== '') {
                // 1. Sofort das Eingabefeld leeren, damit man nicht noch mal Enter drücken kann!
                if (chatInput) chatInput.value = '';

                // Namen im Browser merken
                localStorage.setItem('chat_username', username);

                db.collection('messages').add({
                    username: username,
                    text: messageText,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                })
                    .then(() => {
                        scrollChatToBottom();
                    })
                    .catch((error) => {
                        console.error("Fehler beim Senden: ", error);
                        // Falls ein Fehler auftritt, kannst du den Text optional wieder reinsetzen:
                        // if (chatInput) chatInput.value = messageText;
                    });
            }
        });
    }

    // Live-Nachrichten empfangen
    if (chatMessages) {
        db.collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                chatMessages.innerHTML = ''; // Container zurücksetzen

                let hasNewMessage = false;
                let latestMessageData = null; // Speichert die Daten der neuesten hinzugefügten Nachricht

                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        hasNewMessage = true;
                        latestMessageData = change.doc.data();
                    }
                });

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    const messageElement = document.createElement('div');
                    messageElement.className = 'chat-message';
                    messageElement.style.marginBottom = '8px';
                    messageElement.style.padding = '8px 12px';
                    messageElement.style.background = 'rgba(255, 255, 255, 0.1)';
                    messageElement.style.color = '#ffffff';
                    messageElement.style.fontSize = '13px'; // Schriftgröße kompakt bei 13px
                    messageElement.style.lineHeight = '1.4';
                    messageElement.style.borderRadius = '6px';
                    messageElement.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                    messageElement.style.wordBreak = 'break-word';

                    // Name fett hervorheben & Nachricht anzeigen
                    const nameSpan = document.createElement('strong');
                    nameSpan.className = 'chat-message-author';
                    nameSpan.style.color = '#ff9ebb'; // Schickes Club-Rosa für den Namen
                    nameSpan.style.fontSize = '13px';
                    nameSpan.textContent = (data.username || 'Anonym') + ': ';

                    const textSpan = document.createElement('span');
                    textSpan.className = 'chat-message-text';
                    textSpan.style.fontSize = '13px';
                    textSpan.textContent = data.text || '';
                    messageElement.appendChild(nameSpan);
                    messageElement.appendChild(textSpan);

                    chatMessages.appendChild(messageElement);
                });

                // Automatisch nach ganz unten scrollen (zu den neuesten Nachrichten)
                scrollChatToBottom();

                // Roter Punkt & Desktop Benachrichtigung Logik
                if (initialLoadComplete && hasNewMessage && latestMessageData) {
                    const chatTabContent = document.getElementById('tab-chat');
                    const isChatTabActive = chatTabContent && chatTabContent.classList.contains('active-content');
                    const isWindowFocused = document.hasFocus() && !document.hidden;

                    // Inaktiver Chat-Tab: roten Punkt (.has-unread) am Tab-Button anzeigen
                    if (!isChatTabActive) {
                        setChatUnread(true);
                    }

                    // Desktop Pop-up abfeuern, wenn Chat-Tab inaktiv ist ODER Browserfenster im Hintergrund ist
                    if (!isChatTabActive || !isWindowFocused) {
                        if (window.Notification && Notification.permission === "granted") {
                            try {
                                const notification = new Notification("Cat Presidents Clubhouse 🐾", {
                                    body: `${latestMessageData.username || 'Jemand'}: ${latestMessageData.text || ''}`,
                                    icon: "club_logo.webp"
                                });

                                // NEU: Nur für den Chat das Schnurren abspielen!
                                const purrAudio = new Audio('Champi-Barometer_Songs/cat_purring_sound_short.mp3');
                                purrAudio.play().catch(e => console.log("Audio-Wiedergabe blockiert:", e));

                                notification.onclick = () => {
                                    window.focus();
                                    switchTab(null, 'chat');
                                    notification.close();
                                };
                            } catch (e) {
                                console.warn("Desktop-Benachrichtigung konnte nicht ausgelöst werden:", e);
                            }
                        }
                    }
                }

                initialLoadComplete = true;
            }, (error) => {
                console.error("Fehler beim Abrufen der Chat-Nachrichten: ", error);
            });
    }
}


// ==========================================
// 4. JUKEBOX & BAROMETER
// ==========================================
async function loadSongs() {
    try {
        const response = await fetch('songs.json');
        if (!response.ok) {
            throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
        }
        songListe = await response.json();
    } catch (error) {
        console.error("Fehler beim Laden der songs.json.", error);
        alert("Fehler beim Laden der Songs! Bitte sicherstellen, dass die Seite über einen lokalen Server (http://localhost...) aufgerufen wird.");
    }
}

function enableAudio() {
    initNotifications();
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
            }).catch(() => { });
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
    } catch (e) {
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
    const chkBpp = document.getElementById('chk-bpp');
    const chkJs = document.getElementById('chk-js');
    const chkVbis = document.getElementById('chk-vbis');
    const chkFav = document.getElementById('chk-fav');
    const loopMode = document.getElementById('loop-mode');

    if (chkBpp) localStorage.setItem('filter_bpp', chkBpp.checked);
    if (chkJs) localStorage.setItem('filter_js', chkJs.checked);
    if (chkVbis) localStorage.setItem('filter_vbis', chkVbis.checked);
    if (chkFav) localStorage.setItem('filter_fav', chkFav.checked);
    if (loopMode) localStorage.setItem('loop_mode', loopMode.value);
}

function loadFilterState() {
    const savedBpp = localStorage.getItem('filter_bpp');
    const savedJs = localStorage.getItem('filter_js');
    const savedVbis = localStorage.getItem('filter_vbis');
    const savedFav = localStorage.getItem('filter_fav');
    const savedLoop = localStorage.getItem('loop_mode');

    const chkBpp = document.getElementById('chk-bpp');
    const chkJs = document.getElementById('chk-js');
    const chkVbis = document.getElementById('chk-vbis');
    const chkFav = document.getElementById('chk-fav');
    const loopMode = document.getElementById('loop-mode');

    if (chkBpp) chkBpp.checked = (savedBpp === null) ? true : (savedBpp === 'true');
    if (chkJs) chkJs.checked = (savedJs === null) ? true : (savedJs === 'true');
    if (chkVbis) chkVbis.checked = (savedVbis === null) ? true : (savedVbis === 'true');
    if (chkFav) chkFav.checked = (savedFav === 'true');
    if (loopMode && savedLoop) loopMode.value = savedLoop;
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

// ==========================================
// 5. NAVIGATION & TAB-STEUERUNG
// ==========================================
function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        if (!button.hasAttribute('onclick')) {
            button.addEventListener('click', (evt) => {
                initNotifications();
                const dataTab = button.getAttribute('data-tab');
                if (dataTab) {
                    switchTab(evt, dataTab);
                }
            });
        }
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

    const currentBtn = document.querySelector(`.tab-btn[data-tab="${cleanTabName}"]`);
    if (currentBtn) {
        currentBtn.classList.add('active');
    }

    // Wenn der Chat-Reiter aufgerufen wird: roten Punkt entfernen & automatisch nach ganz unten scrollen
    if (cleanTabName === 'chat') {
        setChatUnread(false);
        scrollChatToBottom();
    }
}

// Steuerung des Benachrichtigungspunkts (roter Punkt am Chat-Button)
function setChatUnread(hasUnread) {
    const chatBtn = document.querySelector('.tab-btn[data-tab="chat"]');
    if (!chatBtn) return;
    if (hasUnread) {
        chatBtn.classList.add('has-unread');
    } else {
        chatBtn.classList.remove('has-unread');
    }
}

// Bei Fokus oder Sichtbarkeit den roten Punkt entfernen, falls der Chat-Tab aktiv ist
window.addEventListener('focus', () => {
    const chatTabContent = document.getElementById('tab-chat');
    if (chatTabContent && chatTabContent.classList.contains('active-content')) {
        setChatUnread(false);
        scrollChatToBottom();
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const chatTabContent = document.getElementById('tab-chat');
        if (chatTabContent && chatTabContent.classList.contains('active-content')) {
            setChatUnread(false);
            scrollChatToBottom();
        }
    }
});

// Global für HTML-Inline-Events verfügbar machen
window.enableAudio = enableAudio;
window.onFilterChange = onFilterChange;
window.playSongByIndex = playSongByIndex;
window.toggleFavorite = toggleFavorite;
window.switchTab = switchTab;
window.setChatUnread = setChatUnread;
window.scrollChatToBottom = scrollChatToBottom;