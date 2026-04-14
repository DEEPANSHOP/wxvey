import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// CLEAN STATIC/TWINKLING STARS ENGINE
// ==========================================
const canvas = document.getElementById('star-canvas');
const ctx = canvas.getContext('2d', { alpha: true });
let width, height;

function resizeCanvas() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const stars = [];
for (let i = 0; i < 250; i++) { 
    stars.push({ 
        x: Math.random() * width, 
        y: Math.random() * height, 
        radius: Math.random() * 1.2 + 0.3, 
        alpha: Math.random(), 
        twinkleSpeed: (Math.random() * 0.01) + 0.005 
    });
}

function animateStars() {
    ctx.clearRect(0, 0, width, height); 
    stars.forEach(star => {
        star.alpha += star.twinkleSpeed;
        if (star.alpha <= 0.1 || star.alpha >= 1) { 
            star.twinkleSpeed *= -1; 
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
    });
    requestAnimationFrame(animateStars);
}
animateStars();

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
// LIVE CHAT LOGIC
// ==========================================
let chatUsername = getCookie("chat_username");

window.toggleChat = () => {
    document.getElementById('chat-panel').classList.toggle('open');
};

async function fetchChat() {
    const chatBox = document.getElementById('chat-messages');
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: true });

    if (error) return console.error(error);
    
    chatBox.innerHTML = '';
    if(!data || data.length === 0) {
        chatBox.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 50%;">> NO MESSAGES YET.</p>';
        return;
    }

    data.forEach(msg => {
        chatBox.innerHTML += `
            <div class="chat-msg">
                <span class="user">${msg.user}</span>
                <span class="text">${msg.text}</span>
            </div>
        `;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Subscribe to chat updates
supabase.channel('public:chat_messages')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
     fetchChat();
  })
  .subscribe();

// Initial load
fetchChat();

window.sendChatMessage = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value;
    
    if(!text.trim()) return;

    if(!chatUsername) {
        chatUsername = prompt("Enter a display name for the chat:");
        if(!chatUsername || chatUsername.trim() === "") {
            chatUsername = null; 
            return;
        }
        setCookie("chat_username", chatUsername, 365); 
    }
    
    input.value = ''; 
    
    // SAFE OPTIMISTIC UI UPDATE
    const chatBox = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';
    msgDiv.style.opacity = '0.6';
    msgDiv.innerHTML = `<span class="user">${chatUsername}</span><span class="text">${text}</span>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Send to DB (Removed explicit timestamp to let Postgres handle it safely)
    const { error } = await supabase
        .from('chat_messages')
        .insert([{ user: chatUsername, text: text }]);
        
    if (error) {
        console.error("Chat send failed", error);
        alert("Failed to send message. Please ensure RLS is disabled in Supabase.");
        msgDiv.remove(); // Revert if failed
    } else {
        msgDiv.style.opacity = '1';
    }
};

// ==========================================
// AUTH & UI LOGIC
// ==========================================
const VALID_PASSWORD_HASH = "8a252b4421b585bfcd26c710c5ab52a1291845bb0cb3bc19468cd32eb24c7f1a"; // Pass: inertia2026
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
        window.isAdminLoggedIn = true;
        window.switchTab('admin');
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
// WAVESURFER & AUDIO TIMERS
// ==========================================
const formatTime = (seconds) => {
    const min = Math.floor((seconds || 0) / 60);
    const sec = Math.floor((seconds || 0) % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

document.addEventListener("DOMContentLoaded", () => {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'rgba(255, 255, 255, 0.1)',
        progressColor: '#b026ff',
        cursorColor: 'transparent',
        barWidth: 3, barGap: 3, barRadius: 3, height: 70, normalize: true,
    });

    wavesurfer.on('play', () => { document.getElementById('icon-play').style.display = 'none'; document.getElementById('icon-pause').style.display = 'block'; });
    wavesurfer.on('pause', () => { document.getElementById('icon-play').style.display = 'block'; document.getElementById('icon-pause').style.display = 'none'; });
    wavesurfer.on('finish', () => window.nextTrack());

    wavesurfer.on('timeupdate', (currentTime) => {
        document.getElementById('time-current').innerText = formatTime(currentTime);
    });

    wavesurfer.on('ready', () => {
        document.getElementById('time-total').innerText = formatTime(wavesurfer.getDuration());
        document.getElementById('time-current').innerText = formatTime(0);
    });
});

// ==========================================
// SUPABASE SUBMISSION LISTENER
// ==========================================
async function fetchSubmissionsData() {
    const { data, error } = await supabase.from('submissions').select('*');
    if (error) return console.error(error);
    window.submissions = data || [];
    renderSubmissions();
}

supabase.channel('public:submissions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
     fetchSubmissionsData();
  })
  .subscribe();

fetchSubmissionsData();

function renderSubmissions() {
    const listContainer = document.getElementById('submission-list');
    listContainer.innerHTML = '';
    
    if(window.submissions.length === 0) { listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-family: Orbitron;">> QUEUE EMPTY</p>'; return; }

    let votedTracks = JSON.parse(localStorage.getItem('voted_tracks')) || {};

    let sorted = [...window.submissions].sort((a, b) => {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        return netB - netA;
    });

    sorted.forEach((sub, index) => {
        const userVote = votedTracks[sub.id]; // 'up' or 'down'
        
        const item = document.createElement('div');
        item.className = 'glass-panel box-shape submission-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;" onclick="loadSong('${sub.id}')">
                <span style="color: var(--accent-purple); font-family: 'Orbitron'; font-size: 1.2rem; font-weight: 700;">${index + 1}</span>
                <div>
                    <div style="font-weight: 600; font-size: 1rem; font-family: 'Orbitron'; text-transform: uppercase;">${sub.title}</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem;">${sub.artist}</div>
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
// PLAYER CONTROLS
// ==========================================
window.loadSong = (id) => {
    window.currentTrack = window.submissions.find(s => s.id === id);
    if(!window.currentTrack) return;
    
    document.getElementById('ui-title').innerText = window.currentTrack.title;
    document.getElementById('ui-artist').innerText = window.currentTrack.artist;
    wavesurfer.load(window.currentTrack.fileurl);
    clearTimeout(window.bestPartTimeout);
};

window.togglePlay = () => { 
    if(!window.currentTrack) return alert("Select a track first.");
    clearTimeout(window.bestPartTimeout); 
    wavesurfer.playPause(); 
};

window.forward5 = () => wavesurfer.skip(5);
window.rewind5 = () => wavesurfer.skip(-5);

window.playBestPart = () => {
    if (!window.currentTrack) return alert("Select a track first.");
    if (!wavesurfer.getDuration()) return;

    clearTimeout(window.bestPartTimeout);
    wavesurfer.setTime(window.currentTrack.beststart);
    wavesurfer.play();

    window.bestPartTimeout = setTimeout(() => { wavesurfer.pause(); }, 20000);
};

window.nextTrack = () => {
    if(!window.currentTrack || window.submissions.length === 0) return;
    let sorted = [...window.submissions].sort((a, b) => {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        return netB - netA;
    });
    let currentIndex = sorted.findIndex(s => s.id === window.currentTrack.id);
    let nextIndex = (currentIndex + 1) % sorted.length;
    window.loadSong(sorted[nextIndex].id);
    wavesurfer.once('ready', () => wavesurfer.play());
};

window.prevTrack = () => {
    if(!window.currentTrack || window.submissions.length === 0) return;
    if (wavesurfer.getCurrentTime() > 3) { wavesurfer.setTime(0); return; }
    let sorted = [...window.submissions].sort((a, b) => {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        return netB - netA;
    });
    let currentIndex = sorted.findIndex(s => s.id === window.currentTrack.id);
    let prevIndex = (currentIndex - 1 + sorted.length) % sorted.length;
    window.loadSong(sorted[prevIndex].id);
    wavesurfer.once('ready', () => wavesurfer.play());
};

// ==========================================
// SUPABASE UPLOAD LOGIC
// ==========================================
window.handleUpload = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    const originalText = btn.innerText;

    const title = document.getElementById('track-title').value;
    const artist = document.getElementById('track-artist').value;
    const bestStart = parseInt(document.getElementById('track-best-start').value);
    const file = document.getElementById('track-file').files[0];

    const validTypes = ['audio/mpeg', 'audio/flac', 'audio/x-flac'];
    const fileName = file.name.toLowerCase();
    if (!validTypes.includes(file.type) && !fileName.endsWith('.mp3') && !fileName.endsWith('.flac')) {
        alert("Invalid file format. Please upload an .mp3 or .flac file only.");
        return;
    }

    btn.innerText = "TRANSMITTING...";
    btn.disabled = true;

    try {
        const storagePath = `${Date.now()}_${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(storagePath, file);
            
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('submissions')
            .getPublicUrl(storagePath);

        const { error: dbError } = await supabase
            .from('submissions')
            .insert([{
                title: title, 
                artist: artist, 
                beststart: bestStart, 
                fileurl: urlData.publicUrl, 
                storagepath: storagePath, 
                upvotes: 0, 
                downvotes: 0,
                createdat: new Date().toISOString()
            }]);
            
        if (dbError) throw dbError;

        alert("Track successfully transmitted!");
        document.getElementById('upload-form').reset();
        window.switchTab('home');
        
    } catch (error) { 
        console.error("Upload error:", error); 
        alert("Transmission failed. See console."); 
    } finally { 
        btn.innerText = originalText; 
        btn.disabled = false; 
    }
};

// ==========================================
// VOTE SWITCHING LOGIC & INSTANT UI
// ==========================================
window.vote = async (id, type) => {
    const sub = window.submissions.find(s => s.id === id);
    if (!sub) return;

    let votedTracks = JSON.parse(localStorage.getItem('voted_tracks')) || {};
    let previousVote = votedTracks[id];

    // If they click the exact same arrow again, do nothing
    if (previousVote === type) return;

    // Mathematical adjustments
    let newUp = sub.upvotes || 0;
    let newDown = sub.downvotes || 0;

    if (type === 'up') {
        newUp += 1;
        if (previousVote === 'down') newDown = Math.max(0, newDown - 1);
    } else {
        newDown += 1;
        if (previousVote === 'up') newUp = Math.max(0, newUp - 1);
    }

    // 1. Instant Optimistic UI Update
    sub.upvotes = newUp;
    sub.downvotes = newDown;
    votedTracks[id] = type;
    localStorage.setItem('voted_tracks', JSON.stringify(votedTracks));
    renderSubmissions(); // Instantly update HTML colors and numbers

    // 2. Background Database Update
    await supabase.from('submissions')
        .update({ upvotes: newUp, downvotes: newDown })
        .eq('id', id);
};

// ==========================================
// SUPABASE ADMIN DELETION LOGIC
// ==========================================
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
        if (new Date(sub.createdat) < cutoff) { 
            await deleteTrackCompletely(sub); 
            count++; 
        }
    }
    alert(`Purged ${count} archived submissions.`);
};

async function deleteTrackCompletely(sub) {
    try {
        if (sub.storagepath) {
            await supabase.storage.from('submissions').remove([sub.storagepath]);
        }
        await supabase.from('submissions').delete().eq('id', sub.id);
    } catch (error) { 
        console.error("Failed deletion:", error); 
    }
}
