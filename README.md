# MusicFlow 🎵

A Spotify-inspired music player web application with real MP3 playback and file management.

## Features
- 🎵 Upload and play MP3 files
- ⏯️ Full audio controls (play, pause, next, previous)
- 🎚️ Volume control and progress bar
- 🗑️ Delete songs from playlist
- 💾 Persistent storage (JSON + file system)
- 🎨 Modern Spotify-like dark UI
- 📊 Automatic metadata extraction (title, artist, duration)

## Setup Instructions

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser:
```
http://localhost:3000
```

4. Upload MP3 files using the "Upload MP3" button in the sidebar

## Technologies Used
- **Backend**: Node.js + Express
- **File Upload**: Multer
- **Metadata**: music-metadata
- **Frontend**: HTML5, CSS3, JavaScript
- **Audio**: HTML5 Audio API
- **Storage**: File-based (JSON + uploads folder)

## How to Use
1. Click "Upload MP3" to add songs
2. Click any song to play it
3. Use player controls at the bottom
4. Delete songs you don't want anymore

Enjoy your music! 🎧
