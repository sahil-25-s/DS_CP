const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const musicMetadata = require('music-metadata');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'playlists.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const STATS_FILE = path.join(__dirname, 'stats.json');

// HashMap for fast search - O(1) lookup
let searchIndex = new Map();

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
            cb(null, true);
        } else {
            cb(new Error('Only MP3 files allowed'));
        }
    }
});

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

function loadPlaylists() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading playlists:', err);
    }
    return {
        playlists: [{ id: 'main', name: 'My Playlist', songs: [] }],
        currentPlaylist: 'main'
    };
}

function savePlaylists(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        buildSearchIndex(data);
        return true;
    } catch (err) {
        console.error('Error saving playlists:', err);
        return false;
    }
}

function buildSearchIndex(data) {
    searchIndex.clear();
    data.playlists.forEach(playlist => {
        playlist.songs.forEach((song, index) => {
            const words = [...song.title.toLowerCase().split(/\s+/), ...song.artist.toLowerCase().split(/\s+/)];
            words.forEach(word => {
                if (word.length > 0) {
                    if (!searchIndex.has(word)) {
                        searchIndex.set(word, []);
                    }
                    searchIndex.get(word).push({ song, playlistId: playlist.id, playlistName: playlist.name, index });
                }
            });
        });
    });
}

function loadStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
    return { playCount: {}, recentlyPlayed: [] };
}

function saveStats(stats) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error('Error saving stats:', err);
    }
}

app.get('/api/playlists', (req, res) => {
    res.json(loadPlaylists());
});

app.get('/api/songs/:playlistId?', (req, res) => {
    const data = loadPlaylists();
    const playlistId = req.params.playlistId || data.currentPlaylist;
    
    if (playlistId === 'most-played') {
        const stats = loadStats();
        const allSongs = data.playlists.flatMap(p => p.songs.map(s => ({...s, playlistId: p.id})));
        const sortedSongs = allSongs
            .map(song => ({...song, plays: stats.playCount[song.filename] || 0}))
            .filter(song => song.plays > 0)
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 50);
        return res.json(sortedSongs);
    }
    
    if (playlistId === 'recently-played') {
        const stats = loadStats();
        const allSongs = data.playlists.flatMap(p => p.songs.map(s => ({...s, playlistId: p.id})));
        const recentSongs = stats.recentlyPlayed
            .map(filename => allSongs.find(s => s.filename === filename))
            .filter(s => s);
        return res.json(recentSongs);
    }
    
    const playlist = data.playlists.find(p => p.id === playlistId);
    res.json(playlist ? playlist.songs : []);
});

app.post('/api/play/:filename', (req, res) => {
    const stats = loadStats();
    const filename = req.params.filename;
    
    stats.playCount[filename] = (stats.playCount[filename] || 0) + 1;
    
    stats.recentlyPlayed = stats.recentlyPlayed.filter(f => f !== filename);
    stats.recentlyPlayed.unshift(filename);
    stats.recentlyPlayed = stats.recentlyPlayed.slice(0, 50);
    
    saveStats(stats);
    console.log(`Play tracked: ${filename}, Total plays: ${stats.playCount[filename]}`);
    res.json({ success: true, plays: stats.playCount[filename] });
});

app.get('/api/stats/:filename', (req, res) => {
    const stats = loadStats();
    const filename = req.params.filename;
    res.json({ plays: stats.playCount[filename] || 0 });
});

app.post('/api/playlists', (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.json({ success: false, message: 'Playlist name required' });
        }
        
        const data = loadPlaylists();
        const id = Date.now().toString();
        const newPlaylist = { id, name, songs: [] };
        
        data.playlists.push(newPlaylist);
        savePlaylists(data);
        
        res.json({ success: true, playlist: newPlaylist });
    } catch (error) {
        res.json({ success: false, message: 'Error creating playlist' });
    }
});

app.delete('/api/playlists/:id', (req, res) => {
    try {
        const data = loadPlaylists();
        const index = data.playlists.findIndex(p => p.id === req.params.id);
        
        if (index === -1) {
            return res.json({ success: false, message: 'Playlist not found' });
        }
        
        data.playlists.splice(index, 1);
        if (data.currentPlaylist === req.params.id) {
            data.currentPlaylist = data.playlists[0]?.id || 'main';
        }
        
        savePlaylists(data);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Error deleting playlist' });
    }
});

app.put('/api/current-playlist/:id', (req, res) => {
    try {
        const data = loadPlaylists();
        data.currentPlaylist = req.params.id;
        savePlaylists(data);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Error switching playlist' });
    }
});

app.post('/api/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'No file uploaded' });
        }

        const filePath = path.join(UPLOAD_DIR, req.file.filename);
        const metadata = await musicMetadata.parseFile(filePath);
        
        const song = {
            title: metadata.common.title || req.file.originalname.replace('.mp3', ''),
            artist: metadata.common.artist || 'Unknown Artist',
            filename: req.file.filename,
            duration: metadata.format.duration ? formatDuration(metadata.format.duration) : '0:00'
        };

        const data = loadPlaylists();
        const playlistId = req.body.playlistId || data.currentPlaylist;
        const playlist = data.playlists.find(p => p.id === playlistId);
        
        if (!playlist) {
            return res.json({ success: false, message: 'Playlist not found' });
        }
        
        const position = parseInt(req.body.position);
        if (position && position > 0 && position <= playlist.songs.length + 1) {
            playlist.songs.splice(position - 1, 0, song);
        } else {
            playlist.songs.push(song);
        }
        
        savePlaylists(data);
        res.json({ success: true, message: 'Song uploaded', song });
    } catch (error) {
        console.error('Upload error:', error);
        res.json({ success: false, message: 'Error processing file' });
    }
});

app.delete('/api/songs/:playlistId/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const data = loadPlaylists();
        const playlist = data.playlists.find(p => p.id === req.params.playlistId);
        
        if (!playlist || index < 0 || index >= playlist.songs.length) {
            return res.json({ success: false, message: 'Invalid playlist or index' });
        }
        
        const song = playlist.songs[index];
        
        if (song.filename) {
            const filePath = path.join(UPLOAD_DIR, song.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        playlist.songs.splice(index, 1);
        savePlaylists(data);
        
        res.json({ success: true, message: 'Song deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.json({ success: false, message: 'Error deleting song' });
    }
});

app.get('/api/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    
    if (!query) {
        return res.json([]);
    }
    
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    const resultMap = new Map();
    
    queryWords.forEach(word => {
        for (const [key, songs] of searchIndex) {
            if (key.includes(word)) {
                songs.forEach(item => {
                    const uniqueKey = `${item.playlistId}-${item.song.filename}`;
                    if (!resultMap.has(uniqueKey)) {
                        resultMap.set(uniqueKey, item.song);
                    }
                });
            }
        }
    });
    
    res.json(Array.from(resultMap.values()));
});

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

app.post('/api/songs/insert', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'No file uploaded' });
        }

        const filePath = path.join(UPLOAD_DIR, req.file.filename);
        const metadata = await musicMetadata.parseFile(filePath);
        const position = parseInt(req.body.position);
        
        const song = {
            title: metadata.common.title || req.file.originalname.replace('.mp3', ''),
            artist: metadata.common.artist || 'Unknown Artist',
            filename: req.file.filename,
            duration: metadata.format.duration ? formatDuration(metadata.format.duration) : '0:00'
        };

        const playlist = loadPlaylist();
        
        if (position && position > 0 && position <= playlist.length + 1) {
            playlist.splice(position - 1, 0, song);
            res.json({ success: true, message: `Song inserted at position ${position}`, song });
        } else {
            return res.json({ success: false, message: 'Invalid position' });
        }
        
        savePlaylist(playlist);
    } catch (error) {
        console.error('Insert error:', error);
        res.json({ success: false, message: 'Error inserting song' });
    }
});

app.listen(PORT, () => {
    console.log(`🎵 MusicFlow running on http://localhost:${PORT}`);
    buildSearchIndex(loadPlaylists());
});
