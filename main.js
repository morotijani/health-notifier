const { app, BrowserWindow, ipcMain, screen, Notification, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

const store = new Store();
const autoLauncher = new AutoLaunch({
    name: 'Health Notifier',
    path: app.getPath('exe'),
});

// Default preferences
const defaultSettings = {
    interval: 45, // minutes
    notificationType: 'all', // text, audio, video, all
    enabled: false,
    smartMode: false,
    theme: 'light',
    showWidget: false,
    motivationalTipsEnabled: false,
    autoLaunch: false,
    audioStyle: 'voice', // none, voice, chime
    language: 'en' // en, fr, ak, sw
};

// Load Locale
function loadLocale(lang) {
    try {
        const localePath = path.join(__dirname, 'locales', `${lang}.json`);
        if (fs.existsSync(localePath)) {
            return JSON.parse(fs.readFileSync(localePath, 'utf8'));
        }
    } catch (e) {
        console.error(`Error loading locale ${lang}:`, e);
    }
    // Fallback to English
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en.json'), 'utf8'));
}

// Default stats
const defaultStats = {
    totalReminders: 0,
    totalCompleted: 0,
    totalSkipped: 0,
    totalMinutes: 0,
    dailyHistory: {}
};

let dashboardWindow = null;
let overlayWindow = null;
let widgetWindow = null;
let tray = null;
let timerInterval = null;
let currentIntervalMinutes = 45; // Track current dynamic interval
let timerTargetTime = null; // Track when the current timer is set to expire
let motivationalInterval = null;

// Motivational Tips
const motivationalTips = [
    "Water break reminder: Stay hydrated!",
    "Blink to relax your eyes.",
    "Keep your back straight—avoid slouching.",
    "Take a deep breath and relax your shoulders.",
    "Look away from the screen at something 20 feet away.",
    "Stretch your neck gently from side to side.",
    "Stand up and do a quick stretch."
];

// Dashboard Window
function createDashboardWindow() {
    dashboardWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        title: "Health Notifier",
        icon: path.join(__dirname, 'icon.png'),
        backgroundColor: '#f0f2f5'
    });

    dashboardWindow.loadFile('index.html');

    dashboardWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            dashboardWindow.hide();
        }
        return false;
    });
}

// Tray Icon
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Dashboard',
            click: () => {
                if (dashboardWindow) {
                    dashboardWindow.show();
                } else {
                    createDashboardWindow();
                }
            }
        },
        {
            label: 'Pause/Resume Reminders',
            click: () => {
                const settings = store.get('settings', defaultSettings);
                if (settings.enabled) {
                    stopTimer();
                    settings.enabled = false;
                } else {
                    startTimer(settings);
                    settings.enabled = true;
                }
                store.set('settings', settings);

                // Notify renderer to update UI if open
                if (dashboardWindow) {
                    dashboardWindow.webContents.send('update-timer-ui', settings.enabled);
                }
            }
        },
        {
            label: 'Pause for...',
            submenu: [
                {
                    label: '30 Minutes',
                    click: () => pauseReminders(30 * 60 * 1000)
                },
                {
                    label: '1 Hour',
                    click: () => pauseReminders(60 * 60 * 1000)
                },
                {
                    label: 'Until Tomorrow (9:00 AM)',
                    click: () => {
                        const now = new Date();
                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(9, 0, 0, 0);
                        const msUntilTomorrow = tomorrow - now;
                        pauseReminders(msUntilTomorrow);
                    }
                }
            ]
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Health Notifier');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (dashboardWindow) {
            dashboardWindow.show();
        } else {
            createDashboardWindow();
        }
    });
}

// Overlay Window
function createOverlayWindow(exercise) {
    console.log('createOverlayWindow called');
    if (overlayWindow) {
        if (overlayWindow.isDestroyed()) {
            console.log('Overlay window was destroyed but not null. Resetting.');
            overlayWindow = null;
        } else {
            console.log('Overlay window already exists. Skipping.');
            return;
        }
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    console.log('Creating new overlay window...');
    overlayWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        frame: false,
        transparent: false,
        alwaysOnTop: true,
        kiosk: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        skipTaskbar: true
    });

    overlayWindow.loadFile('overlay.html');

    // Send exercise data once loaded
    overlayWindow.webContents.once('did-finish-load', () => {
        console.log('Overlay loaded. Sending data.');
        const settings = store.get('settings', defaultSettings);
        overlayWindow.webContents.send('exercise-data', { exercise, settings });
        // Log that a reminder was shown
        updateStats('shown', 0);
    });

    overlayWindow.on('closed', () => {
        console.log('Overlay window closed.');
        overlayWindow = null;
    });
}
// ... (skip to IPC Close Overlay)
// IPC Close Overlay
ipcMain.on('close-overlay', () => {
    console.log('IPC close-overlay received.');
    if (overlayWindow) {
        if (!overlayWindow.isDestroyed()) {
            overlayWindow.close();
        } else {
            console.log('Overlay window already destroyed.');
            overlayWindow = null;
        }
    } else {
        console.log('Overlay window is null in close-overlay handler.');
    }
});

// Widget Window
function createWidgetWindow() {
    if (widgetWindow) return;

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    widgetWindow = new BrowserWindow({
        width: 180,
        height: 50,
        x: width - 200,
        y: height - 70,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    widgetWindow.loadFile('widget.html');

    widgetWindow.on('closed', () => {
        widgetWindow = null;
    });
}

// Close Widget Window
function closeWidgetWindow() {
    if (widgetWindow) {
        widgetWindow.close();
        widgetWindow = null;
    }
}

// Get Next Exercise
function getNextExercise() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'exercises.json'));
        const exercises = JSON.parse(data);
        const randomIndex = Math.floor(Math.random() * exercises.length);
        return exercises[randomIndex];
    } catch (err) {
        console.error("Error reading exercises:", err);
        return {
            title: "Take a Break",
            description: "Stretch your legs and relax your eyes.",
            type: "text",
            duration: 30
        };
    }
}

// Show Overlay
function showOverlay() {
    const exercise = getNextExercise();
    createOverlayWindow(exercise);
}

// Start Timer
function startTimer(settings = null, durationMinutesOverride = null) {
    stopTimer(); // Clear existing timer

    const currentSettings = settings || store.get('settings', defaultSettings);
    store.set('settings', currentSettings); // Ensure settings are saved

    // Determine duration
    let durationMinutes = durationMinutesOverride || parseInt(currentSettings.interval) || 45;

    console.log(`startTimer Debug:
        settings.interval: ${currentSettings.interval} (${typeof currentSettings.interval})
        durationMinutesOverride: ${durationMinutesOverride} (${typeof durationMinutesOverride})
        durationMinutes: ${durationMinutes}
    `);

    // Apply smart mode logic if applicable
    if (currentSettings.smartMode && durationMinutesOverride === null) {
        durationMinutes = currentIntervalMinutes;
    } else {
        currentIntervalMinutes = durationMinutes;
    }

    const durationMs = durationMinutes * 60 * 1000;
    // const durationMs = 10000; // DEBUG: 10 seconds
    timerTargetTime = Date.now() + durationMs;

    console.log(`Timer started. Interval: ${durationMinutes} minutes. DurationMs: ${durationMs}`);

    // Widget Logic
    if (currentSettings.showWidget) {
        if (!widgetWindow) createWidgetWindow();
        setTimeout(() => {
            if (widgetWindow) widgetWindow.webContents.send('timer-update', timerTargetTime);
        }, 500);
    } else {
        closeWidgetWindow();
    }

    // Main Timer Logic
    timerInterval = setTimeout(() => {
        console.log('Timer interval fired. Showing overlay.');
        showOverlay();
    }, durationMs);
}

// Stop Timer
function stopTimer() {
    if (timerInterval) {
        clearTimeout(timerInterval);
        timerInterval = null;
    }
    if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
    }
    timerTargetTime = null;
    console.log('Timer stopped.');

    if (widgetWindow) widgetWindow.webContents.send('timer-stopped');
}

// Start Motivational Timer
let pauseTimeout = null; // Track pause timeout

function pauseReminders(durationMs) {
    stopTimer();

    if (pauseTimeout) clearTimeout(pauseTimeout);

    console.log(`Pausing reminders for ${durationMs / 60000} minutes.`);

    // Notify UI
    if (dashboardWindow) {
        dashboardWindow.webContents.send('timer-paused', durationMs);
    }

    pauseTimeout = setTimeout(() => {
        console.log("Pause finished. Resuming timer.");
        startTimer();
        pauseTimeout = null;
        // Notify UI
        if (dashboardWindow) {
            dashboardWindow.webContents.send('update-timer-ui', true);
        }
    }, durationMs);
}

function startMotivationalTimer() {
    if (motivationalInterval) clearInterval(motivationalInterval);

    // 30 minutes interval
    const intervalMs = 30 * 60 * 1000;
    // const intervalMs = 60 * 1000; // Debug: 1 minute

    motivationalInterval = setInterval(() => {
        showMotivationalNotification();
    }, intervalMs);

    console.log("Motivational tips timer started.");
}

// Stop Motivational Timer
function stopMotivationalTimer() {
    if (motivationalInterval) clearInterval(motivationalInterval);
    motivationalInterval = null;
    console.log("Motivational tips timer stopped.");
}

// Show Motivational Notification
function showMotivationalNotification() {
    const randomIndex = Math.floor(Math.random() * motivationalTips.length);
    const message = motivationalTips[randomIndex];

    new Notification({
        title: "Health Tip",
        icon: path.join(__dirname, 'icon.png'),
        body: message,
        silent: false
    }).show();
}

// Update Stats
function updateStats(type, duration = 0) {
    const stats = store.get('stats', defaultStats);
    const settings = store.get('settings', defaultSettings);
    const today = new Date().toISOString().split('T')[0];

    if (!stats.dailyHistory[today]) {
        stats.dailyHistory[today] = { completed: 0, skipped: 0, minutes: 0 };
    }

    if (type === 'shown') {
        stats.totalReminders++;
    } else if (type === 'complete' || type === 'completed') {
        console.log('Stats: Break completed. Restarting timer.');
        stats.totalCompleted++;
        stats.totalMinutes += (duration / 60);
        stats.dailyHistory[today].completed++;
        stats.dailyHistory[today].minutes += (duration / 60);

        if (settings.smartMode && currentIntervalMinutes > settings.interval) {
            console.log(`Smart Mode: Break completed. Resetting interval to baseline ${settings.interval} mins.`);
            startTimer(settings, settings.interval);
        } else {
            startTimer(settings);
        }
    } else if (type === 'skipped') {
        console.log('Stats: Break skipped. Restarting timer.');
        stats.totalSkipped++;
        stats.dailyHistory[today].skipped++;

        if (settings.smartMode) {
            const newInterval = currentIntervalMinutes + 15;
            const maxInterval = 120;

            if (newInterval <= maxInterval) {
                console.log(`Smart Mode: Break skipped. Increasing interval to ${newInterval} mins.`);
                startTimer(settings, newInterval);
            } else {
                startTimer(settings, maxInterval);
            }
        } else {
            startTimer(settings);
        }
    }

    store.set('stats', stats);

    if (dashboardWindow) {
        dashboardWindow.webContents.send('stats-updated', stats);
    }
}

// App Ready
app.whenReady().then(() => {
    createDashboardWindow();

    const savedSettings = store.get('settings', defaultSettings);
    if (savedSettings.enabled) {
        startTimer(savedSettings);
    }
    if (savedSettings.showWidget) {
        createWidgetWindow();
        if (timerTargetTime) {
            setTimeout(() => {
                if (widgetWindow) widgetWindow.webContents.send('timer-update', timerTargetTime);
            }, 500);
        } else {
            setTimeout(() => {
                if (widgetWindow) widgetWindow.webContents.send('timer-stopped');
            }, 500);
        }
    }
    if (savedSettings.motivationalTipsEnabled) {
        startMotivationalTimer();
    }

    // Ensure auto-launch state matches settings (sync check)
    if (savedSettings.autoLaunch) {
        autoLauncher.isEnabled().then((isEnabled) => {
            if (!isEnabled) autoLauncher.enable();
        });
    } else {
        autoLauncher.isEnabled().then((isEnabled) => {
            if (isEnabled) autoLauncher.disable();
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createDashboardWindow();
    });

    createTray();
});

// App Window All Closed
app.on('window-all-closed', () => {
    // Do not quit on window close, as we have a tray icon
    // if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-settings', () => {
    return store.get('settings', defaultSettings);
});

// IPC Get Translations
ipcMain.handle('get-translations', (event, lang) => {
    return loadLocale(lang);
});

// IPC Get Stats
ipcMain.handle('get-stats', () => {
    return store.get('stats', defaultStats);
});

// IPC Log Stat
ipcMain.on('log-stat', (event, { type, duration }) => {
    console.log(`IPC log-stat received: ${type}`);
    updateStats(type, duration);
});

// IPC Save Settings
ipcMain.on('save-settings', (event, newSettings) => {
    const oldSettings = store.get('settings', defaultSettings);
    store.set('settings', newSettings);

    const shouldRestartTimer =
        (!oldSettings.enabled && newSettings.enabled) ||
        (oldSettings.interval !== newSettings.interval) ||
        (oldSettings.smartMode !== newSettings.smartMode);

    if (newSettings.showWidget !== oldSettings.showWidget) {
        if (newSettings.showWidget) {
            createWidgetWindow();
            if (timerTargetTime) {
                setTimeout(() => {
                    if (widgetWindow) widgetWindow.webContents.send('timer-update', timerTargetTime);
                }, 500);
            } else {
                setTimeout(() => {
                    if (widgetWindow) widgetWindow.webContents.send('timer-stopped');
                }, 500);
            }
        } else {
            closeWidgetWindow();
        }
    }

    if (newSettings.motivationalTipsEnabled !== oldSettings.motivationalTipsEnabled) {
        if (newSettings.motivationalTipsEnabled) {
            startMotivationalTimer();
        } else {
            stopMotivationalTimer();
        }
    }

    // Handle Auto Launch
    if (newSettings.autoLaunch !== oldSettings.autoLaunch) {
        if (newSettings.autoLaunch) {
            autoLauncher.enable();
            console.log('Auto-launch enabled');
        } else {
            autoLauncher.disable();
            console.log('Auto-launch disabled');
        }
    }

    if (newSettings.enabled) {
        if (shouldRestartTimer) {
            startTimer(newSettings);
        }
    } else {
        stopTimer();
    }

    // Broadcast settings update to other windows
    if (widgetWindow) {
        widgetWindow.webContents.send('settings-updated', newSettings);
    }
    if (overlayWindow) {
        overlayWindow.webContents.send('settings-updated', newSettings);
    }
});

// IPC Start Timer
ipcMain.on('start-timer', (event, settings) => {
    startTimer(settings);
});

// IPC Stop Timer
ipcMain.on('stop-timer', () => {
    stopTimer();
    store.set('settings.enabled', false);
});

// IPC Close Overlay
ipcMain.on('close-overlay', () => {
    if (overlayWindow) {
        overlayWindow.close();
    }
});

// IPC Minimize App
ipcMain.on('minimize-app', () => {
    if (dashboardWindow) dashboardWindow.minimize();
});

// IPC Close App
ipcMain.on('close-app', () => {
    app.isQuitting = true;
    app.quit();
});

// IPC Toggle Widget
ipcMain.on('toggle-widget', (event, show) => {
    const settings = store.get('settings', defaultSettings);
    settings.showWidget = show;
    store.set('settings', settings);

    if (show) {
        createWidgetWindow();
        if (timerTargetTime) {
            setTimeout(() => {
                if (widgetWindow) widgetWindow.webContents.send('timer-update', timerTargetTime);
            }, 500);
        } else {
            setTimeout(() => {
                if (widgetWindow) widgetWindow.webContents.send('timer-stopped');
            }, 500);
        }
    } else {
        closeWidgetWindow();
    }
});

// IPC Toggle Motivational
ipcMain.on('toggle-motivational', (event, enabled) => {
    const settings = store.get('settings', defaultSettings);
    settings.motivationalTipsEnabled = enabled;
    store.set('settings', settings);

    if (enabled) {
        startMotivationalTimer();
    } else {
        stopMotivationalTimer();
    }
});
