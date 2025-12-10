let currentIndex = -1;
let playlist = [];
let playlists = [];
let currentPlaylistId = 'main';
const audioPlayer = document.getElementById('audioPlayer');
let isPlaying = false;

window.onload = () => {
    loadPlaylists();
    setupAudioPlayer();
    setupFileUpload();
    setupKeyboardShortcuts();
};

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            showSection('search');
            document.getElementById('searchInput').focus();
        }
        // Space for play/pause (when not typing)
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlayPause();
        }
    });
}

function setupAudioPlayer() {
    audioPlayer.volume = 0.7;
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNext);
    
    document.getElementById('progressBar').addEventListener('input', (e) => {
        const time = (e.target.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = time;
    });
    
    document.getElementById('volumeBar').addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value / 100;
    });
}

function setupFileUpload() {
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('playlistId', currentPlaylistId);
    
    const usePosition = document.getElementById('usePosition').checked;
    const position = document.getElementById('positionInput').value;
    
    if (usePosition && position) {
        formData.append('position', position);
    }
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            showMessage('Song uploaded successfully!', 'success');
            loadPlaylist();
            closeUploadModal();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Error uploading file', 'error');
    }
    
    event.target.value = '';
}

async function loadPlaylists() {
    try {
        const response = await fetch('/api/playlists');
        const data = await response.json();
        playlists = data.playlists;
        currentPlaylistId = data.currentPlaylist;
        loadPlaylist();
        displayPlaylists();
    } catch (error) {
        showMessage('Error loading playlists', 'error');
    }
}

async function loadPlaylist() {
    try {
        const response = await fetch(`/api/songs/${currentPlaylistId}`);
        playlist = await response.json();
        displayPlaylist();
        displayLibrary();
        updateCurrentPlaylistName();
    } catch (error) {
        showMessage('Error loading playlist', 'error');
    }
}

function updateCurrentPlaylistName() {
    const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);
    document.getElementById('currentPlaylistName').textContent = currentPlaylist?.name || 'My Playlist';
}

function displayPlaylists() {
    const playlistsDiv = document.getElementById('playlistsList');
    playlistsDiv.innerHTML = playlists.map(p => `
        <div class="playlist-item ${p.id === currentPlaylistId ? 'active' : ''}" onclick="switchPlaylist('${p.id}')">
            <i class="fas fa-music"></i>
            <span>${p.name}</span>
            ${p.id !== 'main' ? `<button class="btn-delete-playlist" onclick="event.stopPropagation(); deletePlaylist('${p.id}')"><i class="fas fa-times"></i></button>` : ''}
        </div>
    `).join('');
}

function displayPlaylist() {
    const playlistDiv = document.getElementById('playlist');
    const songCount = document.getElementById('songCount');
    
    songCount.textContent = playlist.length;
    
    if (playlist.length === 0) {
        playlistDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <p>No songs in your playlist</p>
                <small>Upload MP3 files to get started</small>
            </div>
        `;
        return;
    }
    
    playlistDiv.innerHTML = playlist.map((song, index) => `
        <div class="song-row ${currentIndex === index ? 'playing' : ''}" onclick="playSongAtIndex(${index})">
            <div class="song-index">
                <span class="song-num">${index + 1}</span>
                <i class="fas fa-play song-play-icon"></i>
            </div>
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
            <div class="song-duration">${song.duration || '0:00'}</div>
            <div class="song-actions">
                <button class="btn-delete" onclick="event.stopPropagation(); deleteSong(${index})" title="Delete song">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function displayLibrary() {
    const libraryDiv = document.getElementById('libraryContent');
    const librarySongCount = document.getElementById('librarySongCount');
    
    librarySongCount.textContent = playlist.length;
    
    if (playlist.length === 0) {
        libraryDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Your library is empty</p>
                <small>Upload songs to build your collection</small>
            </div>
        `;
        return;
    }
    
    libraryDiv.innerHTML = `
        <div class="table-header">
            <div class="th-number">#</div>
            <div class="th-title">Title</div>
            <div class="th-artist">Artist</div>
            <div class="th-duration"><i class="far fa-clock"></i></div>
            <div class="th-actions"></div>
        </div>
        <div class="table-body">
            ${playlist.map((song, index) => `
                <div class="song-row ${currentIndex === index ? 'playing' : ''}" onclick="playSongAtIndex(${index})">
                    <div class="song-index">
                        <span class="song-num">${index + 1}</span>
                        <i class="fas fa-play song-play-icon"></i>
                    </div>
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                    <div class="song-duration">${song.duration || '0:00'}</div>
                    <div class="song-actions">
                        <button class="btn-delete" onclick="event.stopPropagation(); deleteSong(${index})" title="Delete song">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function searchSongs() {
    const query = document.getElementById('searchInput').value;
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query.trim()) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Search for your favorite songs</p>
                <small>Type song title or artist name</small>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${query}"</p>
                    <small>Try different keywords</small>
                </div>
            `;
            return;
        }
        
        resultsDiv.innerHTML = `
            <div class="search-header">
                <h3>Search Results (${results.length})</h3>
            </div>
            <div class="table-header">
                <div class="th-number">#</div>
                <div class="th-title">Title</div>
                <div class="th-artist">Artist</div>
                <div class="th-duration"><i class="far fa-clock"></i></div>
                <div class="th-actions"></div>
            </div>
            <div class="table-body">
                ${results.map((song, index) => {
                    const actualIndex = playlist.findIndex(s => s.filename === song.filename);
                    return `
                        <div class="song-row ${currentIndex === actualIndex ? 'playing' : ''}" onclick="playSongAtIndex(${actualIndex})">
                            <div class="song-index">
                                <span class="song-num">${index + 1}</span>
                                <i class="fas fa-play song-play-icon"></i>
                            </div>
                            <div class="song-title">${song.title}</div>
                            <div class="song-artist">${song.artist}</div>
                            <div class="song-duration">${song.duration || '0:00'}</div>
                            <div class="song-actions">
                                <button class="btn-delete" onclick="event.stopPropagation(); deleteSong(${actualIndex})" title="Delete song">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        showMessage('Error searching songs', 'error');
    }
}

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    if (section === 'home') {
        document.getElementById('homeSection').classList.add('active');
        document.querySelector('.nav-link[onclick*="home"]').classList.add('active');
    } else if (section === 'search') {
        document.getElementById('searchSection').classList.add('active');
        document.querySelector('.nav-link[onclick*="search"]').classList.add('active');
    } else if (section === 'library') {
        document.getElementById('librarySection').classList.add('active');
        document.querySelector('.nav-link[onclick*="library"]').classList.add('active');
        displayLibrary();
    } else if (section === 'stats') {
        document.getElementById('statsSection').classList.add('active');
        document.querySelector('.nav-link[onclick*="stats"]').classList.add('active');
    } else if (section === 'most-played') {
        document.getElementById('mostPlayedSection').classList.add('active');
        loadMostPlayed();
    } else if (section === 'recently-played') {
        document.getElementById('recentlyPlayedSection').classList.add('active');
        loadRecentlyPlayed();
    }
}

async function loadMostPlayed() {
    try {
        const response = await fetch('/api/songs/most-played');
        const songs = await response.json();
        const contentDiv = document.getElementById('mostPlayedContent');
        
        console.log('Most played songs:', songs);
        
        if (songs.length === 0) {
            contentDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <p>No play history yet</p>
                    <small>Start listening to see your most played songs</small>
                </div>
            `;
            return;
        }
        
        contentDiv.innerHTML = `
            <div class="table-header">
                <div class="th-number">#</div>
                <div class="th-title">Title</div>
                <div class="th-artist">Artist</div>
                <div class="th-duration">Plays</div>
                <div class="th-actions"></div>
            </div>
            <div class="table-body">
                ${songs.map((song, index) => `
                    <div class="song-row" onclick="playSongFromStats('${song.filename}')">
                        <div class="song-index">
                            <span class="song-num">${index + 1}</span>
                            <i class="fas fa-play song-play-icon"></i>
                        </div>
                        <div class="song-title">${song.title}</div>
                        <div class="song-artist">${song.artist}</div>
                        <div class="song-duration">
                            <i class="fas fa-play-circle"></i> ${song.plays}
                        </div>
                        <div class="song-actions"></div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading most played:', error);
        showMessage('Error loading most played', 'error');
    }
}

async function loadRecentlyPlayed() {
    try {
        const response = await fetch('/api/songs/recently-played');
        const songs = await response.json();
        const contentDiv = document.getElementById('recentlyPlayedContent');
        
        console.log('Recently played songs:', songs);
        
        if (songs.length === 0) {
            contentDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No listening history</p>
                    <small>Songs you play will appear here</small>
                </div>
            `;
            return;
        }
        
        contentDiv.innerHTML = `
            <div class="table-header">
                <div class="th-number">#</div>
                <div class="th-title">Title</div>
                <div class="th-artist">Artist</div>
                <div class="th-duration"><i class="far fa-clock"></i></div>
                <div class="th-actions"></div>
            </div>
            <div class="table-body">
                ${songs.map((song, index) => `
                    <div class="song-row" onclick="playSongFromStats('${song.filename}')">
                        <div class="song-index">
                            <span class="song-num">${index + 1}</span>
                            <i class="fas fa-play song-play-icon"></i>
                        </div>
                        <div class="song-title">${song.title}</div>
                        <div class="song-artist">${song.artist}</div>
                        <div class="song-duration">${song.duration || '0:00'}</div>
                        <div class="song-actions"></div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading recently played:', error);
        showMessage('Error loading recently played', 'error');
    }
}

async function playSongFromStats(filename) {
    const data = await fetch('/api/playlists').then(r => r.json());
    let foundSong = null;
    let foundPlaylistId = null;
    
    for (const p of data.playlists) {
        const songIndex = p.songs.findIndex(s => s.filename === filename);
        if (songIndex !== -1) {
            foundSong = p.songs[songIndex];
            foundPlaylistId = p.id;
            break;
        }
    }
    
    if (foundSong && foundPlaylistId) {
        if (currentPlaylistId !== foundPlaylistId) {
            await switchPlaylist(foundPlaylistId);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const index = playlist.findIndex(s => s.filename === filename);
        if (index !== -1) {
            playSongAtIndex(index);
        }
    } else {
        showMessage('Song not found', 'error');
    }
}

function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'flex';
    const positionInput = document.getElementById('positionInput');
    positionInput.placeholder = `Position (1-${playlist.length + 1})`;
    positionInput.max = playlist.length + 1;
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('usePosition').checked = false;
    document.getElementById('positionInput').value = '';
    document.getElementById('positionInput').disabled = true;
}

function togglePositionInput() {
    const checkbox = document.getElementById('usePosition');
    const input = document.getElementById('positionInput');
    input.disabled = !checkbox.checked;
    if (checkbox.checked) {
        input.focus();
    }
}

async function playSongAtIndex(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    audioPlayer.src = `/uploads/${song.filename}`;
    audioPlayer.play();
    isPlaying = true;
    
    document.getElementById('currentTitle').textContent = song.title;
    document.getElementById('currentArtist').textContent = song.artist;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    try {
        await fetch(`/api/play/${song.filename}`, { method: 'POST' });
        console.log('Play tracked:', song.filename);
    } catch (error) {
        console.error('Error tracking play:', error);
    }
    
    displayPlaylist();
    displayLibrary();
}

function togglePlayPause() {
    if (playlist.length === 0) {
        showMessage('No songs in playlist', 'error');
        return;
    }
    
    if (currentIndex === -1) {
        playSongAtIndex(0);
        return;
    }
    
    if (isPlaying) {
        audioPlayer.pause();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    } else {
        audioPlayer.play();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        isPlaying = true;
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        playSongAtIndex(currentIndex + 1);
    } else {
        showMessage('End of playlist', 'error');
    }
}

function playPrevious() {
    if (currentIndex > 0) {
        playSongAtIndex(currentIndex - 1);
    } else {
        showMessage('Already at first song', 'error');
    }
}

function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        document.getElementById('progressBar').value = progress;
        
        document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
        document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function toggleMute() {
    audioPlayer.muted = !audioPlayer.muted;
    const icon = document.querySelector('.player-volume .btn-control i');
    icon.className = audioPlayer.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
}

async function deleteSong(index) {
    if (!confirm('Delete this song?')) return;
    
    try {
        const response = await fetch(`/api/songs/${currentPlaylistId}/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showMessage('Song deleted successfully', 'success');
            if (currentIndex === index) {
                audioPlayer.pause();
                currentIndex = -1;
                document.getElementById('currentTitle').textContent = 'Select a song';
                document.getElementById('currentArtist').textContent = '-';
                document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
                isPlaying = false;
            } else if (currentIndex > index) {
                currentIndex--;
            }
            loadPlaylist();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Error deleting song', 'error');
    }
}

async function switchPlaylist(playlistId) {
    try {
        const response = await fetch(`/api/current-playlist/${playlistId}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            currentPlaylistId = playlistId;
            currentIndex = -1;
            audioPlayer.pause();
            document.getElementById('currentTitle').textContent = 'Select a song';
            document.getElementById('currentArtist').textContent = '-';
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
            loadPlaylist();
            displayPlaylists();
        }
    } catch (error) {
        showMessage('Error switching playlist', 'error');
    }
}

async function createPlaylist() {
    const name = prompt('Enter playlist name:');
    if (!name) return;
    
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        const result = await response.json();
        if (result.success) {
            showMessage('Playlist created!', 'success');
            loadPlaylists();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Error creating playlist', 'error');
    }
}

async function deletePlaylist(playlistId) {
    if (!confirm('Delete this playlist?')) return;
    
    try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showMessage('Playlist deleted', 'success');
            loadPlaylists();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Error deleting playlist', 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `alert ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'alert';
    }, 3000);
}
