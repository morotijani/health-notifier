const toggleTimer = document.getElementById('toggle-timer');
const statusText = document.getElementById('status-text');
const intervalRadios = document.getElementsByName('interval');
const customIntervalContainer = document.getElementById('custom-interval-container');
const intervalInput = document.getElementById('interval-input');
const smartModeToggle = document.getElementById('smart-mode-toggle');
const widgetToggle = document.getElementById('widget-toggle');
const motivationalToggle = document.getElementById('motivational-toggle');
const autoLaunchToggle = document.getElementById('auto-launch-toggle');
const notificationTypeSelect = document.getElementById('notification-type');
const audioStyleSelect = document.getElementById('audio-style');
const languageSelect = document.getElementById('language-select');
const themeToggle = document.getElementById('theme-toggle');
const saveBtn = document.getElementById('save-btn');

// Navigation & Sections
const navDashboard = document.getElementById('nav-dashboard');
const navStats = document.getElementById('nav-stats');
const navSettings = document.getElementById('nav-settings');
const dashboardSection = document.getElementById('dashboard-section');
const statsSection = document.getElementById('stats-section');

// Stats Elements
const statTotalBreaks = document.getElementById('stat-total-breaks');
const statTotalMinutes = document.getElementById('stat-total-minutes');
const statTotalSkipped = document.getElementById('stat-total-skipped');
const statCompletionRate = document.getElementById('stat-completion-rate');

let activityChart = null;
let currentTranslations = {};

// Load initial settings
window.api.getSettings().then(settings => {
    toggleTimer.checked = settings.enabled;
    updateStatus(settings.enabled);

    // Set interval UI
    const currentInterval = settings.interval || 45;
    let foundRadio = false;

    for (const radio of intervalRadios) {
        if (parseInt(radio.value) === parseInt(currentInterval)) {
            radio.checked = true;
            foundRadio = true;
        }
    }

    if (!foundRadio) {
        document.getElementById('interval-custom').checked = true;
        customIntervalContainer.style.display = 'block';
        intervalInput.value = currentInterval;
    } else {
        customIntervalContainer.style.display = 'none';
        intervalInput.value = currentInterval; // Keep sync
    }

    // Set Smart Mode
    smartModeToggle.checked = settings.smartMode || false;

    // Set Widget Toggle
    widgetToggle.checked = settings.showWidget || false;

    // Set Motivational Toggle
    motivationalToggle.checked = settings.motivationalTipsEnabled || false;

    // Set Auto Launch Toggle
    if (autoLaunchToggle) {
        autoLaunchToggle.checked = settings.autoLaunch || false;
    }

    // Set notification type
    notificationTypeSelect.value = settings.notificationType;

    // Set audio style
    if (audioStyleSelect) {
        audioStyleSelect.value = settings.audioStyle || 'voice';
    }

    // Set Language
    if (languageSelect) {
        languageSelect.value = settings.language || 'en';
        loadTranslations(settings.language || 'en');
    }

    // Set Theme
    if (settings.theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    } else {
        document.body.removeAttribute('data-theme');
        updateThemeIcon(false);
    }
});

// Load Translations
function loadTranslations(lang) {
    window.api.getTranslations(lang).then(translations => {
        currentTranslations = translations;
        applyTranslations();
    });
}

// Apply Translations to UI
function applyTranslations() {
    const t = currentTranslations;
    if (!t) return;

    // Sidebar
    document.getElementById('nav-dashboard').innerHTML = `<i class="bi bi-speedometer2 me-2"></i> ${t.sidebar.dashboard}`;
    document.getElementById('nav-stats').innerHTML = `<i class="bi bi-bar-chart me-2"></i> ${t.sidebar.statistics}`;
    document.getElementById('nav-settings').innerHTML = `<i class="bi bi-gear me-2"></i> ${t.sidebar.settings}`;
    updateThemeIcon(document.body.getAttribute('data-theme') === 'dark');

    // Dashboard
    document.querySelector('#dashboard-section header h2').innerText = t.dashboard.title;
    document.querySelector('#dashboard-section header p').innerText = t.dashboard.subtitle;
    document.querySelector('.card-title.fw-bold.mb-1').innerText = t.dashboard.status;
    updateStatus(toggleTimer.checked);
    document.getElementById('save-btn').innerText = t.dashboard.save;

    // Settings
    // Note: We need to target elements carefully. Ideally, we should add IDs or data attributes to all text elements.
    // For now, I'll use querySelectors where possible or assume structure.
    // A better approach is to add data-i18n attributes to HTML elements.
    // But since I can't easily rewrite the whole HTML with attributes right now without making this huge,
    // I will target specific known elements.

    // Interval
    const intervalCard = document.querySelectorAll('.card-body')[1]; // Assuming order
    if (intervalCard) {
        intervalCard.querySelector('h5').innerText = t.settings.interval;
        intervalCard.querySelector('p').innerText = t.settings.intervalSubtitle;
        document.querySelector('label[for="interval-45"]').innerText = `45 ${t.settings.minutes}`;
        document.querySelector('label[for="interval-60"]').innerText = `60 ${t.settings.minutes}`;
        document.querySelector('label[for="interval-custom"]').innerText = t.settings.custom;
    }

    // Smart Mode
    document.querySelector('label[for="smart-mode-toggle"] strong').innerText = t.settings.smartMode;
    document.querySelector('label[for="smart-mode-toggle"] .text-muted').innerText = t.settings.smartModeDesc;

    // Widget
    document.querySelector('label[for="widget-toggle"] strong').innerText = t.settings.widget;
    document.querySelector('label[for="widget-toggle"] .text-muted').innerText = t.settings.widgetDesc;

    // Motivational
    document.querySelector('label[for="motivational-toggle"] strong').innerText = t.settings.motivational;
    document.querySelector('label[for="motivational-toggle"] .text-muted').innerText = t.settings.motivationalDesc;

    // Auto Launch
    document.querySelector('label[for="auto-launch-toggle"] strong').innerText = t.settings.autoLaunch;
    document.querySelector('label[for="auto-launch-toggle"] .text-muted').innerText = t.settings.autoLaunchDesc;

    // Notification Type
    const notifCard = document.querySelectorAll('.card-body')[2]; // Assuming order
    if (notifCard) {
        notifCard.querySelectorAll('h5')[0].innerText = t.settings.notificationType;
        notifCard.querySelectorAll('p')[0].innerText = t.settings.notificationTypeDesc;

        const notifSelect = document.getElementById('notification-type');
        notifSelect.options[0].text = t.options.all;
        notifSelect.options[1].text = t.options.video;
        notifSelect.options[2].text = t.options.audio;
        notifSelect.options[3].text = t.options.text;

        notifCard.querySelectorAll('h5')[1].innerText = t.settings.audioGuide;
        notifCard.querySelectorAll('p')[1].innerText = t.settings.audioGuideDesc;

        const audioSelect = document.getElementById('audio-style');
        audioSelect.options[0].text = t.options.none;
        audioSelect.options[1].text = t.options.voice;
        audioSelect.options[2].text = t.options.chime;

        notifCard.querySelectorAll('h5')[2].innerText = t.settings.language;
        notifCard.querySelectorAll('p')[2].innerText = t.settings.languageDesc;
    }

    // Stats
    document.querySelector('#stats-section header h2').innerText = t.stats.title;
    document.querySelector('#stats-section header p').innerText = t.stats.subtitle;

    const statCards = document.querySelectorAll('#stats-section .card-body');
    if (statCards.length >= 4) {
        statCards[0].querySelector('h6').innerText = t.stats.totalBreaks;
        statCards[1].querySelector('h6').innerText = t.stats.minutesStretched;
        statCards[2].querySelector('h6').innerText = t.stats.skipped;
        statCards[3].querySelector('h6').innerText = t.stats.completionRate;
    }

    document.querySelector('#stats-section .card-title').innerText = t.stats.history;
}

// Theme Toggle Logic
themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        updateThemeIcon(false);
    } else {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    }

    // Auto-save theme preference immediately
    window.api.getSettings().then(currentSettings => {
        const newSettings = { ...currentSettings, theme: !isDark ? 'dark' : 'light' };
        window.api.saveSettings(newSettings);
    });
});

function updateThemeIcon(isDark) {
    const t = currentTranslations.sidebar || { darkMode: "Dark Mode", lightMode: "Light Mode" };
    if (isDark) {
        themeToggle.innerHTML = `<i class="bi bi-sun me-2"></i> ${t.lightMode}`;
        themeToggle.classList.remove('btn-outline-secondary');
        themeToggle.classList.add('btn-outline-warning');
    } else {
        themeToggle.innerHTML = `<i class="bi bi-moon me-2"></i> ${t.darkMode}`;
        themeToggle.classList.remove('btn-outline-warning');
        themeToggle.classList.add('btn-outline-secondary');
    }
}

// Interval Radio Logic
for (const radio of intervalRadios) {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customIntervalContainer.style.display = 'block';
            intervalInput.focus();
        } else {
            customIntervalContainer.style.display = 'none';
            intervalInput.value = e.target.value;
        }
    });
}

// Load initial stats
loadStats();

// Listen for stats updates
window.api.onStatsUpdated((stats) => {
    renderStats(stats);
});

// Listen for timer updates from Tray
window.api.onUpdateTimerUI((enabled) => {
    toggleTimer.checked = enabled;
    updateStatus(enabled);
});

// Navigation Logic
navDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('dashboard');
});

navSettings.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('dashboard');
});

navStats.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('stats');
    loadStats(); // Refresh on view
});

function showSection(section) {
    if (section === 'dashboard') {
        dashboardSection.style.display = 'block';
        statsSection.style.display = 'none';
        navDashboard.classList.add('active');
        navStats.classList.remove('active');
    } else {
        dashboardSection.style.display = 'none';
        statsSection.style.display = 'block';
        navDashboard.classList.remove('active');
        navStats.classList.add('active');
    }
}

function loadStats() {
    window.api.getStats().then(stats => {
        renderStats(stats);
    });
}

function renderStats(stats) {
    // Update Summary Cards
    statTotalBreaks.innerText = stats.totalCompleted || 0;
    statTotalMinutes.innerText = (stats.totalMinutes || 0).toFixed(1);
    statTotalSkipped.innerText = stats.totalSkipped || 0;

    const total = (stats.totalCompleted || 0) + (stats.totalSkipped || 0);
    const rate = total > 0 ? Math.round((stats.totalCompleted / total) * 100) : 0;
    statCompletionRate.innerText = `${rate}%`;

    // Render Chart
    renderChart(stats.dailyHistory || {});
}

function renderChart(history) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#1f2937';
    const gridColor = isDark ? '#4b5563' : '#e5e7eb';

    // Get last 7 days
    const labels = [];
    const dataCompleted = [];
    const dataSkipped = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

        labels.push(dayLabel);
        const dayStats = history[dateKey] || { completed: 0, skipped: 0 };
        dataCompleted.push(dayStats.completed);
        dataSkipped.push(dayStats.skipped);
    }

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Completed',
                    data: dataCompleted,
                    backgroundColor: '#198754',
                    borderRadius: 5
                },
                {
                    label: 'Skipped',
                    data: dataSkipped,
                    backgroundColor: '#dc3545',
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    });
}


// Toggle Switch
toggleTimer.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    updateStatus(isEnabled);
});

function updateStatus(enabled) {
    const t = currentTranslations.dashboard || { timerRunning: "Timer is running", timerStopped: "Timer is stopped" };
    if (enabled) {
        statusText.innerText = t.timerRunning;
        statusText.classList.remove('text-muted');
        statusText.classList.add('text-success', 'fw-bold');
    } else {
        statusText.innerText = t.timerStopped;
        statusText.classList.remove('text-success', 'fw-bold');
        statusText.classList.add('text-muted');
    }
}

// Save Preferences
saveBtn.addEventListener('click', () => {
    let selectedInterval = 45;
    let isCustom = false;

    for (const radio of intervalRadios) {
        if (radio.checked) {
            if (radio.value === 'custom') {
                isCustom = true;
            } else {
                selectedInterval = radio.value;
            }
            break;
        }
    }

    if (isCustom) {
        selectedInterval = intervalInput.value;
    }

    // Validate
    if (selectedInterval < 1) selectedInterval = 1; // Minimum safety

    const settings = {
        enabled: toggleTimer.checked,
        interval: parseInt(selectedInterval),
        smartMode: smartModeToggle.checked,
        showWidget: widgetToggle.checked,
        motivationalTipsEnabled: motivationalToggle.checked,
        autoLaunch: autoLaunchToggle ? autoLaunchToggle.checked : false,
        notificationType: notificationTypeSelect.value,
        audioStyle: audioStyleSelect.value,
        language: languageSelect.value, // Added
        theme: document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    };

    window.api.saveSettings(settings);

    // Reload translations and then show feedback
    window.api.getTranslations(settings.language).then(translations => {
        currentTranslations = translations;
        applyTranslations();

        // Visual feedback
        const t = currentTranslations.dashboard || { saved: "Saved!", save: "Save Preferences" };
        saveBtn.innerText = t.saved;
        saveBtn.classList.remove('btn-primary');
        saveBtn.classList.add('btn-success');

        setTimeout(() => {
            saveBtn.innerText = t.save; // Revert to translated "Save Preferences"
            saveBtn.classList.remove('btn-success');
            saveBtn.classList.add('btn-primary');
        }, 2000);
    });
});

// Reset Button Logic
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        // Use a simple confirm for now, or a custom modal if preferred.
        // Since we are in renderer, we can use standard confirm.
        if (confirm('Are you sure you want to reset all settings and statistics to default? This cannot be undone.')) {
            window.api.resetSettings();
        }
    });
}

// Listen for reset success to reload UI
window.api.onResetSuccess(() => {
    window.location.reload();
});
