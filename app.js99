import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// 🛑 SUPABASE CONFIGURATION 🛑
// ==========================================
const SUPABASE_URL = 'https://vzmnmdejsmdwupknhokf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bW5tZGVqc21kd3Vwa25ob2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzE4MzcsImV4cCI6MjA5MTc0NzgzN30.VhUCtUA4351pTqygXwhDK2Ups6IPMjhMMW3XB9JlDy8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
window.submissions = [];
window.currentTrack = null;
window.bestPartTimeout = null;
let wavesurfer;
let fireStreakLocal = 0;
let isSwapping = false;
let currentLoadId = 0; 

// ==========================================
// COOKIE HELPER FUNCTIONS
// ==========================================
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

// ==========================================
// CONFIG & BACKGROUND HELPERS
// ==========================================
async function getConfigValue(key) {
    try {
        const { data, error } = await supabase.from('config').select('value').eq('key', key).single();
        if (error) throw error;
        return data?.value || null;
    } catch (e) { return null; }
}

async function updateConfigValue(key, value) {
    try {
        const { error } = await supabase.from('config').upsert([{ key, value }]);
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}

async function loadPageBackground() {
    const bgUrl = await getConfigValue('background_image_url');
    const bgElement = document.getElementById('page-background');
    if (bgUrl) {
        bgElement.style.backgroundImage = `url('${bgUrl}')`;
    } else {
        bgElement.style.backgroundImage = `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')`; 
    }
}

// ==========================================
// FIRE STREAK LOGIC
// ==========================================
async function getFireStreak() {
    const data = await Promise.all([
        getConfigValue('fire_streak_count'),
        getConfigValue('fire_streak_last_click')
    ]);
    const count = parseInt(data[0]) || 0;
    const lastClick = parseInt(data[1]) || 0;
    const currentTime = Date.now();

    if (currentTime - lastClick > 60000) {
        fireStreakLocal = 0;
        updateFireStreakDisplay(0);
        await Promise.all([
            updateConfigValue('fire_streak_count', '0'),
            updateConfigValue('fire_streak_last_click', currentTime.toString())
        ]);
    } else {
        fireStreakLocal = count;
        updateFireStreakDisplay(count);
    }
}

function updateFireStreakDisplay(count) {
    document.getElementById('fire-streak-display').innerText = count.toString();
}

window.handleFireButtonClick = async () => {
    fireStreakLocal += 1;
    updateFireStreakDisplay(fireStreakLocal);
    
    const btn = document.querySelector('.fire-btn');
    btn.style.transform = 'scale(1.3)';
    setTimeout(() => { btn.style.transform = ''; }, 100);

    const currentTime = Date.now();
    const lastClickStr = await getConfigValue('fire_streak_last_click');
    const isExpired = (currentTime - parseInt(lastClickStr || '0')) > 60000;
    let newCount = isExpired ? 1 : fireStreakLocal;

    await Promise.all([
        updateConfigValue('fire_streak_count', newCount.toString()),
        updateConfigValue('fire_streak_last_click', currentTime.toString())
    ]);
};

// ==========================================
// UI TOGGLES (CHAT & QUEUE)
// ==========================================
let chatUsername = getCookie("chat_username");

window.toggleChat = () => {
    const chatPanel = document.getElementById('chat-panel');
    chatPanel.classList.toggle('open');
    document.body.classList.toggle('chat-open');
    if(chatPanel.classList.contains('open')) {
        const chatBox = document.getElementById('chat-messages');
        chatBox.scrollTop = chatBox.scrollHeight;
    }
};

window.toggleQueue = () => {
    const queueDrawer = document.getElementById('queue-drawer');
    queueDrawer.classList.toggle('expanded');
    document.body.classList.toggle('queue-open');
};

async function fetchChat() {
    const chatBox = document.getElementById('chat-messages');
    const { data, error } = await supabase.from('chat_messages').select('*').order('timestamp', { ascending: true });
    if (error) return;
    
    if(!data || data.length === 0) {
        chatBox.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 50%;">> NO MESSAGES YET.</p>';
        return;
    }

    let newHTML = '';
    data.forEach(msg => {
        newHTML += `<div class="chat-msg"><span class="user">${msg.user}</span><span class="text">${msg.text}</span></div>`;
    });
    
    chatBox.innerHTML = newHTML;
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendChatMessage = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value;
    if(!text.trim()) return;

    if(!chatUsername) {
        chatUsername = prompt("Enter a display name for the chat:");
        if(!chatUsername || chatUsername.trim() === "") return;
        setCookie("chat_username", chatUsername, 365); 
    }
    
    input.value = ''; 
    const chatBox = document.getElementById('chat-messages');
    if(chatBox.innerHTML.includes('> NO MESSAGES YET.')) chatBox.innerHTML = '';
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';
    msgDiv.innerHTML = `<span class="user">${chatUsername}</span><span class="text">${text}</span>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    const { error } = await supabase.from('chat_messages').insert([{ user: chatUsername, text: text }]);
    if (error) { msgDiv.remove(); alert("Failed to send message."); }
};

// ==========================================
// ALL REAL-TIME SUBSCRIPTIONS
// ==========================================
supabase.channel('public:config')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config' }, payload => {
     if (payload.new.key === 'fire_streak_count' || payload.new.key === 'fire_streak_last_click') getFireStreak(); 
  }).subscribe();

supabase.channel('public:chat_messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
     const chatBox = document.getElementById('chat-messages');
     const msg = payload.new;
     if(chatBox.innerHTML.includes('> NO MESSAGES YET.')) chatBox.innerHTML = '';
     
     const existingMsgs = chatBox.querySelectorAll('.chat-msg');
     let isDuplicate = false;
     for(let i = Math.max(0, existingMsgs.length - 3); i < existingMsgs.length; i++) {
         if(existingMsgs[i].querySelector('.user').innerText === msg.user && existingMsgs[i].querySelector('.text').innerText === msg.text) {
             isDuplicate = true; break;
         }
     }
     
     if(!isDuplicate) {
         const msgDiv = document.createElement('div');
         msgDiv.className = 'chat-msg';
         msgDiv.innerHTML = `<span class="user">${msg.user}</span><span class="text">${msg.text}</span>`;
         chatBox.appendChild(msgDiv);
         chatBox.scrollTop = chatBox.scrollHeight;
     }
  }).subscribe();

loadPageBackground();
fetchChat();
getFireStreak();

// ==========================================
// AUTH LOGIC & NAVIGATION
// ==========================================
const VALID_PASSWORD_HASH = "f42ae91cdf459260f21ce2be51c74c0b2aafa59a9d649289d30107aaa98bca6a";
window.isAdminLoggedIn = false;

window.hashPassword = async (password) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

window.handleNavAdmin = () => {
    if (window.isAdminLoggedIn) { window.switchTab('admin'); } 
    else { window.switchTab('login'); document.getElementById('admin-pass').value = ''; document.getElementById('login-error').style.display = 'none'; }
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link')[3].classList.add('active'); 
};

window.attemptLogin = async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-pass').value;
    const hashedInput = await window.hashPassword(input);
    if (hashedInput === VALID_PASSWORD_HASH) {
        window.isAdminLoggedIn = true; window.switchTab('admin');
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-link')[3].classList.add('active');
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
};

window.logoutAdmin = () => { window.isAdminLoggedIn = false; window.switchTab('home'); };

window.switchTab = (tabId) => {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId + '-view').classList.add('active');
    const navLinks = document.querySelectorAll('.nav-link');
    if(tabId === 'home') navLinks[0].classList.add('active');
    if(tabId === 'submit') navLinks[1].classList.add('active');
};
// ==========================================
// QUEUE SORTING HELPER 
// ==========================================
function getSortedQueue() {
    return [...window.submissions].sort((a, b) => {
        const diff = ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0));
        if (diff !== 0) return diff;
        return (a.createdat || a.id).localeCompare(b.createdat || b.id);
    });
}

// ==========================================
// TRACK COUNTER HELPER
// ==========================================
function updateTrackCounter() {
    const counterEl = document.getElementById('track-counter');
    if (!window.currentTrack || window.submissions.length === 0) {
        counterEl.innerText = '- / -';
        return;
    }
    let sorted = getSortedQueue();
    let currentIndex = sorted.findIndex(s => s.id === window.currentTrack.id);
    if (currentIndex !== -1) {
        counterEl.innerText = `${currentIndex + 1} / ${sorted.length}`;
    }
}

// ==========================================
// ZOOMED WAVESURFER
// ==========================================
const formatTime = (seconds) => {
    const min = Math.floor((seconds || 0) / 60);
    const sec = Math.floor((seconds || 0) % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

document.addEventListener("DOMContentLoaded", () => {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'rgba(255, 255, 255, 0.15)', 
        progressColor: 'rgba(255, 255, 255, 1)', 
        cursorColor: '#ffffff',
        cursorWidth: 2,
        barWidth: 4,  
        barGap: 2, 
        barRadius: 4, 
        height: 140, 
        normalize: true,
        minPxPerSec: 0, 
        autoCenter: true,  
        hideScrollbar: true
    });

    wavesurfer.on('play', () => { document.getElementById('icon-play').style.display = 'none'; document.getElementById('icon-pause').style.display = 'block'; });
    wavesurfer.on('pause', () => { document.getElementById('icon-play').style.display = 'block'; document.getElementById('icon-pause').style.display = 'none'; });
    wavesurfer.on('finish', () => window.nextTrack());
    wavesurfer.on('timeupdate', (currentTime) => { document.getElementById('time-current').innerText = formatTime(currentTime); });
    
    wavesurfer.on('ready', () => {
        const duration = wavesurfer.getDuration();
        document.getElementById('time-total').innerText = formatTime(duration);
        document.getElementById('time-current').innerText = formatTime(0);
        
        const safeZoom = duration > 0 ? Math.min(100, 12000 / duration) : 100;
        wavesurfer.setOptions({ minPxPerSec: safeZoom });

        // Backup force-reset for visual progress bar
        wavesurfer.stop();
        wavesurfer.seekTo(0);
    });
});

// ==========================================
// SUPABASE QUEUE LISTENER (AUTO-LOADS 1ST SONG)
// ==========================================
let isFirstLoad = true;

async function fetchSubmissionsData() {
    const { data, error } = await supabase.from('submissions').select('*');
    if (error) return console.error(error);
    window.submissions = data || [];
    renderSubmissions();
    
    if (isFirstLoad && window.submissions.length > 0) {
        isFirstLoad = false;
        let sorted = getSortedQueue();
        window.loadSong(sorted[0].id, false); 
    } else {
        updatePlayerVoteUI(); 
        updateTrackCounter();
    }
}

supabase.channel('public:submissions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
     fetchSubmissionsData();
  }).subscribe();

fetchSubmissionsData();

function renderSubmissions() {
    const listContainer = document.getElementById('submission-list');
    listContainer.innerHTML = '';
    
    if(window.submissions.length === 0) { listContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); font-family: Orbitron; margin-top: 20px;">> QUEUE EMPTY</p>'; return; }

    let votedTracks = JSON.parse(localStorage.getItem('voted_tracks')) || {};
    let sorted = getSortedQueue();

    sorted.forEach((sub, index) => {
        const userVote = votedTracks[sub.id]; 
        const item = document.createElement('div');
        item.className = 'submission-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;" onclick="loadSong('${sub.id}', true)">
                <span style="font-family: 'Space Grotesk'; font-size: 1.2rem; font-weight: 700; color: rgba(255,255,255,0.5);">${index + 1}</span>
                <div>
                    <div style="font-weight: 700; font-size: 1.1rem; font-family: 'Space Grotesk';">${sub.title}</div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 0.85rem;">${sub.artist}</div>
                </div>
            </div>
            <div class="vote-box pill-shape">
                <div class="vote-group" onclick="vote('${sub.id}', 'up')">
                    <button class="vote-btn upvote ${userVote === 'up' ? 'voted-up' : ''}">▲</button>
                    <span class="vote-count">${sub.upvotes || 0}</span>
                </div>
                <div class="vote-divider"></div>
                <div class="vote-group" onclick="vote('${sub.id}', 'down')">
                    <button class="vote-btn downvote ${userVote === 'down' ? 'voted-down' : ''}">▼</button>
                    <span class="vote-count">${sub.downvotes || 0}</span>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// ==========================================
// PLAYER CONTROLS & ANTI-OVERLAP FIX
// ==========================================
function updatePlayerVoteUI() {
    if (!window.currentTrack) return;
    const trackId = window.currentTrack.id;
    const sub = window.submissions.find(s => s.id === trackId);
    if(!sub) return;
    
    document.getElementById('player-up-count').innerText = sub.upvotes || 0;
    document.getElementById('player-down-count').innerText = sub.downvotes || 0;
    
    let votedTracks = JSON.parse(localStorage.getItem('voted_tracks')) || {};
    let userVote = votedTracks[trackId];
    
    document.getElementById('player-up-btn').classList.toggle('voted-up', userVote === 'up');
    document.getElementById('player-down-btn').classList.toggle('voted-down', userVote === 'down');
}

window.loadSong = async (id, autoPlay = false) => {
    const track = window.submissions.find(s => s.id === id);
    if(!track) return;
    
    const myLoadId = ++currentLoadId;
    window.currentTrack = track;
    
    document.getElementById('ui-title').innerText = track.title;
    document.getElementById('ui-artist').innerText = track.artist;
    
    updatePlayerVoteUI(); 
    updateTrackCounter();
    
    if(typeof wavesurfer !== 'undefined' && wavesurfer !== null) {
        wavesurfer.stop(); // Force visual progress bar to 0 immediately
        wavesurfer.empty(); 
        clearTimeout(window.bestPartTimeout);
        
        try {
            await wavesurfer.load(track.fileurl);
            
            if (currentLoadId !== myLoadId) return;
            if (autoPlay) {
                wavesurfer.play();
            }
        } catch (error) {
            console.error("Audio load safely aborted.");
        }
    } else {
        setTimeout(() => window.loadSong(id, autoPlay), 100);
    }
};

window.togglePlay = () => { 
    if(!window.currentTrack) return alert("Select a track first.");
    clearTimeout(window.bestPartTimeout); wavesurfer.playPause(); 
};
window.forward5 = () => wavesurfer.skip(5);
window.rewind5 = () => wavesurfer.skip(-5);

window.playBestPart = () => {
    if (!window.currentTrack || !wavesurfer.getDuration()) return alert("Select a track first.");
    clearTimeout(window.bestPartTimeout);
    wavesurfer.setTime(window.currentTrack.beststart);
    wavesurfer.play();
    window.bestPartTimeout = setTimeout(() => { wavesurfer.pause(); }, 20000);
};

// ==========================================
// SMOOTH HARDWARE ACCELERATED ANIMATIONS
// ==========================================
window.nextTrack = () => {
    if(!window.currentTrack || window.submissions.length === 0 || isSwapping) return;
    
    let sorted = getSortedQueue();
    if (sorted.length <= 1) {
        wavesurfer.stop();
        wavesurfer.play(); 
        return;
    }

    isSwapping = true;
    const playerContainer = document.getElementById('player-container');
    playerContainer.classList.add('swapping-out-left');
    
    setTimeout(() => {
        let currentIndex = sorted.findIndex(s => s.id === window.currentTrack.id);
        let nextIndex = currentIndex + 1;
        if (nextIndex >= sorted.length) nextIndex = 0; 
        
        window.loadSong(sorted[nextIndex].id, true); 
        
        playerContainer.classList.remove('swapping-out-left');
        playerContainer.classList.add('prep-right');
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                playerContainer.classList.remove('prep-right');
                isSwapping = false;
            });
        });
    }, 400); 
};

window.prevTrack = () => {
    if(!window.currentTrack || window.submissions.length === 0 || isSwapping) return;
    if (wavesurfer.getCurrentTime() > 3) { wavesurfer.stop(); wavesurfer.play(); return; }
    
    let sorted = getSortedQueue();
    if (sorted.length <= 1) {
        wavesurfer.stop();
        wavesurfer.play();
        return;
    }

    isSwapping = true;
    const playerContainer = document.getElementById('player-container');
    playerContainer.classList.add('swapping-out-right');
    
    setTimeout(() => {
        let currentIndex = sorted.findIndex(s => s.id === window.currentTrack.id);
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = sorted.length - 1;
        
        window.loadSong(sorted[prevIndex].id, true); 
        
        playerContainer.classList.remove('swapping-out-right');
        playerContainer.classList.add('prep-left');
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                playerContainer.classList.remove('prep-left');
                isSwapping = false;
            });
        });
    }, 400);
};

window.voteCurrent = (type) => {
    if (!window.currentTrack) return;
    window.vote(window.currentTrack.id, type);
};

window.vote = async (id, type) => {
    const sub = window.submissions.find(s => s.id === id);
    if (!sub) return;

    let votedTracks = JSON.parse(localStorage.getItem('voted_tracks')) || {};
    let previousVote = votedTracks[id];
    if (previousVote === type) return;

    let newUp = sub.upvotes || 0;
    let newDown = sub.downvotes || 0;

    if (type === 'up') {
        newUp += 1;
        if (previousVote === 'down') newDown = Math.max(0, newDown - 1);
    } else {
        newDown += 1;
        if (previousVote === 'up') newUp = Math.max(0, newUp - 1);
    }

    sub.upvotes = newUp; sub.downvotes = newDown;
    votedTracks[id] = type;
    localStorage.setItem('voted_tracks', JSON.stringify(votedTracks));
    renderSubmissions(); 
    if(window.currentTrack && window.currentTrack.id === id) updatePlayerVoteUI();

    await supabase.from('submissions').update({ upvotes: newUp, downvotes: newDown }).eq('id', id);
};

// ==========================================
// UPLOADS & ADMIN DELETION LOGIC
// ==========================================
window.handleBackgroundUpload = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('bg-upload-btn');
    const originalText = btn.innerText;
    const fileInput = document.getElementById('bg-file');
    const file = fileInput.files[0];

    if (!file || !file.type.startsWith('image/')) return alert("Upload images only.");
    if (file.size > 10 * 1024 * 1024) return alert("File too big (max 10MB).");

    btn.innerText = "UPDATING..."; btn.disabled = true;

    try {
        const storagePath = `current_background_${Date.now()}`;
        await supabase.storage.from('backgrounds').remove([`current_background`]);
        const { error: uploadError } = await supabase.storage.from('backgrounds').upload(storagePath, file, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('backgrounds').getPublicUrl(storagePath);
        const success = await updateConfigValue('background_image_url', urlData.publicUrl);
        if (!success) throw new Error("Config update failed.");

        alert("Background successfully updated!");
        fileInput.value = ''; 
        loadPageBackground(); 
    } catch (error) { alert("Background update failed. Ensure the 'backgrounds' storage bucket exists."); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
};

window.handleUpload = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    const title = document.getElementById('track-title').value;
    const artist = document.getElementById('track-artist').value;
    const bestStart = parseInt(document.getElementById('track-best-start').value);
    const file = document.getElementById('track-file').files[0];

    const fileName = file.name.toLowerCase();
    if (!['audio/mpeg', 'audio/flac', 'audio/x-flac'].includes(file.type) && !fileName.endsWith('.mp3') && !fileName.endsWith('.flac')) {
        return alert("Invalid file format. .mp3 or .flac only.");
    }

    btn.innerText = "CHECKING LENGTH..."; 
    btn.disabled = true;

    // Async helper to check length before hitting the database
    const getAudioDuration = (f) => new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.src = URL.createObjectURL(f);
        audio.onloadedmetadata = () => { URL.revokeObjectURL(audio.src); resolve(audio.duration); };
        audio.onerror = () => resolve(0);
    });

    const duration = await getAudioDuration(file);
    if (duration > 360) {
        btn.innerText = "SUBMIT";
        btn.disabled = false;
        return alert("Upload blocked: Audio file exceeds the 6-minute maximum limit.");
    }

    btn.innerText = "TRANSMITTING..."; 
    
    try {
        const storagePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('submissions').upload(storagePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(storagePath);
        const { error: dbError } = await supabase.from('submissions').insert([{
            title: title, artist: artist, beststart: bestStart, fileurl: urlData.publicUrl, 
            storagepath: storagePath, upvotes: 0, downvotes: 0, createdat: new Date().toISOString()
        }]);
        if (dbError) throw dbError;

        alert("Track successfully transmitted!");
        document.getElementById('upload-form').reset(); window.switchTab('home');
    } catch (error) { alert("Transmission failed."); } 
    finally { btn.innerText = "SUBMIT"; btn.disabled = false; }
};

window.resetSubmissions = async () => {
    if(confirm("DANGER: Wiping ALL data from Database and Storage. Continue?")) {
        for (const sub of window.submissions) { await deleteTrackCompletely(sub); }
        alert("Database formatted.");
    }
};

window.purgeBeforeDate = async () => {
    const dateInput = document.getElementById('purge-date').value;
    if (!dateInput) return alert("Select a date.");
    const cutoff = new Date(dateInput); 
    let count = 0;
    for (const sub of window.submissions) {
        if (new Date(sub.createdat) < cutoff) { await deleteTrackCompletely(sub); count++; }
    }
    alert(`Purged ${count} archived submissions.`);
};

async function deleteTrackCompletely(sub) {
    try {
        if (sub.storagepath) await supabase.storage.from('submissions').remove([sub.storagepath]);
        await supabase.from('submissions').delete().eq('id', sub.id);
    } catch (error) {}
}
