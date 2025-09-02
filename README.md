# Counting Battle! 🏆

A real-time multiplayer Go territory counting game where players compete to correctly identify which side controls more territory in various Go positions.

**🎮 [Play Now at count.ajiweaver.com](https://count.ajiweaver.com)**

## 🎮 Game Overview

Counting Battle! is based on [Anton Tobi's Count!](https://count.antontobi.com/) but adds multiplayer functionality with rooms, a real-time leaderboard,
room history, and a hard mode where you can train exact counting.

### How to Play
1. **Create a room**
1. **Set game options** inside the room, only the host can change these settings.
2. **Choose difficulty**: In normal mode you only have to choose which color wins, while hard mode 
3. **Invite friends** by sharing the room link - click the 🔗 button to copy the direct join link.
4. **Play!** 

*Notes:*
- If your timer runs out, you lose.
- If you answer correctly all boards before anybody else, you win.
- 1 correct answer is 1 point
- Every time you make a mistake, you will be forced to wait for 1 second.
- If you resign, the game will continue while there's at least 1 more player playing.
- If you open the "Leaderboard" dialog while playing, you can see everyone's scores changing in real time.

## 🚀 Features

- **Real-time multiplayer** with Socket.IO
- **Two game modes**: Normal (Black/White winner) and Hard (exact territory counting)
- **Customizable game settings** (timer, board count)
- **Live leaderboards** during gameplay with status icons (🎮 playing, ✅ finished)
- **Persistent room history** and total scores
- **Visual feedback** (green for correct, red for incorrect, gold for winners)
- **Trophy/medal system** for winners and ties (🏆 single winner, 🥇 ties)
- **Development mode indicators** (🔧 wrench icon for dev mode players)
- **Host controls** for game management
- **Mobile-responsive** design

## 🛠️ Technical Stack

- **Frontend**: Vanilla JavaScript, p5.js for game rendering
- **Territory Scoring**: lightvector/goscorer library for accurate scoring
- **Backend**: Node.js, Express, Socket.IO
- **Deployment**: Railway (server), Netlify (client)
- **Real-time Communication**: WebSocket connections via Socket.IO

## 📋 Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajiweaver/counting
   cd counting
   ```

2. **Install dependencies**
   ```bash
   npm run install-server
   ```

3. Serve the files
   ```bash
    # cd to repository's root
    python3 -m http.server 8000
    ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open the game**
   At `localhost:8000`


### Environment Configuration

The game auto-detects the environment:
- **Local**: Uses `http://localhost:3000` for the server, `http://localhost:8000` for the client
- **Production**: The client is deployed at `https://count.ajiweaver.com`

## 🎯 Game Mechanics

### Scoring Rules
- Each Go position shows equal stones for Black and White
- No komi, no prisoners, no sekis
- Area scoring and territory scoring give identical results
- **Normal Mode**: Just decide who won, black or white
- **Hard Mode**: Choose the winning color by clicking on the first stone on the bottom of the screen
and then choose by how much.

### Game Flow
1. **Lobby Phase**: Players join and wait for game start
2. **Playing Phase**: Real-time competition on the same board sequence
3. **Finished Phase**: Results shown with winner highlighting
4. **Auto-finish**: Game ends when first player completes all boards

### Controls
- **Mouse/Touch**: Click Black/White buttons
- **Keyboard**: Left/Right arrows (Black/White), Escape (resign)

## 🏗️ Project Structure

```
counting/
├── index.html          # Main game interface
├── about.html          # Game instructions
├── board-editor.html   # Visual board editor (localhost only)
├── multiplayer.js      # Client-side multiplayer logic
├── board-editor.js     # Board editor functionality
├── boards.js          # Normal mode Go board positions
├── boards_hard.js      # Hard mode Go board positions
├── deadstones.js       # Normal mode dead stone data
├── deadstones_hard.js  # Hard mode dead stone data
├── goscorer.js         # Go territory scoring library
├── name-generator.js   # Random player name generation
├── style.css          # Game styling
├── server/
│   ├── server.js      # Express + Socket.IO server
│   └── package.json   # Server dependencies
└── package.json       # Root package configuration
```

## 🔧 Development Features

When running on localhost, additional features become available:

### Visual Board Editor
- **Access**: Board Editor button appears on main menu (localhost only)
- **Features**: Visual stone placement, dead stone marking, territory scoring
- **Export**: Generate updated boards.js and deadstones.js files
- **Keyboard Shortcuts**: Navigation, tool selection, undo/redo support

### Development Mode
- **Toggle**: Development Mode checkbox (localhost only)
- **Features**: Shows correct answers during gameplay
- **Visual Indicator**: Players in dev mode get wrench icon 🔧 in UI

### Debug Console Functions
```javascript
// Mock data testing
showMockData()          // Enable mock data for testing
hideMockData()          // Disable mock data
setRealBoardId(1)       // Test with board id

// Data querying
queryLeaderboard()      // View all leaderboard data
debugLeaderboard()      // Debug leaderboard display
debugRoomHistory()      // Debug room history display

// Board testing
showMockBoards()        // View available test boards
setTestBoardId(0)       // Load specific board for testing
```

## 📊 Room Management

- **Persistent Rooms**: Rooms stay active until all players leave
- **Host Privileges**: Room creators can start games and return to lobby
- **Auto-reconnection**: Hosts automatically reconnect to their existing rooms
- **Room History**: Track all completed games with detailed results

## 🎨 Visual Design

- **Responsive UI** with mobile-first approach
- **Real-time feedback** with background color changes
- **Trophy system** with emoji indicators (🏆 for single winner, 🥇 for ties)
- **Status indicators** (🎮 playing, ✅ finished, 🔧 dev mode)
- **Smooth animations** for interactions and state changes
- **Tooltips** for enhanced user experience

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## 🙏 Acknowledgments

- Original concept by [Anton Tobi](https://count.antontobi.com/)
- Built with love for the Go/Weiqi/Baduk community

---

**Ready to battle?** Create a room and challenge your friends to see who's the best at counting territory! 🥊
