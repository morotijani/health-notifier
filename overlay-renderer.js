const titleEl = document.getElementById('exercise-title');
const descEl = document.getElementById('exercise-description');
const mediaContainer = document.getElementById('media-container');
const timerValue = document.getElementById('timer-value');
const skipBtn = document.getElementById('skip-btn');

let timeLeft = 30;
let timerInterval;

window.api.onExerciseData((exercise) => {
    if (!exercise) return;

    titleEl.innerText = exercise.title || "Time to Stretch!";
    descEl.innerText = exercise.description || "";
    timeLeft = exercise.duration || 30;
    timerValue.innerText = timeLeft;

    // Render Media
    mediaContainer.innerHTML = '';
    if (exercise.type === 'video' && exercise.mediaUrl) {
        const video = document.createElement('video');
        video.src = exercise.mediaUrl;
        video.autoplay = true;
        video.loop = true;
        video.muted = true; // Autoplay often requires mute
        video.classList.add('exercise-media');
        mediaContainer.appendChild(video);
    } else if (exercise.type === 'audio' && exercise.mediaUrl) {
        const icon = document.createElement('div');
        icon.innerHTML = '<i class="bi bi-volume-up display-1"></i>'; // Needs bootstrap icons
        mediaContainer.appendChild(icon);

        const audio = new Audio(exercise.mediaUrl);
        audio.play().catch(e => console.log("Audio autoplay blocked", e));
    }

    startCountdown();
});

function startCountdown() {
    timerInterval = setInterval(() => {
        timeLeft--;
        timerValue.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Log completion
            window.api.logStat('complete', 30); // Assuming 30s duration for now, can be dynamic
            window.api.closeOverlay();
        }
    }, 1000);
}

skipBtn.addEventListener('click', () => {
    window.api.logStat('skipped');
    window.api.closeOverlay();
});

// Log that it was shown
window.api.logStat('shown');
