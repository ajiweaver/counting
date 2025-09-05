// Storage Management
// Handle localStorage operations for player data and room information

// Storage keys for localStorage
const STORAGE_KEYS = {
    ROOM_ID: 'countbattle_room_id',
    PLAYER_NAME: 'countbattle_player_name',
    PLAYER_UUID: 'countbattle_player_uuid', // Unique identifier for host persistence
    TIME_PER_BOARD: 'countbattle_time_per_board',
    TOTAL_BOARDS: 'countbattle_total_boards',
    HARD_MODE: 'countbattle_hard_mode',
    SCORING_MODE: 'countbattle_scoring_mode'
};

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

function getPlayerUUID() {
    let uuid = loadFromStorage(STORAGE_KEYS.PLAYER_UUID, null);
    if (!uuid) {
        // Generate a simple UUID (good enough for our purposes)
        uuid = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        saveToStorage(STORAGE_KEYS.PLAYER_UUID, uuid);
        console.log('Generated new player UUID:', uuid);
    }
    return uuid;
}

function clearRoomStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ROOM_ID);
        console.log('Cleared room storage');
    } catch (error) {
        console.warn('Failed to clear room storage:', error);
    }
}

// Export functions for global access
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.getPlayerUUID = getPlayerUUID;
window.clearRoomStorage = clearRoomStorage;
window.STORAGE_KEYS = STORAGE_KEYS;