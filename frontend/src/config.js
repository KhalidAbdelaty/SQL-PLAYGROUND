// Frontend configuration
const config = {
    // API Configuration
    API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    WS_BASE_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
    
    // Editor Configuration
    EDITOR_THEME: 'vs-dark',
    EDITOR_FONT_SIZE: 14,
    EDITOR_LINE_HEIGHT: 21,
    
    // Result Grid Configuration
    DEFAULT_PAGE_SIZE: 50,
    MAX_ROWS_DISPLAY: 10000,
    
    // Query History
    MAX_HISTORY_ITEMS: 100,
    
    // Session
    SESSION_STORAGE_KEY: 'sql_playground_session',
    
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
    WS_RECONNECT_DELAY: 3000, // 3 seconds
    
    // UI
    TOAST_DURATION: 5000, // 5 seconds
  };
  
  export default config;