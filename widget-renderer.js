const { ipcRenderer } = require('electron');

const timeDisplay = document.getElementById('time-display');
const closeBtn = document.getElementById('close-widget');

let targetTime = null;
let updateInterval = null;

ipcRenderer.on('timer-update', (event, targetTimestamp) => {
    targetTime = targetTimestamp;
    updateDisplay();

    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateDisplay, 1000); // Update every second
});

ipcRenderer.on('timer-stopped', () => {
    targetTime = null;
    if (updateInterval) clearInterval(updateInterval);
    timeDisplay.innerText = "Timer stopped";
});

function updateDisplay() {
    if (!targetTime) return;

    const now = Date.now();
    const diff = targetTime - now;

    if (diff <= 0) {
        timeDisplay.innerText = currentTranslations.breakTime || "Break time!";
        return;
    }

    const minutes = Math.ceil(diff / 60000);
    const nextBreakText = currentTranslations.nextBreak || "Next break";
    timeDisplay.innerText = `${nextBreakText}: ${minutes}m`;
}

// Load Translations
function loadWidgetTranslations(lang) {
    ipcRenderer.invoke('get-translations', lang).then(t => {
        if (t && t.widget) {
            currentTranslations = t.widget;
            updateDisplay();
        }
    });
}

let currentTranslations = {};
ipcRenderer.invoke('get-settings').then(settings => {
    loadWidgetTranslations(settings.language || 'en');
});

// Listen for settings updates
ipcRenderer.on('settings-updated', (event, settings) => {
    loadWidgetTranslations(settings.language || 'en');
});

closeBtn.addEventListener('click', () => {
    ipcRenderer.send('toggle-widget', false); // Request main to close/hide widget
});
