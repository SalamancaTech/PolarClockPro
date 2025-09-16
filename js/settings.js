const Settings = (function() {
    const arcKeys = ['dayOfWeek', 'month', 'day', 'hours', 'minutes', 'seconds', 'weekOfYear'];

    const colorThemes = {
      "Default": {
        "dayOfWeek": "#e03a3e",
        "month": "#f5821f",
        "day": "#fdb827",
        "hours": "#61bb46",
        "minutes": "#009ddc",
        "seconds": "#963d97",
        "weekOfYear": "#ffffff"
      },
      "Neon": {
        "dayOfWeek": "#ff9900",
        "month": "#ff0000",
        "day": "#9900ff",
        "hours": "#00ff00",
        "minutes": "#ff00ff",
        "seconds": "#ffff00",
        "weekOfYear": "#00ffff"
      },
      "Pastel": {
        "dayOfWeek": "#ff80ff",
        "month": "#8080ff",
        "day": "#80ffff",
        "hours": "#80ffc0",
        "minutes": "#ffff80",
        "seconds": "#ffc080",
        "weekOfYear": "#ff8080"
      },
      "Colorblind": {
        "dayOfWeek": "#d55e00",
        "month": "#56b4e9",
        "day": "#f0e442",
        "hours": "#0072b2",
        "minutes": "#009e73",
        "seconds": "#e69f00",
        "weekOfYear": "#cc79a7"
      },
      "Candy": {
        "dayOfWeek": "#ffd700",
        "month": "#ffc0cb",
        "day": "#ff4500",
        "hours": "#00bfff",
        "minutes": "#8a2be2",
        "seconds": "#ff1493",
        "weekOfYear": "#9acd32"
      },
      "Greyscale": {
        "dayOfWeek": "#666666",
        "month": "#777777",
        "day": "#888888",
        "hours": "#999999",
        "minutes": "#aaaaaa",
        "seconds": "#bbbbbb",
        "weekOfYear": "#dddddd"
      },
      "Sunrise": {
        "dayOfWeek": "#fcd116",
        "month": "#ffd700",
        "day": "#ff8c00",
        "hours": "#ff5733",
        "minutes": "#ffb6c1",
        "seconds": "#e34234",
        "weekOfYear": "#f08080"
      },
      "Sunset": {
        "dayOfWeek": "#ff007f",
        "month": "#fd1d53",
        "day": "#ff5733",
        "hours": "#ffb400",
        "minutes": "#ff8c00",
        "seconds": "#e34234",
        "weekOfYear": "#ff6700"
      },
      "Red": { "dayOfWeek": "#ff6666", "month": "#ff3333", "day": "#ff0000", "hours": "#cc0000", "minutes": "#990000", "seconds": "#660000", "weekOfYear": "#330000" },
      "Orange": { "dayOfWeek": "#ffe6cc", "month": "#ffb366", "day": "#ff8000", "hours": "#cc6600", "minutes": "#994d00", "seconds": "#663300", "weekOfYear": "#331a00" },
      "Yellow": { "dayOfWeek": "#ffffcc", "month": "#ffff66", "day": "#ffff00", "hours": "#cccc00", "minutes": "#999900", "seconds": "#666600", "weekOfYear": "#333300" },
      "Green": { "dayOfWeek": "#ccffcc", "month": "#66ff66", "day": "#00ff00", "hours": "#00cc00", "minutes": "#009900", "seconds": "#006600", "weekOfYear": "#003300" },
      "Blue": { "dayOfWeek": "#ccccff", "month": "#6666ff", "day": "#0000ff", "hours": "#0000cc", "minutes": "#000099", "seconds": "#000066", "weekOfYear": "#000033" },
      "Purple": { "dayOfWeek": "#ffccff", "month": "#ff66ff", "day": "#ff00ff", "hours": "#cc00cc", "minutes": "#990099", "seconds": "#660066", "weekOfYear": "#330033" }
    };

    let settings = {};

    function reverseColors(colors) {
        const newColors = { ...colors };
        // Swap dayOfWeek and weekOfYear
        [newColors.dayOfWeek, newColors.weekOfYear] = [newColors.weekOfYear, newColors.dayOfWeek];
        // Swap month and seconds
        [newColors.month, newColors.seconds] = [newColors.seconds, newColors.month];
        // Swap day and minutes
        [newColors.day, newColors.minutes] = [newColors.minutes, newColors.day];
        return newColors;
    }

    function updateCurrentColors() {
        const baseColors = colorThemes[settings.colorPreset] || colorThemes.Default;
        if (settings.reverseMode) {
            settings.currentColors = reverseColors(baseColors);
        } else {
            settings.currentColors = baseColors;
        }
    }

    function saveSettings() {
        localStorage.setItem('polarClockSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('polarClockSettings');
        const defaultSettings = {
            flowMode: '0',
            showArcEndCircles: true,
            inverseMode: false,
            reverseMode: false,
            is24HourFormat: false,
            colorPreset: 'Default',
            showSeparators: true,
            separatorMode: 'standard',
            volume: 1.0,
            timerSound: 'bell01.mp3',
            stopwatchSound: 'Tick_Tock.wav',
            arcVisibility: {
                dayOfWeek: false,
                month: true,
                day: true,
                hours: true,
                minutes: true,
                seconds: true,
                weekOfYear: false
            },
            separatorVisibility: {
                dayOfWeek: true,
                month: true,
                day: true,
                hours: true,
                minutes: true,
                seconds: true,
                weekOfYear: true
            }
        };

        // A simple migration for settings that might be missing from older saves
        const loaded = JSON.parse(savedSettings || '{}');
        settings = { ...defaultSettings, ...loaded };
        if (!loaded.arcVisibility) settings.arcVisibility = defaultSettings.arcVisibility;
        if (!loaded.separatorVisibility) settings.separatorVisibility = defaultSettings.separatorVisibility;

        updateCurrentColors();

        applySettingsToUI();
    }

    function applySettingsToUI() {
        // Standard settings
        document.getElementById('format12').classList.toggle('active', !settings.is24HourFormat);
        document.getElementById('format24').classList.toggle('active', settings.is24HourFormat);
        // Update color scheme buttons
        const colorSchemeButtons = ["Default", "Neon", "Pastel", "Colorblind", "Candy", "Greyscale", "Sunrise", "Sunset"];
        colorSchemeButtons.forEach(themeName => {
            const buttonId = `preset${themeName}`;
            const button = document.getElementById(buttonId);
            if (button) {
                button.classList.toggle('active', settings.colorPreset === themeName);
            }
        });

        // Update color palette dropdown
        const paletteSelect = document.getElementById('colorPaletteSelect');
        const paletteOptions = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];
        if (paletteOptions.includes(settings.colorPreset)) {
            paletteSelect.value = settings.colorPreset;
        } else {
            paletteSelect.value = ""; // Default to "Select Palette"
        }
        document.getElementById('inverseModeToggle').checked = settings.inverseMode;
        document.getElementById('reverseToggle').checked = settings.reverseMode;
        document.getElementById('flowModeSelect').value = settings.flowMode;

        // Sound settings
        document.getElementById('volumeControl').value = settings.volume;

        // New display toggles
        document.getElementById('arcEndCirclesToggle').checked = settings.showArcEndCircles;


        // Separator settings
        document.getElementById('separatorsShow').classList.toggle('active', settings.showSeparators);
        document.getElementById('separatorsHide').classList.toggle('active', !settings.showSeparators);
        document.getElementById('modeStandardSeparators').classList.toggle('active', settings.separatorMode === 'standard');
        document.getElementById('modeRuler').classList.toggle('active', settings.separatorMode === 'ruler');

        // Per-arc visibility toggles
        arcKeys.forEach(key => {
            const toggleId = `toggleArc${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = settings.arcVisibility[key];
            }
        });

        // Per-arc separator toggles
        arcKeys.forEach(key => {
            const toggleId = `toggleSeparator${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = settings.separatorVisibility[key];
            }
        });
    }

    function setupEventListeners() {
        function createSettingUpdater(updateFunc) {
            return () => {
                updateFunc();
                saveSettings();
                applySettingsToUI();
                document.dispatchEvent(new CustomEvent('settings-changed'));
            };
        }

        document.getElementById('format12').addEventListener('click', createSettingUpdater(() => { settings.is24HourFormat = false; }));
        document.getElementById('format24').addEventListener('click', createSettingUpdater(() => { settings.is24HourFormat = true; }));

        const colorButtons = document.querySelectorAll('.color-preset-button');
        colorButtons.forEach(button => {
            button.addEventListener('click', createSettingUpdater(() => {
                const themeName = button.id.replace('preset', '');
                settings.colorPreset = themeName;
                updateCurrentColors();
            }));
        });

        document.getElementById('colorPaletteSelect').addEventListener('change', (e) => {
            const themeName = e.target.value;
            if (themeName) {
                createSettingUpdater(() => {
                    settings.colorPreset = themeName;
                    updateCurrentColors();
                })();
            }
        });

        document.getElementById('inverseModeToggle').addEventListener('change', createSettingUpdater(() => {
            settings.inverseMode = document.getElementById('inverseModeToggle').checked;
        }));

        document.getElementById('reverseToggle').addEventListener('change', createSettingUpdater(() => {
            settings.reverseMode = document.getElementById('reverseToggle').checked;
            updateCurrentColors();
        }));

        document.getElementById('flowModeSelect').addEventListener('change', createSettingUpdater(() => {
            settings.flowMode = document.getElementById('flowModeSelect').value;
        }));

        document.getElementById('arcEndCirclesToggle').addEventListener('change', createSettingUpdater(() => {
            settings.showArcEndCircles = document.getElementById('arcEndCirclesToggle').checked;
        }));

        // Sound settings
        document.getElementById('volumeControl').addEventListener('input', createSettingUpdater(() => {
            settings.volume = document.getElementById('volumeControl').value;
        }));

        document.addEventListener('settings-changed', saveSettings);

        document.getElementById('modeStandardSeparators').addEventListener('click', createSettingUpdater(() => { settings.separatorMode = 'standard'; }));
        document.getElementById('modeRuler').addEventListener('click', createSettingUpdater(() => { settings.separatorMode = 'ruler'; }));

        arcKeys.forEach(key => {
            const toggleId = `toggleArc${key.charAt(0).toUpperCase() + key.slice(1)}`;
            document.getElementById(toggleId).addEventListener('change', (e) => {
                const numVisible = Object.values(settings.arcVisibility).filter(v => v).length;
                if (!e.target.checked && numVisible <= 1) {
                    e.target.checked = true;
                    return;
                }
                settings.arcVisibility[key] = e.target.checked;
                saveSettings();
                document.dispatchEvent(new CustomEvent('settings-requires-resize'));
            });
        });

        document.getElementById('separatorsShow').addEventListener('click', createSettingUpdater(() => {
            settings.showSeparators = true;
            arcKeys.forEach(key => settings.separatorVisibility[key] = true);
        }));

        document.getElementById('separatorsHide').addEventListener('click', createSettingUpdater(() => {
            settings.showSeparators = false;
        }));

        arcKeys.forEach(key => {
            const toggleId = `toggleSeparator${key.charAt(0).toUpperCase() + key.slice(1)}`;
            document.getElementById(toggleId).addEventListener('change', (e) => {
                settings.separatorVisibility[key] = e.target.checked;
                if (e.target.checked) {
                    settings.showSeparators = true;
                } else {
                    const allSeparatorsHidden = arcKeys.every(k => !settings.separatorVisibility[k]);
                    if (allSeparatorsHidden) {
                        settings.showSeparators = false;
                    }
                }
                saveSettings();
                applySettingsToUI();
            });
        });
    }

    function cycleColorPreset() {
        // Announce the change is about to happen, sending the old colors
        document.dispatchEvent(new CustomEvent('flow-theme-changed', {
            detail: { oldColors: { ...settings.currentColors } }
        }));

        const themeNames = Object.keys(colorThemes);
        const availableThemes = themeNames.filter(name => name !== settings.colorPreset);
        const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];

        settings.colorPreset = randomTheme;
        updateCurrentColors(); // This will set settings.currentColors to the new theme

        saveSettings();
        applySettingsToUI();
        document.dispatchEvent(new CustomEvent('settings-changed'));
    }

    return {
        init: function() {
            loadSettings();
            setupEventListeners();
        },
        get: function() {
            return settings;
        },
        cycleColorPreset: cycleColorPreset
    };
})();
