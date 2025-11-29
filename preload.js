const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Dashboard methods
    startTimer: (settings) => ipcRenderer.send('start-timer', settings),
    stopTimer: () => ipcRenderer.send('stop-timer'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    getTranslations: (lang) => ipcRenderer.invoke('get-translations', lang),

    // Overlay methods
    closeOverlay: () => ipcRenderer.send('close-overlay'),
    onExerciseData: (callback) => ipcRenderer.on('exercise-data', (event, data) => callback(data)),
    logStat: (type, duration) => ipcRenderer.send('log-stat', { type, duration }),

    // Stats methods
    getStats: () => ipcRenderer.invoke('get-stats'),
    onStatsUpdated: (callback) => ipcRenderer.on('stats-updated', (event, stats) => callback(stats)),

    // General
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    closeApp: () => ipcRenderer.send('close-app'),
    onUpdateTimerUI: (callback) => ipcRenderer.on('update-timer-ui', (event, enabled) => callback(enabled))
});
