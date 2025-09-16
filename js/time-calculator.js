const TimeCalculator = (function() {

    function wordsToNumbers(text) {
        const numberWords = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
            'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
        };
        const multipliers = {
            'hundred': 100, 'thousand': 1000, 'million': 1000000
        };

        const numberWordRegex = /\b((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)[\s-]*)+(?:and[\s-]*)?)+\b/gi;

        return text.replace(numberWordRegex, (match) => {
            const words = match.toLowerCase().replace(/ and /g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);

            let total = 0;
            let currentNumber = 0;

            for (const word of words) {
                if (numberWords[word] !== undefined) {
                    currentNumber += numberWords[word];
                } else if (multipliers[word] !== undefined) {
                    if (word === 'hundred') {
                        currentNumber *= multipliers[word];
                    } else {
                        total += currentNumber * multipliers[word];
                        currentNumber = 0;
                    }
                }
            }
            total += currentNumber;
            return total > 0 ? String(total) : '';
        });
    }

    function parseNaturalTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;

        const textWithNumbers = wordsToNumbers(timeStr);

        let totalSeconds = 0;
        const cleanedStr = textWithNumbers.trim().toLowerCase();

        let naturalLanguageFound = false;

        const hourMatches = cleanedStr.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|hours)/g);
        if (hourMatches) {
            naturalLanguageFound = true;
            hourMatches.forEach(match => {
                totalSeconds += parseFloat(match) * 3600;
            });
        }

        const minuteMatches = cleanedStr.match(/(\d+(?:\.\d+)?)\s*(m|min|minute|minutes)/g);
        if (minuteMatches) {
            naturalLanguageFound = true;
            minuteMatches.forEach(match => {
                totalSeconds += parseFloat(match) * 60;
            });
        }

        const secondMatches = cleanedStr.match(/(\d+(?:\.\d+)?)\s*(s|sec|second|seconds)/g);
        if (secondMatches) {
            naturalLanguageFound = true;
            secondMatches.forEach(match => {
                totalSeconds += parseFloat(match);
            });
        }

        if (naturalLanguageFound) {
            return totalSeconds;
        }

        // Fallback for colon-separated time
        const parts = cleanedStr.split(':').map(Number);
        if (!parts.some(isNaN)) {
            let seconds = 0;
            if (parts.length === 1) { // ss
                seconds = parts[0];
            } else if (parts.length === 2) { // mm:ss
                seconds = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) { // hh:mm:ss
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
             else if (parts.length === 4) { // dd:hh:mm:ss
                seconds = parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
            }
            if(seconds > 0) return seconds;
        }


        return null;
    }

    function parseHmsToSeconds(timeStr) {
        let seconds = parseNaturalTime(String(timeStr));
        if (seconds !== null) {
            return seconds;
        }

        const parts = String(timeStr).split(':').map(Number);
        if (parts.some(isNaN)) return null;

        seconds = 0;
        if (parts.length === 1) { // ss
            seconds = parts[0];
        } else if (parts.length === 2) { // mm:ss
            seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) { // hh:mm:ss
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else {
            return null; // Invalid number of parts
        }
        return seconds;
    }

    // --- Public API ---
    return {
        wordsToNumbers: wordsToNumbers,
        parseNaturalTime: parseNaturalTime,
        parseHmsToSeconds: parseHmsToSeconds
    };
})();


document.addEventListener('DOMContentLoaded', () => {

    // --- LIVE INPUT FORMATTING ---
    const durationInput = document.getElementById('duration');
    const time1Input = document.getElementById('time1');
    const operandInput = document.getElementById('operand');

    if (durationInput) {
        durationInput.addEventListener('blur', () => {
            const value = durationInput.value;
            let seconds = TimeCalculator.parseNaturalTime(value);
            if (seconds === null) {
                const parts = value.split(':');
                if (parts.length === 2) {
                    const hour = parseInt(parts[0], 10);
                    const minute = parseInt(parts[1], 10);
                    if (!isNaN(hour) && !isNaN(minute)) {
                        seconds = hour * 3600 + minute * 60;
                    }
                }
            }

            if (seconds !== null) {
                const formatted = formatSecondsToHHMM(seconds);
                if (formatted !== null) {
                    durationInput.value = formatted;
                }
            }
        });
    }

    function addFormatterListener(element) {
        if (element) {
            element.addEventListener('blur', () => {
                const value = element.value;
                const seconds = TimeCalculator.parseHmsToSeconds(value);
                if (seconds !== null) {
                    const formatted = formatSecondsToHms(seconds);
                    if (!formatted.toLowerCase().includes('error')) {
                        element.value = formatted;
                    }
                }
            });
        }
    }

    addFormatterListener(time1Input);
    addFormatterListener(operandInput);

    // --- LOGIC FOR CALCULATOR 1: ADD DURATION TO TIME ---
    const addTimeButton = document.getElementById('calcAddTime');
    const addTimeResultDiv = document.getElementById('addTimeResult');

    if (addTimeButton) {
        addTimeButton.addEventListener('click', () => {
            const start = document.getElementById('startTime').value;
            const duration = document.getElementById('duration').value;
            const startDay = document.getElementById('startDay').value;

            const result = addTime(start, duration, startDay || null);

            addTimeResultDiv.innerHTML = `Result: <span class="font-bold">${result}</span>`;
            addTimeResultDiv.classList.remove('hidden');
        });
    }


    function addTime(start, duration, startDay = null) {
        // 1. Parse Start Time
        const startParts = start.trim().split(/[\s:]+/);
        if (startParts.length < 2 || startParts.length > 3) return "Error: Invalid start time format. Use 'h:mm AM/PM'.";
        
        let hour = parseInt(startParts[0]);
        const minute = parseInt(startParts[1]);
        const meridian = startParts.length === 3 ? startParts[2].toUpperCase() : (hour >= 12 ? 'PM' : 'AM');

        if (isNaN(hour) || isNaN(minute)) return "Error: Invalid time values.";

        if (meridian === 'PM' && hour !== 12) hour += 12;
        if (meridian === 'AM' && hour === 12) hour = 0;

        // 2. Create Initial Date Object
        const initialDate = new Date();
        initialDate.setHours(hour, minute, 0, 0);
        const initialDayOfWeek = initialDate.getDay(); // Sunday is 0

        if (startDay) {
            const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            const startDayIndex = daysOfWeek.indexOf(startDay.toLowerCase());
            if (startDayIndex === -1) return "Error: Invalid day of the week.";
            
            const dayDifference = (startDayIndex - initialDayOfWeek + 7) % 7;
            initialDate.setDate(initialDate.getDate() + dayDifference);
        }
        
        const initialTimestamp = initialDate.getTime();

        // 3. Parse Duration and Calculate New Time
        let durationSeconds = TimeCalculator.parseNaturalTime(duration);

        if (durationSeconds === null) {
            // If natural time parsing fails, try the hh:mm format
            const durationParts = duration.split(':');
            if (durationParts.length === 2) {
                const durationHour = parseInt(durationParts[0], 10);
                const durationMinute = parseInt(durationParts[1], 10);

                if (!isNaN(durationHour) && !isNaN(durationMinute)) {
                    durationSeconds = (durationHour * 3600) + (durationMinute * 60);
                }
            }
        }

        if (durationSeconds === null || isNaN(durationSeconds)) {
            return "Error: Invalid duration format. Use 'hh:mm' or a natural language format (e.g., '2h 30m').";
        }

        const durationMillis = durationSeconds * 1000;
        const newTime = new Date(initialTimestamp + durationMillis);

        // 4. Calculate Days Passed
        const initialDateOnly = new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate());
        const newDateOnly = new Date(newTime.getFullYear(), newTime.getMonth(), newTime.getDate());
        const daysPassed = Math.round((newDateOnly - initialDateOnly) / (1000 * 60 * 60 * 24));

        // 5. Format Output
        let newHour = newTime.getHours();
        const newMinute = newTime.getMinutes();
        let newMeridian = 'AM';

        if (newHour >= 12) {
            newMeridian = 'PM';
            if (newHour > 12) newHour -= 12;
        }
        if (newHour === 0) newHour = 12;

        let formattedTime = `${newHour}:${newMinute.toString().padStart(2, '0')} ${newMeridian}`;

        if (startDay) {
            const finalDayName = newTime.toLocaleDateString('en-US', { weekday: 'long' });
            formattedTime += `, ${finalDayName}`;
        }

        if (daysPassed === 1) {
            formattedTime += " (next day)";
        } else if (daysPassed > 1) {
            formattedTime += ` (${daysPassed} days later)`;
        }

        return formattedTime;
    }

    // --- LOGIC FOR CALCULATOR 2: TIME ARITHMETIC ---
    const arithmeticButton = document.getElementById('calcArithmetic');
    const arithmeticResultDiv = document.getElementById('arithmeticResult');

    if (arithmeticButton) {
        arithmeticButton.addEventListener('click', () => {
            const time1 = document.getElementById('time1').value;
            const operator = document.getElementById('operator').value;
            let operand = document.getElementById('operand').value;

            if (operator === '*' || operator === '/') {
                // Process words and fractions before parsing.
                let processedOperand = operand.toLowerCase()
                    .replace(/ and a half/g, '.5')
                    .replace(/ a half/g, '.5');

                // Convert number words to digits.
                processedOperand = TimeCalculator.wordsToNumbers(processedOperand);

                // Try to parse the processed string as a float.
                const num = parseFloat(processedOperand);

                if (!isNaN(num)) {
                    operand = num;
                } else {
                    // Fallback to original behavior if parsing fails
                    const originalNum = parseFloat(operand);
                    if (!isNaN(originalNum)) {
                        operand = originalNum;
                    }
                }
            }
            
            const result = calculateTime(time1, operator, operand);

            arithmeticResultDiv.innerHTML = `Result: <span class="font-bold">${result}</span>`;
            arithmeticResultDiv.classList.remove('hidden');
        });
    }

    function formatSecondsToHHMM(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === null) return null;

        const sign = totalSeconds < 0 ? "-" : "";
        totalSeconds = Math.abs(Math.round(totalSeconds));

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function formatSecondsToHms(totalSeconds) {
        if (isNaN(totalSeconds)) return "Error: Calculation resulted in an invalid number.";
        
        const sign = totalSeconds < 0 ? "-" : "";
        totalSeconds = Math.abs(Math.round(totalSeconds));

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function calculateTime(time1, operator, operand) {
        const initialSeconds = TimeCalculator.parseHmsToSeconds(time1);
        if (initialSeconds === null) return "Error: Invalid format for initial time. Use 'hh:mm:ss'.";

        let resultSeconds;

        switch (operator) {
            case '+':
            case '-':
                const operandSeconds = TimeCalculator.parseHmsToSeconds(operand);
                if (operandSeconds === null) return "Error: Invalid format for operand time. Use 'hh:mm:ss'.";
                resultSeconds = operator === '+' ? initialSeconds + operandSeconds : initialSeconds - operandSeconds;
                break;
            case '*':
            case '/':
                if (typeof operand !== 'number') return "Error: Operand for '*' or '/' must be a number.";
                if (operator === '/' && operand === 0) return "Error: Cannot divide by zero.";
                resultSeconds = operator === '*' ? initialSeconds * operand : initialSeconds / operand;
                break;
            default:
                return "Error: Invalid operator.";
        }

        return formatSecondsToHms(resultSeconds);
    }
});
