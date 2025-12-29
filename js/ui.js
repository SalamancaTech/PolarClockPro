emailjs.init({ publicKey: 'sNYr9pKKXT9VzeDIE' });
const UI = (function() {
    const views = {
        about: document.getElementById('aboutView'),
    };
    const navButtons = {
        toggleControls: document.getElementById('toggleControlsBtn'),
        goToSettings: document.getElementById('goToSettingsBtn'),
        goToAbout: document.getElementById('goToAboutBtn'),
        backFromAbout: document.getElementById('backToMainFromAbout'),
    };
    const toolPanels = {
        timer: document.getElementById('timerPanel'),
        pomodoro: document.getElementById('pomodoroPanel'),
        stopwatch: document.getElementById('stopwatchPanel'),
        timeCalculator: document.getElementById('timeCalculatorPanel'),
    };
    const toolSelectMenu = document.getElementById('tool-select-menu');
    const toolSelectButtons = document.querySelectorAll('.tool-select-button');

    const pomodoroInfoModal = document.getElementById('pomodoroInfoModal');
    const pomodoroInfoBtn = document.getElementById('pomodoroInfoBtn');
    const closePomodoroInfoBtn = document.getElementById('closePomodoroInfoBtn');

    function showView(viewToShow) {
        Object.values(views).forEach(v => v.style.display = 'none');
        if (viewToShow) {
            viewToShow.style.display = 'flex';
        }
    }

    function updateToolPanelVisibility(mode) {
        const controlsContainer = document.getElementById('controlsContainer');
        const settingsPanel = document.getElementById('settings-panel');

        Object.values(toolPanels).forEach(p => p.classList.add('panel-hidden'));

        if (mode === 'clock') {
            controlsContainer.style.display = 'none';
            settingsPanel.style.display = 'none';
        } else if (mode && toolPanels[mode]) {
            controlsContainer.style.display = 'flex';
            settingsPanel.style.display = 'none';
            toolPanels[mode].classList.remove('panel-hidden');
        }
    }

    function toggleToolMenu() {
        toolSelectMenu.classList.toggle('panel-hidden');
    }

    let aboutPageInitialized = false;

    function initAboutPage() {
        if (aboutPageInitialized) return;
        aboutPageInitialized = true;

        const accordionItems = document.querySelectorAll('#aboutView .accordion-item');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                const wasActive = item.classList.contains('active');
                accordionItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.accordion-content').style.maxHeight = null;
                        otherItem.querySelector('.accordion-content').style.padding = '0 15px';
                    }
                });
                if (!wasActive) {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = '15px';
                } else {
                    content.style.maxHeight = null;
                    content.style.padding = '0 15px';
                }
            });
        });

        const contentIds = ['about', 'how-to-use', 'pomodoro', 'faq'];
        contentIds.forEach(id => {
            fetch(`assets/content/${id}.txt`)
                .then(response => response.text())
                .then(text => {
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'scrollable-content';
                    // Replace newlines with <br> for basic formatting since we are moving away from innerHTML for security
                    contentDiv.innerText = text;
                    const container = document.getElementById(`${id}-content`);
                    container.innerHTML = '';
                    container.appendChild(contentDiv);
                })
                .catch(error => console.error(`Error fetching ${id}.txt:`, error));
        });

        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            const statusMessage = document.getElementById('feedbackStatus');
            const messageTextarea = document.getElementById('feedbackMessage');
            feedbackForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const submitButton = this.querySelector('button[type="submit"]');
                statusMessage.textContent = '';
                if (messageTextarea.value.trim() === '') {
                    statusMessage.textContent = 'Message cannot be empty.';
                    statusMessage.style.color = '#F44336';
                    return;
                }
                let submissionTimestamps = JSON.parse(localStorage.getItem('feedbackSubmissions')) || [];
                submissionTimestamps = submissionTimestamps.filter(timestamp => new Date().getTime() - timestamp < 24 * 60 * 60 * 1000);
                if (submissionTimestamps.length >= 3) {
                    statusMessage.textContent = 'You have reached the submission limit for today.';
                    statusMessage.style.color = '#F44336';
                    return;
                }
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';
                emailjs.sendForm('service_hnc4xxb', 'template_5lqcgtd', this)
                    .then(() => {
                        statusMessage.textContent = 'Feedback sent successfully!';
                        statusMessage.style.color = '#4CAF50';
                        feedbackForm.reset();
                        submissionTimestamps.push(new Date().getTime());
                        localStorage.setItem('feedbackSubmissions', JSON.stringify(submissionTimestamps));
                    }, (err) => {
                        statusMessage.textContent = 'Failed to send feedback. Please try again later.';
                        statusMessage.style.color = '#F44336';
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit';
                    });
            });
        }
    }

    return {
        init: function(appState) {
            const optionsBtn = document.getElementById('optionsBtn');
            const bottomToolbar = document.getElementById('bottom-toolbar');

            if (optionsBtn && bottomToolbar) {
                optionsBtn.addEventListener('click', () => {
                    bottomToolbar.classList.toggle('visible');
                });
            }

            const controlsContainer = document.getElementById('controlsContainer');
            const settingsPanel = document.getElementById('settings-panel');

            navButtons.toggleControls.addEventListener('click', () => {
                toolSelectMenu.classList.toggle('panel-hidden');
                settingsPanel.style.display = 'none'; // Hide settings when showing tools
            });

            toolSelectButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const mode = button.dataset.mode;
                    if (mode === 'alarms') {
                        window.location.href = 'alarms.html';
                        return;
                    }
                    document.dispatchEvent(new CustomEvent('modechange', {
                        detail: { mode: mode }
                    }));
                    toolSelectMenu.classList.add('panel-hidden'); // Hide menu after selection
                });
            });

            navButtons.goToSettings.addEventListener('click', () => {
                const isSettingsVisible = settingsPanel.style.display === 'block';
                if (isSettingsVisible) {
                    settingsPanel.style.display = 'none';
                } else {
                    controlsContainer.style.display = 'none';
                    toolSelectMenu.classList.add('panel-hidden');
                    settingsPanel.style.display = 'block';
                }
            });
            navButtons.goToAbout.addEventListener('click', () => {
                showView(views.about);
                initAboutPage();
            });

            navButtons.backFromAbout.addEventListener('click', () => {
                views.about.style.display = 'none';
            });

            pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
            closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));

            document.addEventListener('modechange', (e) => {
                updateToolPanelVisibility(e.detail.mode);
            });

            // Initialize panel visibility based on the state provided by main.js
            if (appState && appState.mode) {
                updateToolPanelVisibility(appState.mode);
            } else {
                // Fallback to clock mode if no state is passed
                updateToolPanelVisibility('clock');
            }
        }
    };
})();
