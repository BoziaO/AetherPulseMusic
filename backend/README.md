# AetherPulse Music Backend

Python backend based on FastAPI and `ytmusicapi`.

## Requirements
- Python 3.10+
- pip

## Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python main.py
   ```
   The server will start on `http://localhost:3001`.

## Endpoints
- `GET /api/ytmusic/search?q=QUERY` - Search for music
- `GET /api/ytmusic/song/VIDEO_ID` - Get song details
- `GET /api/ytmusic/album/ALBUM_ID` - Get album details
- `GET /api/ytmusic/artist/ARTIST_ID` - Get artist details
- `GET /api/ytmusic/playlist/PLAYLIST_ID` - Get playlist details
- `GET /api/lyrics?videoId=VIDEO_ID` - Get song lyrics
- `GET /api/page/home` - Get home page content
- `GET /api/downloads/info/VIDEO_ID` - Get download info (metadata + stream URL)
- `GET /api/downloads/playback/VIDEO_ID` - Download/Stream audio file
