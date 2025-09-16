document.addEventListener('DOMContentLoaded', function() {
    // This is the main application orchestrator.
    // It's responsible for initializing all the modules and passing data between them.

    // 1. Initialize Settings: Load settings from localStorage and set up event listeners for settings controls.
    Settings.init();
    let settings = Settings.get();

    // 2. Load Application State: Load tool states and other app-wide states from localStorage.
    let appState = {
        mode: 'clock', // 'clock', 'timer', 'pomodoro', 'stopwatch'
        tools: {}, // This will hold the state for timer, pomodoro, stopwatch
        alarms: [], // For advanced alarms
        trackedAlarm: null // To hold info about the currently tracked alarm
    };

    function loadAlarms() {
        const storedAlarms = localStorage.getItem('polarAlarms');
        if (storedAlarms) {
            try {
                appState.alarms = JSON.parse(storedAlarms);
            } catch (e) {
                console.error("Error parsing alarms from localStorage", e);
                appState.alarms = [];
            }
        } else {
            appState.alarms = [];
        }
    }

    const savedState = localStorage.getItem('polarClockState');
    if (savedState) {
        const loadedState = JSON.parse(savedState);
        // Safely merge the loaded state into our default structure, ensuring 'tools' is an object
        appState = { ...appState, ...loadedState };
        if (!appState.tools) {
            appState.tools = {};
        }
        appState.mode = 'clock'; // Always start in clock mode
    }

    loadAlarms(); // Initial load of alarms from their specific storage

    // 3. Initialize Modules
    // Clock module needs settings for rendering and the app state for displaying arcs.
    Clock.init(settings, appState);
    // UI module is now independent of the Clock module.
    UI.init(appState);
    // Tools module needs settings for sounds and the initial state for the tools.
    Tools.init(settings, appState.tools);

    // 4. Set up the main update loop (requestAnimationFrame)
    let lastFrameTime = 0;

    function update(timestamp) {
        const now = new Date();
        const deltaTime = (timestamp - (lastFrameTime || 0)) / 1000;
        lastFrameTime = timestamp;

        // Update the tools module (advances timers, etc.)
        Tools.update(deltaTime);

        // Get the latest state from the tools module
        const latestToolState = Tools.getState();
        // Combine it with the app-level state
        const fullState = { ...appState, ...latestToolState };

        // Update the main clock display
        Clock.update(settings, fullState);

        // Continue the loop
        requestAnimationFrame(update);
    }

    // 5. Set up global event listeners for communication between modules
    function saveAppState() {
        // Get the latest state from tools and merge it before saving
        const latestToolState = Tools.getState();
        appState.tools = latestToolState;
        localStorage.setItem('polarClockState', JSON.stringify(appState));
    }

    document.addEventListener('modechange', (e) => {
        appState.mode = e.detail.mode;
        // No need to save state on mode change, it's not critical to persist immediately
    });

    // The 'statechange' event is fired by Tools whenever its state changes
    document.addEventListener('statechange', saveAppState);

    // The 'settings-requires-resize' event is fired by Settings when a change requires a clock redraw
    document.addEventListener('settings-requires-resize', () => {
        if (Clock && typeof Clock.resize === 'function') {
            Clock.resize();
        }
    });

    // A generic event for when a setting changes that doesn't require a resize but needs to be re-fetched.
    document.addEventListener('settings-changed', () => {
        settings = Settings.get();
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'polarAlarms') {
            console.log('Alarms updated in another tab. Reloading.');
            loadAlarms();
        }
    });

    // 6. Start the application
    let lastChecked = new Date();

    function playSound(soundFile, volume = 1.0) {
        if (!soundFile) return;
        const audio = new Audio(`assets/Sounds/${soundFile}`);
        audio.volume = volume;
        audio.play().catch(e => console.error("Error playing sound:", e));
    }

    function convertTo24Hour(hour, ampm) {
        hour = parseInt(hour, 10);
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        return hour;
    }

    function getPreviousAlarmOccurrence(alarm, now) {
        const alarmHour24 = convertTo24Hour(alarm.hour, alarm.ampm);
        const alarmMinute = parseInt(alarm.minute, 10);

        let prevOccurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHour24, alarmMinute, 0, 0);

        if (alarm.days && alarm.days.length > 0) {
            if (prevOccurrence >= now) {
                prevOccurrence.setDate(prevOccurrence.getDate() - 1);
            }
            for (let i = 0; i < 7; i++) {
                if (alarm.days.includes(prevOccurrence.getDay())) {
                    return prevOccurrence;
                }
                prevOccurrence.setDate(prevOccurrence.getDate() - 1);
            }
            return null;
        } else {
            return null;
        }
    }

    function getNextAlarmOccurrence(alarm, now) {
        const alarmHour24 = convertTo24Hour(alarm.hour, alarm.ampm);
        const alarmMinute = parseInt(alarm.minute, 10);

        let nextOccurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHour24, alarmMinute, 0, 0);

        if (alarm.days && alarm.days.length > 0) {
            // If time has passed for today, start check from tomorrow
            if (nextOccurrence <= now) {
                nextOccurrence.setDate(nextOccurrence.getDate() + 1);
            }
            // Check for the next valid day
            for (let i = 0; i < 7; i++) {
                if (alarm.days.includes(nextOccurrence.getDay())) {
                    return nextOccurrence;
                }
                nextOccurrence.setDate(nextOccurrence.getDate() + 1);
            }
            return null; // Should not be reached if days are valid
        } else {
            // Non-repeating alarm
            if (alarm.isTemporary) {
                // For temporary alarms, always return the calculated time.
                // The checkAlarms function will handle whether it has already fired.
                return nextOccurrence;
            } else {
                // For other non-repeating alarms, only return future times.
                return nextOccurrence > now ? nextOccurrence : null;
            }
        }
    }

    function checkAlarms() {
        const now = new Date();

        // --- Handle ringing for any due alarms ---
        appState.alarms.forEach(alarm => {
            if (!alarm.enabled) return;

            // Find the next occurrence based on the last time we checked
            const nextOccurrence = getNextAlarmOccurrence(alarm, lastChecked);

            // If it should have fired between the last check and now, ring it
            if (nextOccurrence && nextOccurrence > lastChecked && nextOccurrence <= now) {
                console.log(`Alarm "${alarm.label}" is ringing!`);
                playSound(alarm.sound);

                if (alarm.isTemporary) {
                    alarm.enabled = false;
                    // This change needs to be persisted back to localStorage.
                    const allAlarms = JSON.parse(localStorage.getItem('polarAlarms') || '[]');
                    const alarmIndex = allAlarms.findIndex(a => a.id === alarm.id);
                    if (alarmIndex > -1) {
                        allAlarms[alarmIndex].enabled = false;
                        localStorage.setItem('polarAlarms', JSON.stringify(allAlarms));
                    }
                }
            }
        });

        // --- Handle the single tracked alarm for the UI ---
        const tracked = appState.alarms.find(a => a.isTracked && a.enabled);
        if (tracked) {
            const nextOccurrence = getNextAlarmOccurrence(tracked, now);
            if (nextOccurrence) {
                const prevOccurrence = getPreviousAlarmOccurrence(tracked, now);
                // If there's no previous occurrence (e.g., one-time alarm), default to a 24h cycle for the visual.
                const totalDuration = prevOccurrence ? nextOccurrence.getTime() - prevOccurrence.getTime() : (24 * 60 * 60 * 1000);
                const remainingMs = nextOccurrence.getTime() - now.getTime();

                // Only show the arc if the alarm is within the cycle time.
                if (remainingMs <= totalDuration) {
                    appState.trackedAlarm = {
                        remaining: remainingMs,
                        total: totalDuration
                    };
                } else {
                    appState.trackedAlarm = null;
                }
            } else {
                appState.trackedAlarm = null;
            }
        } else {
            appState.trackedAlarm = null;
        }

        lastChecked = now; // Update for the next interval
    }

    setInterval(checkAlarms, 1000);

    requestAnimationFrame(update);

    // A small delay to ensure the canvas has been sized correctly by the browser's layout engine.
    setTimeout(() => {
        if (Clock && typeof Clock.resize === 'function') {
            Clock.resize();
        }
    }, 100);
});
