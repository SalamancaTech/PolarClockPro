const Tools = (function() {
    // --- DOM Element Selections ---
    const toggleTimerBtn = document.getElementById('toggleTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimer');
    const timerExpressionInput = document.getElementById('timerExpressionInput');
    const timerDisplay = document.getElementById('timerDisplay');
    const intervalToggle = document.getElementById('intervalToggle');
    const timerStyleToggle = document.getElementById('timerStyleToggle');

    const toggleStopwatchBtn = document.getElementById('toggleStopwatchBtn');
    const lapStopwatchBtn = document.getElementById('lapStopwatch');
    const resetStopwatchBtn = document.getElementById('resetStopwatch');
    const lapTimesContainer = document.getElementById('lapTimes');
    const stopwatchIntervalSoundToggle = document.getElementById('stopwatchIntervalSoundToggle');
    const stopwatchIntervalInputs = document.getElementById('stopwatchIntervalInputs');
    const stopwatchIntervalHours = document.getElementById('stopwatchIntervalHours');
    const stopwatchIntervalMinutes = document.getElementById('stopwatchIntervalMinutes');
    const stopwatchIntervalSeconds = document.getElementById('stopwatchIntervalSeconds');

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    const statusDisplay = document.getElementById('pomodoroStatus');
    const pomodoroWorkDisplay = document.getElementById('pomodoroWorkDisplay');
    const pomodoroShortBreakDisplay = document.getElementById('pomodoroShortBreakDisplay');
    const pomodoroLongBreakDisplay = document.getElementById('pomodoroLongBreakDisplay');
    const togglePomodoroBtn = document.getElementById('togglePomodoroBtn');
    const resetPomodoroBtn = document.getElementById('resetPomodoro');
    const pomodoroAlarmControls = document.getElementById('pomodoroAlarmControls');
    const mutePomodoroBtn = document.getElementById('pomodoroMuteBtn');
    const snoozePomodoroBtn = document.getElementById('pomodoroSnoozeBtn');
    const nextCyclePomodoroBtn = document.getElementById('nextCyclePomodoroBtn');
    const workDurationInput = document.getElementById('pomodoroWorkDuration');
    const shortBreakDurationInput = document.getElementById('pomodoroShortBreakDuration');
    const longBreakDurationInput = document.getElementById('pomodoroLongBreakDuration');
    const continuousToggleInput = document.getElementById('pomodoroContinuousToggle');

    // --- Module State ---
    let settings = {};
    let currentTestSound = null;
    const state = {
        timer: {
            totalSeconds: 0,
            remainingSeconds: 0,
            isRunning: false,
            isInterval: false,
            style: false,
            alarmPlaying: false,
            isMuted: false,
            isSnoozing: false,
            lastMinuteSoundPlayed: false,
            currentAudio: null,
            endOfCycleSoundPlayed: false
        },
        pomodoro: {
            isRunning: false,
            phase: 'work',
            cycles: 0,
            remainingSeconds: 25 * 60,
            alarmPlaying: false,
            isMuted: false,
            hasStarted: false,
            continuous: false,
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            isOneMinuteWarningPlayed: false,
            actionButtonsVisible: false,
            lastMinuteSoundPlayed: false,
            isSnoozing: false,
            currentAudio: null,
            endOfCycleSoundPlayed: false
        },
        stopwatch: {
            startTime: 0,
            elapsedTime: 0,
            isRunning: false,
            laps: [],
            isMuted: false,
            isIntervalSoundEnabled: false,
            intervalSeconds: 0,
            lastIntervalPlayed: 0
        }
    };

    // --- Private Functions ---

    function setTimerInputsDisabled(disabled) {
        timerExpressionInput.disabled = disabled;
    }

    function formatSecondsToDDHHMMSS(totalSeconds) {
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Timer Functions
    function normalizeTimerInputs() {
        const expression = timerExpressionInput.value;
        const totalSeconds = TimeCalculator.parseNaturalTime(expression) || 0;

        state.timer.totalSeconds = totalSeconds;
        if (!state.timer.isRunning) {
            state.timer.remainingSeconds = totalSeconds;
            timerDisplay.textContent = formatSecondsToDDHHMMSS(totalSeconds);
        }
        document.dispatchEvent(new CustomEvent('statechange'));
    }


    function toggleTimer() {
        if (state.timer.alarmPlaying) {
            stopTimerAlarm();
            return;
        }
        state.timer.isRunning ? pauseTimer() : startTimer();
    }

    function startTimer() {
        if (state.timer.remainingSeconds <= 0) {
            normalizeTimerInputs();
        }

        if (state.timer.remainingSeconds > 0) {
            state.timer.isRunning = true;
            setTimerInputsDisabled(true);
            if (state.timer.remainingSeconds > 58) {
                state.timer.endOfCycleSoundPlayed = false;
            }
        }
        updateButtonStates();
    }

    function pauseTimer() {
        state.timer.isRunning = false;
        setTimerInputsDisabled(false);
        updateButtonStates();
    }

    function resetTimer() {
        state.timer.isRunning = false;
        setTimerInputsDisabled(false);
        state.timer.totalSeconds = 0;
        state.timer.remainingSeconds = 0;

        state.timer.alarmPlaying = false;
        state.timer.isMuted = false;
        state.timer.isSnoozing = false;
        state.timer.lastMinuteSoundPlayed = false;
        state.timer.endOfCycleSoundPlayed = false;
        if (state.timer.currentAudio) {
            state.timer.currentAudio.pause();
            state.timer.currentAudio = null;
        }

        timerExpressionInput.value = "";
        timerDisplay.textContent = "00:00:00:00";


        const timeInputs = document.querySelector('.time-inputs');
        if (timeInputs) {
            timeInputs.classList.remove('snoozed');
        }

        updateButtonStates();
        updateTimerUI();
    }

    function timerFinished() {
        if (state.timer.isInterval) {
            state.timer.remainingSeconds = state.timer.totalSeconds;
            state.timer.endOfCycleSoundPlayed = false;
             if (!state.timer.isMuted) {
                playSound(settings.timerSound);
            }
        } else {
            state.timer.isRunning = false;
            state.timer.alarmPlaying = true;
            state.timer.remainingSeconds = 0;
            if (!state.timer.isMuted) {
                playSound(settings.timerSound);
            }
            updateTimerUI();
        }
    }

    function snoozeTimer() {
        if (state.timer.currentAudio) {
            state.timer.currentAudio.pause();
            state.timer.currentAudio = null;
        }
        state.timer.remainingSeconds += 300; // Add 5 minutes
        state.timer.isSnoozing = true;
        state.timer.alarmPlaying = false;
        state.timer.endOfCycleSoundPlayed = false;

        if (state.timer.isMuted) {
            state.timer.isMuted = false;
            const timerMuteBtn = document.getElementById('timerMuteBtn');
            if (timerMuteBtn) {
                timerMuteBtn.classList.remove('active');
            }
        }

        startTimer();
        updateTimerUI();
        updateButtonStates();
    }

    function stopTimerAlarm() {
        if (state.timer.currentAudio) {
            state.timer.currentAudio.pause();
            state.timer.currentAudio = null;
        }
        resetTimer();
    }

    function restartTimer() {
        if (state.timer.currentAudio) {
            state.timer.currentAudio.pause();
            state.timer.currentAudio = null;
        }
        state.timer.remainingSeconds = state.timer.totalSeconds;
        state.timer.alarmPlaying = false;
        state.timer.isSnoozing = false;
        state.timer.isMuted = false;
        state.timer.endOfCycleSoundPlayed = false;

        startTimer();
    }

    // Stopwatch Functions
    function toggleStopwatch() {
        state.stopwatch.isRunning ? pauseStopwatch() : startStopwatch();
    }

    function startStopwatch() {
        state.stopwatch.isRunning = true;
        state.stopwatch.startTime = Date.now() - state.stopwatch.elapsedTime;
        updateButtonStates();
    }

    function pauseStopwatch() {
        state.stopwatch.isRunning = false;
        updateButtonStates();
    }

    function resetStopwatch() {
        state.stopwatch.isRunning = false;
        state.stopwatch.elapsedTime = 0;
        state.stopwatch.laps = [];
        state.stopwatch.lastIntervalPlayed = 0;
        updateLapDisplay();
        if (!state.stopwatch.isMuted) {
            playSound(settings.stopwatchSound);
        }
        updateButtonStates();
        document.dispatchEvent(new CustomEvent('statechange'));
    }

    function lapStopwatch() {
        if (!state.stopwatch.isRunning && state.stopwatch.elapsedTime === 0) return;
        if (!state.stopwatch.isMuted) {
            playSound(settings.stopwatchSound);
        }
        state.stopwatch.laps.push({ time: state.stopwatch.elapsedTime, label: '' });
        updateLapDisplay();
        document.dispatchEvent(new CustomEvent('statechange'));
    }

    function updateLapDisplay() {
        lapTimesContainer.innerHTML = '';
        state.stopwatch.laps.forEach((lap, index) => {
            const lapElement = document.createElement('li');
            lapElement.classList.add('lap-item');
            lapElement.innerHTML = `
                <span class="lap-number">Lap ${index + 1}</span>
                <span class="lap-time">${formatTime(lap.time)}</span>
                <input type="text" class="lap-label-input" value="${escapeHTML(lap.label)}" data-index="${index}" placeholder="Add label...">
            `;
            lapTimesContainer.prepend(lapElement);
        });
    }

    function formatTime(ms) {
        const d = new Date(ms);
        return `${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}.${d.getUTCMilliseconds().toString().padStart(3, '0')}`;
    }

    // Pomodoro Functions
    function togglePomodoro() {
        if (state.pomodoro.alarmPlaying) {
            endCycle();
            return;
        }

        state.pomodoro.isRunning = !state.pomodoro.isRunning;

        if (state.pomodoro.currentAudio) {
            if (state.pomodoro.isRunning) {
                state.pomodoro.currentAudio.play();
            } else {
                state.pomodoro.currentAudio.pause();
            }
        }

        if (state.pomodoro.isRunning && !state.pomodoro.hasStarted) {
            state.pomodoro.hasStarted = true;
        }

        if (state.pomodoro.isRunning && state.pomodoro.remainingSeconds <= 0) {
            startNextPomodoroPhase(false);
        }
        updatePomodoroUI();
    }


    function resetPomodoro() {
        state.pomodoro.isRunning = false;
        state.pomodoro.phase = 'work';
        state.pomodoro.cycles = 0;
        state.pomodoro.remainingSeconds = state.pomodoro.workDuration * 60;
        state.pomodoro.alarmPlaying = false;
        state.pomodoro.isMuted = false;
        if (mutePomodoroBtn) {
            mutePomodoroBtn.classList.remove('active');
        }
        state.pomodoro.hasStarted = false;
        state.pomodoro.isOneMinuteWarningPlayed = false;
        state.pomodoro.lastMinuteSoundPlayed = false;
        state.pomodoro.isSnoozing = false;
        state.pomodoro.actionButtonsVisible = false;
        state.pomodoro.endOfCycleSoundPlayed = false;

        state.pomodoro.isMuted = false;
        if (mutePomodoroBtn) {
            mutePomodoroBtn.classList.remove('active');
        }

        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
            state.pomodoro.currentAudio = null;
        }
        updatePomodoroDashboard();
        updatePomodoroUI();
        const pomodoroActions = document.getElementById('pomodoroActions');
        if (pomodoroActions) {
            pomodoroActions.style.display = 'none';
        }
        document.dispatchEvent(new CustomEvent('pomodoro-reset'));
    }


    function mutePomodoroAudio() {
        state.pomodoro.isMuted = !state.pomodoro.isMuted;
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.muted = state.pomodoro.isMuted;
        }
        mutePomodoroBtn.classList.toggle('active', state.pomodoro.isMuted);
    }

    function snoozePomodoro() {
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
            state.pomodoro.currentAudio = null;
        }
        state.pomodoro.remainingSeconds += 300; // Add 5 minutes
        state.pomodoro.isSnoozing = true;
        state.pomodoro.endOfCycleSoundPlayed = false;
    }

    function endCycle() {
        state.pomodoro.isSnoozing = false;
        state.pomodoro.alarmPlaying = false;
        startNextPomodoroPhase(true);
        updatePomodoroDashboard();
        updatePomodoroUI();
    }

    function startNextPomodoroPhase(playSoundOnStart = true) {
        let nextPhase = 'work';
        let duration = state.pomodoro.workDuration * 60;

        if (!state.pomodoro.isSnoozing) {
            if (state.pomodoro.phase === 'work') {
                state.pomodoro.cycles++;
                if (state.pomodoro.cycles > 0 && state.pomodoro.cycles % 4 === 0) {
                    nextPhase = 'longBreak';
                    duration = state.pomodoro.longBreakDuration * 60;
                } else {
                    nextPhase = 'shortBreak';
                    duration = state.pomodoro.shortBreakDuration * 60;
                }
            } else {
                nextPhase = 'work';
                duration = state.pomodoro.workDuration * 60;
            }
            state.pomodoro.phase = nextPhase;
        }

        state.pomodoro.remainingSeconds = duration;
        state.pomodoro.isOneMinuteWarningPlayed = false;
        state.pomodoro.lastMinuteSoundPlayed = false;
        state.pomodoro.isSnoozing = false;
        state.pomodoro.actionButtonsVisible = false;
        state.pomodoro.endOfCycleSoundPlayed = false;
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
            state.pomodoro.currentAudio = null;
        }
        const pomodoroActions = document.getElementById('pomodoroActions');
        if (pomodoroActions) {
            pomodoroActions.style.display = 'none';
        }

        updatePomodoroDashboard();
        state.pomodoro.isRunning = true;
    }

    function formatToHHMMSS(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updatePomodoroDashboard() {
        const { phase, remainingSeconds, workDuration, shortBreakDuration, longBreakDuration, isRunning, hasStarted, isSnoozing } = state.pomodoro;

        pomodoroWorkDisplay.textContent = formatToHHMMSS(phase === 'work' ? remainingSeconds : workDuration * 60);
        pomodoroShortBreakDisplay.textContent = formatToHHMMSS(phase === 'shortBreak' ? remainingSeconds : shortBreakDuration * 60);
        pomodoroLongBreakDisplay.textContent = formatToHHMMSS(phase === 'longBreak' ? remainingSeconds : longBreakDuration * 60);

        const workItem = pomodoroWorkDisplay.parentElement;
        const shortBreakItem = pomodoroShortBreakDisplay.parentElement;
        const longBreakItem = pomodoroLongBreakDisplay.parentElement;

        workItem.style.display = 'none';
        shortBreakItem.style.display = 'none';
        longBreakItem.style.display = 'none';

        const allDisplays = [pomodoroWorkDisplay, pomodoroShortBreakDisplay, pomodoroLongBreakDisplay];
        allDisplays.forEach(display => display.classList.remove('active', 'paused', 'snoozed'));

        let activeDisplay;
        let activeItem;

        if (phase === 'work') {
            activeDisplay = pomodoroWorkDisplay;
            activeItem = workItem;
        } else if (phase === 'shortBreak') {
            activeDisplay = pomodoroShortBreakDisplay;
            activeItem = shortBreakItem;
        } else {
            activeDisplay = pomodoroLongBreakDisplay;
            activeItem = longBreakItem;
        }

        activeItem.style.display = 'flex';

        if (isSnoozing) {
            activeDisplay.classList.add('snoozed');
        } else if (isRunning) {
            activeDisplay.classList.add('active');
        } else if (hasStarted) {
            activeDisplay.classList.add('paused');
        }

        let statusText = "Work Session";
        if (isSnoozing) {
            statusText = "Snoozing";
        } else if (phase === 'shortBreak') {
            statusText = "Short Break";
        } else if (phase === 'longBreak') {
            statusText = "Long Break";
        }
        statusDisplay.textContent = statusText;
    }

    function updatePomodoroUI() {
        const mainControls = document.getElementById('pomodoro-main-controls');
        const alarmControls = document.getElementById('pomodoroAlarmControls');
        const toggleBtn = document.getElementById('togglePomodoroBtn');
        const resetBtn = document.getElementById('resetPomodoro');

        if (!mainControls) return;

        toggleBtn.textContent = state.pomodoro.isRunning ? 'Pause' : 'Start';
        resetBtn.style.display = state.pomodoro.hasStarted ? 'inline-block' : 'none';
        mainControls.style.display = state.pomodoro.alarmPlaying ? 'none' : 'flex';
        alarmControls.style.display = state.pomodoro.alarmPlaying ? 'flex' : 'none';
    }

    function updateTimerUI() {
        const mainControls = document.getElementById('timer-main-controls');
        const alarmControls = document.getElementById('timerAlarmControls');

        if (!mainControls || !alarmControls) return;

        const showAlarmControls = state.timer.alarmPlaying;

        mainControls.style.display = showAlarmControls ? 'none' : 'flex';
        alarmControls.style.display = showAlarmControls ? 'flex' : 'none';
    }

    function playSound(soundFile, isTest = false) {
        if (isTest) {
            if (currentTestSound && !currentTestSound.paused) {
                currentTestSound.pause();
                currentTestSound.currentTime = 0;
            }
        }

        if (!soundFile) return null;
        const audio = new Audio(`assets/Sounds/${soundFile}`);
        audio.volume = settings.volume;
        audio.play().catch(e => {
            console.error("Error playing sound:", e);
            const failureMessage = document.getElementById('audio-failure-message');
            if (failureMessage) {
                failureMessage.classList.add('visible');
                setTimeout(() => {
                    failureMessage.classList.remove('visible');
                }, 5000);
            }
        });

        if (isTest) {
            currentTestSound = audio;
        }

        return audio;
    }

    function updateButtonStates() {
        toggleTimerBtn.textContent = state.timer.isRunning ? 'Pause' : 'Start';
        toggleStopwatchBtn.textContent = state.stopwatch.isRunning ? 'Pause' : 'Start';
    }

    function updateStopwatchInterval() {
        const hours = parseInt(stopwatchIntervalHours.value) || 0;
        const minutes = parseInt(stopwatchIntervalMinutes.value) || 0;
        const seconds = parseInt(stopwatchIntervalSeconds.value) || 0;
        state.stopwatch.intervalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    }

    function setupAllEventListeners() {
        // Timer
        toggleTimerBtn.addEventListener('click', toggleTimer);
        resetTimerBtn.addEventListener('click', resetTimer);
        intervalToggle.addEventListener('change', (e) => {
            state.timer.isInterval = e.target.checked;
            document.dispatchEvent(new CustomEvent('statechange'));
        });
        timerStyleToggle.addEventListener('change', (e) => {
            state.timer.style = e.target.checked;
            document.dispatchEvent(new CustomEvent('statechange'));
        });
        timerExpressionInput.addEventListener('blur', normalizeTimerInputs);


        document.getElementById('timerSoundSelect').addEventListener('change', (e) => {
            settings.timerSound = e.target.value;
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        document.getElementById('testTimerSoundBtn').addEventListener('click', () => {
             if (!state.timer.isMuted) {
                playSound(settings.timerSound, true);
            }
        });

        // New Timer Alarm Buttons
        const timerSnoozeBtn = document.getElementById('timerSnoozeBtn');
        if(timerSnoozeBtn) timerSnoozeBtn.addEventListener('click', snoozeTimer);

        const timerMuteBtn = document.getElementById('timerMuteBtn');
        if(timerMuteBtn) timerMuteBtn.addEventListener('click', () => {
             state.timer.isMuted = !state.timer.isMuted;
            timerMuteBtn.classList.toggle('active', state.timer.isMuted);
            if (state.timer.currentAudio) {
                state.timer.currentAudio.muted = state.timer.isMuted;
            }
        });

        const timerStopBtn = document.getElementById('timerStopBtn');
        if(timerStopBtn) timerStopBtn.addEventListener('click', restartTimer);


        // Stopwatch
        toggleStopwatchBtn.addEventListener('click', toggleStopwatch);
        resetStopwatchBtn.addEventListener('click', resetStopwatch);
        lapStopwatchBtn.addEventListener('click', lapStopwatch);
        document.getElementById('stopwatchSoundSelect').addEventListener('change', (e) => {
            settings.stopwatchSound = e.target.value;
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        stopwatchIntervalSoundToggle.addEventListener('change', (e) => {
            state.stopwatch.isIntervalSoundEnabled = e.target.checked;
            stopwatchIntervalInputs.style.display = e.target.checked ? 'flex' : 'none';
        });

        stopwatchIntervalHours.addEventListener('change', updateStopwatchInterval);
        stopwatchIntervalMinutes.addEventListener('change', updateStopwatchInterval);
        stopwatchIntervalSeconds.addEventListener('change', updateStopwatchInterval);

        document.getElementById('testStopwatchSoundBtn').addEventListener('click', () => {
            if (!state.stopwatch.isMuted) {
                playSound(settings.stopwatchSound, true);
            }
        });
        lapTimesContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('lap-label-input')) {
                const index = parseInt(e.target.dataset.index);
                const arrayIndex = state.stopwatch.laps.length - 1 - index;
                state.stopwatch.laps[arrayIndex].label = e.target.value;
                document.dispatchEvent(new CustomEvent('statechange'));
            }
        });

        // Pomodoro
        togglePomodoroBtn.addEventListener('click', togglePomodoro);
        resetPomodoroBtn.addEventListener('click', resetPomodoro);
        mutePomodoroBtn.addEventListener('click', mutePomodoroAudio);
        snoozePomodoroBtn.addEventListener('click', snoozePomodoro);
        nextCyclePomodoroBtn.addEventListener('click', endCycle);

        // Live settings updates
        workDurationInput.addEventListener('change', () => {
            state.pomodoro.workDuration = parseInt(workDurationInput.value) || 25;
            resetPomodoro();
            document.dispatchEvent(new CustomEvent('statechange'));
        });
        shortBreakDurationInput.addEventListener('change', () => {
            state.pomodoro.shortBreakDuration = parseInt(shortBreakDurationInput.value) || 5;
            resetPomodoro();
            document.dispatchEvent(new CustomEvent('statechange'));
        });
        longBreakDurationInput.addEventListener('change', () => {
            state.pomodoro.longBreakDuration = parseInt(longBreakDurationInput.value) || 15;
            resetPomodoro();
            document.dispatchEvent(new CustomEvent('statechange'));
        });
        continuousToggleInput.addEventListener('change', () => {
            state.pomodoro.continuous = continuousToggleInput.checked;
            document.dispatchEvent(new CustomEvent('statechange'));
        });
    }


    // --- Public API ---
    return {
        init: function(appSettings, initialState) {
            settings = appSettings;

            if (initialState) {
                if (initialState.timer) {
                    Object.assign(state.timer, initialState.timer);
                    state.timer.isRunning = false;
                }
                if (initialState.pomodoro) {
                    Object.assign(state.pomodoro, initialState.pomodoro);
                    state.pomodoro.isRunning = false;
                    state.pomodoro.alarmPlaying = false;
                }
                if (initialState.stopwatch) {
                    Object.assign(state.stopwatch, initialState.stopwatch);
                    state.stopwatch.isRunning = false;
                }
            }
            intervalToggle.checked = state.timer.isInterval;
            timerStyleToggle.checked = state.timer.style;
            document.getElementById('timerSoundSelect').value = settings.timerSound;
            document.getElementById('stopwatchSoundSelect').value = settings.stopwatchSound;

            workDurationInput.value = state.pomodoro.workDuration;
            shortBreakDurationInput.value = state.pomodoro.shortBreakDuration;
            longBreakDurationInput.value = state.pomodoro.longBreakDuration;
            continuousToggleInput.checked = state.pomodoro.continuous;

            setupAllEventListeners();
            updateLapDisplay();
            updateButtonStates();
            updatePomodoroDashboard();
            updatePomodoroUI();
            updateTimerUI();
        },
        update: function(deltaTime) {
            if (state.timer.isRunning) {
                state.timer.remainingSeconds -= deltaTime;
                if (state.timer.remainingSeconds <= 0) {
                    timerFinished();
                }

                timerDisplay.textContent = formatSecondsToDDHHMMSS(state.timer.remainingSeconds);

                const timeInputs = document.querySelector('.time-inputs');
                if (timeInputs) {
                    if (state.timer.isSnoozing && !timeInputs.classList.contains('snoozed')) {
                        timeInputs.classList.add('snoozed');
                    } else if (!state.timer.isSnoozing && timeInputs.classList.contains('snoozed')) {
                        timeInputs.classList.remove('snoozed');
                    }
                }
                if (
                    Math.floor(state.timer.remainingSeconds) === 58 &&
                    !state.timer.endOfCycleSoundPlayed
                ) {
                    if (state.timer.currentAudio) {
                        state.timer.currentAudio.pause();
                    }
                    if (!state.timer.isMuted) {
                        const audio = playSound(settings.timerSound);
                        if (audio) {
                            state.timer.currentAudio = audio;
                        }
                    }
                    state.timer.endOfCycleSoundPlayed = true;
                }

                updateTimerUI();
            }
            if (state.pomodoro.isRunning && !state.pomodoro.alarmPlaying) {
                state.pomodoro.remainingSeconds -= deltaTime;

                if (
                    Math.floor(state.pomodoro.remainingSeconds) === 58 &&
                    !state.pomodoro.endOfCycleSoundPlayed
                ) {
                    let soundFile = '';
                    switch (state.pomodoro.phase) {
                        case 'work':
                            soundFile = 'work_end.mp3';
                            break;
                        case 'shortBreak':
                            soundFile = 'short_break_end.mp3';
                            break;
                        case 'longBreak':
                            soundFile = 'long_break_end.mp3';
                            break;
                    }

                    if (soundFile) {
                        if (state.pomodoro.currentAudio) {
                            state.pomodoro.currentAudio.pause();
                        }
                        const audio = playSound(soundFile);
                        if (audio) {
                            state.pomodoro.currentAudio = audio;
                            if (state.pomodoro.isMuted) {
                                audio.muted = true;
                            }
                        }
                    }
                    state.pomodoro.endOfCycleSoundPlayed = true;
                }

                const pomodoroActions = document.getElementById('pomodoroActions');
                if (state.pomodoro.remainingSeconds <= 60 && state.pomodoro.remainingSeconds >= 0) {
                    if (pomodoroActions.style.display === 'none') {
                        pomodoroActions.style.display = 'flex';
                    }
                    if (!state.pomodoro.lastMinuteSoundPlayed && !state.pomodoro.endOfCycleSoundPlayed) {
                        state.pomodoro.lastMinuteSoundPlayed = true;
                    }
                } else {
                    if (pomodoroActions.style.display === 'flex') {
                        pomodoroActions.style.display = 'none';
                    }
                }

                if (state.pomodoro.remainingSeconds <= 0) {
                    state.pomodoro.isRunning = false;
                    if (state.pomodoro.continuous) {
                        startNextPomodoroPhase(true);
                    } else {
                        state.pomodoro.remainingSeconds = 0;
                        state.pomodoro.alarmPlaying = true;
                        updatePomodoroUI();
                    }
                }
            }
            updatePomodoroDashboard();
            if (state.stopwatch.isRunning) {
                state.stopwatch.elapsedTime = Date.now() - state.stopwatch.startTime;

                if (state.stopwatch.isIntervalSoundEnabled && state.stopwatch.intervalSeconds > 0) {
                    const elapsedSeconds = Math.floor(state.stopwatch.elapsedTime / 1000);
                    const currentInterval = Math.floor(elapsedSeconds / state.stopwatch.intervalSeconds);

                    if (currentInterval > state.stopwatch.lastIntervalPlayed) {
                        if (!state.stopwatch.isMuted) {
                           playSound(settings.stopwatchSound);
                        }
                        state.stopwatch.lastIntervalPlayed = currentInterval;
                    }
                }
            }
        },
        getState: function() {
            return {
                timer: { ...state.timer },
                pomodoro: { ...state.pomodoro },
                stopwatch: { ...state.stopwatch }
            };
        }
    };
})();
