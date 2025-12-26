const Clock = (function() {
    const canvas = document.getElementById('polarClockCanvas');
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');

    let settings = {};
    let globalState = {};
    let dimensions = {};
    const baseStartAngle = -Math.PI / 2;

    // Testing & New Year's Mode Variables
    let timeOffset = 0;
    const getNow = () => new Date(Date.now() + timeOffset);
    let isNewYearsMode = false;
    let savedArcVisibility = null;
    let newYearAudio = null;

    let lastNow = getNow();
    let isFirstFrameDrawn = false;
    let animationFrameId = null;
    let resetAnimations = {};
    const animationDuration = 1500; // 1.5 seconds
    let lastColorChangeMinute = -1;
    let lastFlowChangeTime = null;

    let isFlowTransitioning = false;
    let flowTransitionStartTime = 0;
    let flowTransitionDuration = 1500; // ms
    let previousColors = null;

    const hasCompletedCycle = (unit, now, lastNow) => {
        // Prevent false positives when time traveling/warping
        if (Math.abs(now.getTime() - lastNow.getTime()) > 5000) {
            return false;
        }

        switch (unit) {
            case 'seconds':
                return lastNow.getSeconds() === 59 && now.getSeconds() === 0;
            case 'minutes':
                return lastNow.getMinutes() === 59 && now.getMinutes() === 0;
            case 'hours':
                if (settings.is24HourFormat) {
                    return lastNow.getHours() === 23 && now.getHours() === 0;
                } else {
                    // This handles the 12-hour cycle (e.g., 11 AM -> 12 PM or 11 PM -> 12 AM)
                    const lastHour12 = lastNow.getHours() % 12;
                    const nowHour12 = now.getHours() % 12;
                    // Rollover happens when last hour was 11 and current is 0 (midnight/noon)
                    return lastHour12 === 11 && nowHour12 === 0;
                }
            case 'day':
                return now.getDate() === 1 && lastNow.getDate() > 1;
            case 'month':
                return now.getMonth() === 0 && lastNow.getMonth() === 11;
            case 'dayOfWeek':
                return getDayOfWeek(now) === 1 && getDayOfWeek(lastNow) === 7;
            case 'weekOfYear':
                return getWeekOfYear(now) === 1 && getWeekOfYear(lastNow) > 1;
            default:
                return false;
        }
    };

    const drawTimer = () => {
        if (!settings.currentColors || !globalState.timer) {
            return;
        }

        const { remainingSeconds, totalSeconds } = globalState.timer;

        if (totalSeconds === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const remaining = Math.max(0, remainingSeconds);

        // Decompose time into all units
        const years = Math.floor(remaining / 31536000);
        const months = Math.floor((remaining % 31536000) / 2592000);
        const weeks = Math.floor((remaining % 2592000) / 604800);
        const days = Math.floor((remaining % 604800) / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);

        // Define arcs to show based on total duration
        const arcsToShow = [];
        if (totalSeconds >= 31536000) arcsToShow.push('year');
        if (totalSeconds >= 2592000) arcsToShow.push('month');
        if (totalSeconds >= 604800) arcsToShow.push('weekOfYear'); // weeks
        if (totalSeconds >= 86400) arcsToShow.push('day');
        if (totalSeconds >= 3600) arcsToShow.push('hours');
        if (totalSeconds >= 60) arcsToShow.push('minutes');
        arcsToShow.push('seconds');

        const drawnArcs = [];
        const largestUnit = arcsToShow[0];

        if (globalState.timer.style) {
            // --- STYLE ON (Smooth Countdown) ---
            arcsToShow.forEach(unit => {
                let progress;
                let text;

                if (unit === largestUnit) {
                    progress = remaining / totalSeconds;
                } else {
                    switch (unit) {
                        case 'month':
                            progress = (remaining % 31536000) / 31536000; // progress in year
                            break;
                        case 'weekOfYear':
                            progress = (remaining % 2592000) / 2592000; // progress in month
                            break;
                        case 'day':
                            progress = (remaining % 604800) / 604800; // progress in week
                            break;
                        case 'hours':
                            progress = (remaining % 86400) / 86400; // progress in day
                            break;
                        case 'minutes':
                            progress = (remaining % 3600) / 3600; // progress in hour
                            break;
                        case 'seconds':
                            progress = (remaining % 60) / 60; // progress in minute
                            break;
                        default:
                            progress = 0;
                    }
                }

                switch (unit) {
                    case 'year': text = years.toString(); break;
                    case 'month': text = months.toString(); break;
                    case 'weekOfYear': text = weeks.toString(); break;
                    case 'day': text = days.toString(); break;
                    case 'hours': text = hours.toString().padStart(2, '0'); break;
                    case 'minutes': text = minutes.toString().padStart(2, '0'); break;
                    case 'seconds': text = Math.floor(remaining % 60).toString().padStart(2, '0'); break;
                }

                drawnArcs.push({
                    key: unit,
                    radius: dimensions[`${unit}Radius`],
                    colors: settings.currentColors[unit],
                    lineWidth: dimensions[`${unit}LineWidth`],
                    startAngle: baseStartAngle,
                    endAngle: baseStartAngle + (progress * Math.PI * 2),
                    text: text
                });
            });
        } else {
            // --- STYLE OFF (Absolute Cycles but Smoothed) ---
            const initialTotalYears = Math.ceil(totalSeconds / 31536000);

            arcsToShow.forEach(unit => {
                let progress;
                let text;

                // This logic mirrors the 'smooth' style to prevent jerky, second-by-second updates.
                // The key difference for this mode is how the largest unit is handled (total progress vs. cycle).
                switch (unit) {
                    case 'year':
                        // The largest unit still shows overall progress relative to its initial total.
                        progress = initialTotalYears > 0 ? (remaining / 31536000) / initialTotalYears : 0;
                        text = years.toString();
                        break;
                    case 'month':
                        progress = (remaining % 31536000) / 31536000; // Smooth progress over a year
                        text = months.toString();
                        break;
                    case 'weekOfYear':
                        progress = (remaining % 2592000) / 2592000; // Smooth progress over a month
                        text = weeks.toString();
                        break;
                    case 'day':
                        progress = (remaining % 604800) / 604800; // Smooth progress over a week
                        text = days.toString();
                        break;
                    case 'hours':
                        progress = (remaining % 86400) / 86400; // Smooth progress over a day
                        text = hours.toString().padStart(2, '0');
                        break;
                    case 'minutes':
                        progress = (remaining % 3600) / 3600; // Smooth progress over an hour
                        text = minutes.toString().padStart(2, '0');
                        break;
                    case 'seconds':
                        progress = (remaining % 60) / 60; // Smooth progress over a minute
                        text = Math.floor(remaining % 60).toString().padStart(2, '0');
                        break;
                    default:
                        progress = 0;
                        text = '0';
                }

                drawnArcs.push({
                    key: unit,
                    radius: dimensions[`${unit}Radius`],
                    colors: settings.currentColors[unit],
                    lineWidth: dimensions[`${unit}LineWidth`],
                    startAngle: baseStartAngle,
                    endAngle: baseStartAngle + (progress * Math.PI * 2),
                    text: text
                });
            });
        }

        drawnArcs.forEach(arc => {
            if (arc.radius > 0 && arc.colors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.startAngle, arc.endAngle, arc.colors, arc.lineWidth);
                drawLabel({ ...arc });
            }
        });

        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';
            drawnArcs.forEach(arc => {
                if (arc.radius > 0 && settings.separatorVisibility[arc.key]) {
                    let count = 60;
                    if (arc.key === 'hours') count = 24;
                    if (arc.key === 'day') count = 7;
                    if (arc.key === 'weekOfYear') count = Math.ceil(totalSeconds / 604800);
                    if (arc.key === 'month') count = 12;
                    if (arc.key === 'year') count = 10; // Decade separators

                    if (isRulerMode) {
                        drawRulerSeparators(arc.radius, count, arc.lineWidth);
                    } else {
                        drawSeparators(arc.radius, count, arc.lineWidth);
                    }
                }
            });
        }
    };

    const drawArc = (x, y, radius, startAngle, endAngle, color, lineWidth) => {
        if (radius <= 0) return;

        // Prevent drawing a full circle if the start and end angles are effectively the same
        if (Math.abs(endAngle - startAngle) < 0.0001) return;

        ctx.save(); // Save the current state

        let strokeStyle = color;

        if (settings.colorPreset === 'Candy') {
            const innerRadius = radius - lineWidth / 2;
            const outerRadius = radius + lineWidth / 2;
            const gradient = ctx.createLinearGradient(x - innerRadius, y - innerRadius, x + outerRadius, y + outerRadius);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            strokeStyle = gradient;
        } else if (settings.colorPreset === 'Neon') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
        }

        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        ctx.restore(); // Restore the state to remove shadow effects for subsequent draws
    };

    const drawLabel = (arc) => {
        const textX = dimensions.centerX;
        const textY = dimensions.centerY + arc.radius;

        let fontSizeMultiplier = 0.4;
        let circleSizeMultiplier = 0.5;

        if (settings.showArcEndCircles) {
            const circleRadius = arc.lineWidth * circleSizeMultiplier;
            ctx.beginPath();
            ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${arc.lineWidth * fontSizeMultiplier}px Bahnschrift`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(arc.text, textX, textY);
        }
    };

    const drawSeparators = (radius, count, arcLineWidth) => {
        if (!radius || radius <= 0) return;

        const innerRadius = radius - (arcLineWidth / 2);
        const outerRadius = radius + (arcLineWidth / 2);
        const sixOClockAngle = baseStartAngle + Math.PI;

        ctx.strokeStyle = '#121212'; // Background color for "cutout" effect
        ctx.lineWidth = 2; // Separator line width

        const divisions = (count === 60) ? 12 : count;
        const step = (count === 60) ? 5 : 1;

        for (let i = 0; i < divisions; i++) {
            const index = i * step;
            const angle = baseStartAngle + (index / count) * Math.PI * 2;

          

            const startX = dimensions.centerX + Math.cos(angle) * innerRadius;
            const startY = dimensions.centerY + Math.sin(angle) * innerRadius;
            const endX = dimensions.centerX + Math.cos(angle) * outerRadius;
            const endY = dimensions.centerY + Math.sin(angle) * outerRadius;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    };

    const drawRulerSeparators = (radius, count, arcLineWidth) => {
        if (!radius || radius <= 0) return;

        const centerlineRadius = radius;
        const fullInnerRadius = radius - (arcLineWidth / 2);
        const fullOuterRadius = radius + (arcLineWidth / 2);
        const sixOClockAngle = baseStartAngle + Math.PI;

        ctx.strokeStyle = '#121212'; // Background color for "cutout" effect

        for (let i = 0; i < count; i++) {
            const angle = baseStartAngle + (i / count) * Math.PI * 2;


            const isMajorTick = i % 5 === 0;

            // For minor ticks, start from the centerline. For major ticks, use the full inner radius.
            const innerRadius = isMajorTick ? fullInnerRadius : centerlineRadius;
            // All ticks extend to the full outer radius.
            const outerRadius = fullOuterRadius;

            ctx.lineWidth = isMajorTick ? 2.5 : 1.5;

            const startX = dimensions.centerX + Math.cos(angle) * innerRadius;
            const startY = dimensions.centerY + Math.sin(angle) * innerRadius;
            const endX = dimensions.centerX + Math.cos(angle) * outerRadius;
            const endY = dimensions.centerY + Math.sin(angle) * outerRadius;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    };

    const drawAdvancedRulerSeparators = (radius, majorDivisions, minorDivisions, arcLineWidth, arcKey) => {
        if (!radius || radius <= 0) return;

        const centerlineRadius = radius;
        const fullOuterRadius = radius + (arcLineWidth / 2);

        ctx.strokeStyle = '#121212';

        for (let i = 0; i < majorDivisions; i++) {
            for (let j = 1; j < minorDivisions; j++) {
                const angle = baseStartAngle + ((i + j / minorDivisions) / majorDivisions) * Math.PI * 2;

                let lineWidth = 1.5; // Default minor tick width
                if (arcKey === 'hours' && j === minorDivisions / 2) {
                    lineWidth = 2.0; // Thicker half-hour marker
                }

                ctx.lineWidth = lineWidth;

                const startX = dimensions.centerX + Math.cos(angle) * centerlineRadius;
                const startY = dimensions.centerY + Math.sin(angle) * centerlineRadius;
                const endX = dimensions.centerX + Math.cos(angle) * fullOuterRadius;
                const endY = dimensions.centerY + Math.sin(angle) * fullOuterRadius;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getDayOfWeek = (date) => {
        // Monday is 1, Sunday is 7
        const day = date.getDay();
        return day === 0 ? 7 : day;
    };

    const getTotalWeeksInYear = (year) => {
        // ISO 8601 defines Dec 28th as always being in the last week of the year.
        return getWeekOfYear(new Date(year, 11, 28));
    };

    const getWeekOfYear = (date) => {
        // ISO 8601 week number calculation.
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

        // Visual Fix: If it's December and we got Week 1, it means we rolled over.
        // Force it to be the last week of the current year for visual consistency.
        if (date.getMonth() === 11 && weekNo === 1) {
            return getTotalWeeksInYear(date.getFullYear());
        }

        return weekNo;
    };

    const getLabelText = (unit, now) => {
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds(), milliseconds = now.getMilliseconds();
        const daysInMonth = getDaysInMonth(year, month);
        const dayOfWeek = getDayOfWeek(now);
        const weekOfYear = getWeekOfYear(now);
        const totalWeeks = getTotalWeeksInYear(year);
        const displayMode = (settings.inverseMode && globalState.mode === 'clock') ? 'remainder' : 'standard';

        switch (displayMode) {
            case 'remainder':
                if (unit === 'seconds') return 59 - seconds;
                if (unit === 'minutes') return 59 - minutes;
                if (unit === 'hours') return 11 - (hours % 12);
                if (unit === 'day') return daysInMonth - date;
                if (unit === 'month') return 11 - month;
                if (unit === 'dayOfWeek') return 7 - dayOfWeek;
                if (unit === 'weekOfYear') return totalWeeks - weekOfYear;
                return '';
            default: // standard
                if (unit === 'seconds') return seconds.toString().padStart(2, '0');
                if (unit === 'minutes') return minutes.toString().padStart(2, '0');
                if (unit === 'hours') {
                    if (settings.is24HourFormat) {
                        return hours.toString().padStart(2, '0');
                    } else {
                        return (hours % 12 || 12).toString();
                    }
                }
                if (unit === 'day') return date.toString();
                if (unit === 'month') return (month + 1).toString().padStart(2, '0');
                if (unit === 'dayOfWeek') return dayOfWeek.toString();
                if (unit === 'weekOfYear') return weekOfYear.toString();
                return '';
        }
    };

    const shouldShowAnticipationArc = (arcKey, now) => {
        const s = now.getSeconds();
        const m = now.getMinutes();
        const h = now.getHours();
        const d = now.getDate();
        const month = now.getMonth();
        const year = now.getFullYear();
        const daysInMonth = getDaysInMonth(year, month);
        const dayOfWeek = getDayOfWeek(now); // 1-7, Sunday is 7

        switch (arcKey) {
            case 'seconds':
                return s === 59;
            case 'minutes':
                return m === 59 && s === 59;
            case 'hours':
                const isLastHour = settings.is24HourFormat ? (h === 23) : (h === 11 || h === 23);
                return isLastHour && m === 59 && s === 59;
            case 'day':
                return d === daysInMonth && h === 23 && m === 59 && s === 59;
            case 'dayOfWeek':
                return dayOfWeek === 7 && h === 23 && m === 59 && s === 59;
            case 'month':
                return month === 11 && d === 31 && h === 23 && m === 59 && s === 59;
            case 'weekOfYear':
                // The week of year arc completes at the very end of the year.
                // This coincides with the end of the month arc for December.
                return month === 11 && d === 31 && h === 23 && m === 59 && s === 59;
            default:
                return false;
        }
    };

    const startNewYearsMode = (offsetSeconds) => {
        if (isNewYearsMode) return;
        isNewYearsMode = true;

        // 1. Force all arcs visible
        savedArcVisibility = { ...settings.arcVisibility };
        Object.keys(settings.arcVisibility).forEach(key => {
            settings.arcVisibility[key] = true;
        });

        // 2. Trigger resize to accommodate all arcs
        publicInterface.resize();

        // 3. Play Audio
        if (!newYearAudio) {
            newYearAudio = new Audio('assets/Sounds/Auld_Lang_Syne-Maeve_Lander.mp3');
            newYearAudio.volume = 1.0; // Independent volume, max
        }

        // Try to sync: start time was 1:45 (105s) before midnight.
        // offsetSeconds is how many seconds *past* 23:58:15 we are.
        if (offsetSeconds >= 0) {
             newYearAudio.currentTime = offsetSeconds;
        }

        newYearAudio.play().catch(e => console.error("New Year Audio Autoplay prevented:", e));
    };

    const endNewYearsMode = () => {
        if (!isNewYearsMode) return;
        isNewYearsMode = false;

        // 1. Restore visibility
        if (savedArcVisibility) {
            settings.arcVisibility = { ...savedArcVisibility };
            savedArcVisibility = null;
        }

        // 2. Stop Audio
        if (newYearAudio) {
            newYearAudio.pause();
            newYearAudio.currentTime = 0;
            newYearAudio = null;
        }

        // 3. Resize back
        publicInterface.resize();
    };

    const checkForSpecialEvents = (now) => {
        // Target: Dec 31st 23:58:15
        const month = now.getMonth(); // 0-11
        const date = now.getDate();
        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();

        // Check window: Dec 31 23:58:15 -> Jan 1 00:05:00
        // Simplest check: is it Dec 31st and time >= 23:58:15?
        const isDec31 = (month === 11 && date === 31);
        const isJan1 = (month === 0 && date === 1);

        if (isDec31) {
            // Check start time
            const totalSecondsToday = h * 3600 + m * 60 + s;
            const targetSeconds = 23 * 3600 + 58 * 60 + 15; // 23:58:15

            if (totalSecondsToday >= targetSeconds) {
                const diff = totalSecondsToday - targetSeconds;
                // If song hasn't finished (approx 4 mins?), keep mode on.
                // Or use a hard limit like midnight + 5 mins.
                startNewYearsMode(diff);
            }
        } else if (isJan1) {
            // Allow mode to continue a bit into the new year
            if (h === 0 && m < 5) {
                // Determine offset? It's past the start, so we just ensure mode is on.
                // We don't really need exact sync here if it's already playing,
                // but if someone opens app now, we might want to skip into song?
                // Song started 105 seconds before midnight.
                // Seconds since midnight + 105.
                const secondsSinceMidnight = m * 60 + s;
                startNewYearsMode(105 + secondsSinceMidnight);
            } else {
                endNewYearsMode();
            }
        } else {
            endNewYearsMode();
        }

        // Also ensure we stop if audio ends naturally
        if (newYearAudio && newYearAudio.ended) {
            endNewYearsMode();
        }
    };

    const drawClock = () => {
        if (!settings.currentColors || !globalState.timer) {
            return;
        }

        const now = getNow();
        const nowMs = now.getTime();

        checkForSpecialEvents(now);

        // --- Flow Mode Logic ---
        if (settings.flowMode && settings.flowMode !== '0') {
            const flowValue = parseInt(settings.flowMode, 10);
            let trigger = false;

            if (flowValue === 33) { // BSG case (interval-based)
                if (lastFlowChangeTime === null) {
                    lastFlowChangeTime = nowMs;
                }
                const flowInterval = flowValue * 60 * 1000;
                if (nowMs - lastFlowChangeTime >= flowInterval) {
                    trigger = true;
                    lastFlowChangeTime = nowMs;
                }
            } else { // Scheduled intervals (on the minute/hour)
                lastFlowChangeTime = null;
                const s = now.getSeconds();
                const m = now.getMinutes();
                const h = now.getHours();

                if (s === 0) {
                    if (flowValue === 1 && m !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 5 && m % 5 === 0 && m !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 10 && m % 10 === 0 && m !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 15 && m % 15 === 0 && m !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 30 && m % 30 === 0 && m !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 60 && m === 0 && h !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 360 && m === 0 && h % 6 === 0 && h !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 720 && m === 0 && h % 12 === 0 && h !== lastColorChangeMinute) trigger = true;
                    else if (flowValue === 1440 && m === 0 && h === 0 && now.getDate() !== lastColorChangeMinute) trigger = true;
                }

                if (trigger) {
                    if (flowValue >= 1440) lastColorChangeMinute = now.getDate();
                    else if (flowValue >= 60) lastColorChangeMinute = h;
                    else lastColorChangeMinute = m;
                }
            }

            if (trigger) {
                Settings.cycleColorPreset();
            }
        } else {
            lastFlowChangeTime = null;
            lastColorChangeMinute = -1;
        }

        // --- Transition Animation Logic ---
        if (isFlowTransitioning) {
            const elapsed = nowMs - flowTransitionStartTime;
            if (elapsed >= flowTransitionDuration) {
                isFlowTransitioning = false;
                previousColors = null;
            }
        }

        // --- Drawing Logic ---
        if (isFlowTransitioning && previousColors) {
            const progress = (nowMs - flowTransitionStartTime) / flowTransitionDuration;
            // 1. Draw the old theme fully
            drawClockArcs(now, previousColors);

            // 2. Draw the new theme on top, with a clipping mask for the wipe effect
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(dimensions.centerX, dimensions.centerY);
            ctx.arc(dimensions.centerX, dimensions.centerY, Math.max(dimensions.centerX, dimensions.centerY), baseStartAngle, baseStartAngle + (Math.PI * 2 * progress), false);
            ctx.closePath();
            ctx.clip();

            drawClockArcs(now, settings.currentColors);

            ctx.restore(); // Remove clipping mask
        } else {
            // Normal drawing
            drawClockArcs(now, settings.currentColors);
        }

        lastNow = now;
    };

    function drawClockArcs(now, colors) {
        const nowMs = now.getTime();
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds(), ms = now.getMilliseconds();
        const dayOfWeek = getDayOfWeek(now);
        const daysInMonth = getDaysInMonth(year, month);
        const weekOfYear = getWeekOfYear(now);
        const totalWeeks = getTotalWeeksInYear(year);

        const timeProgressInDay = (hours + minutes / 60 + seconds / 3600 + ms / 3600000) / 24;
        const dayOfWeekProgress = (dayOfWeek - 1 + timeProgressInDay) / 7;
        const monthProgress = (month + (date - 1 + timeProgressInDay) / daysInMonth) / 12;
        const dayProgress = (date - 1 + timeProgressInDay) / daysInMonth;
        const weekOfYearProgress = (weekOfYear - 1 + (dayOfWeek - 1 + timeProgressInDay) / 7) / totalWeeks;

        const dayOfWeekEndAngle = baseStartAngle + dayOfWeekProgress * Math.PI * 2;
        const monthEndAngle = baseStartAngle + monthProgress * Math.PI * 2;
        const dayEndAngle = baseStartAngle + dayProgress * Math.PI * 2;
        let hoursEndAngle;
        if (settings.is24HourFormat) {
            hoursEndAngle = baseStartAngle + ((hours + minutes / 60 + seconds / 3600) / 24) * Math.PI * 2;
        } else {
            const currentHour12 = hours % 12;
            hoursEndAngle = baseStartAngle + ((currentHour12 + minutes / 60 + seconds / 3600) / 12) * Math.PI * 2;
        }
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60 + ms / 60000) / 60) * Math.PI * 2;
        const secondsEndAngle = baseStartAngle + ((seconds + ms / 1000) / 60) * Math.PI * 2;
        const weekOfYearEndAngle = baseStartAngle + weekOfYearProgress * Math.PI * 2;

        const arcs = [
            { key: 'dayOfWeek', radius: dimensions.dayOfWeekRadius, color: colors.dayOfWeek, lineWidth: dimensions.dayOfWeekLineWidth, endAngle: dayOfWeekEndAngle },
            { key: 'month', radius: dimensions.monthRadius, color: colors.month, lineWidth: dimensions.monthLineWidth, endAngle: monthEndAngle },
            { key: 'day', radius: dimensions.dayRadius, color: colors.day, lineWidth: dimensions.dayLineWidth, endAngle: dayEndAngle },
            { key: 'hours', radius: dimensions.hoursRadius, color: colors.hours, lineWidth: dimensions.hoursLineWidth, endAngle: hoursEndAngle },
            { key: 'minutes', radius: dimensions.minutesRadius, color: colors.minutes, lineWidth: dimensions.minutesLineWidth, endAngle: minutesEndAngle },
            { key: 'seconds', radius: dimensions.secondsRadius, color: colors.seconds, lineWidth: dimensions.secondsLineWidth, endAngle: secondsEndAngle },
            { key: 'weekOfYear', radius: dimensions.weekOfYearRadius, color: colors.weekOfYear, lineWidth: dimensions.weekOfYearLineWidth, endAngle: weekOfYearEndAngle }
        ];

        const visibleArcs = arcs.filter(arc => settings.arcVisibility[arc.key]);

        visibleArcs.forEach(arc => {
            if (arc.radius > 0 && arc.color) {
                if (hasCompletedCycle(arc.key, now, lastNow)) {
                    if (!resetAnimations[arc.key] || !resetAnimations[arc.key].isAnimating) {
                        resetAnimations[arc.key] = { isAnimating: true, startTime: nowMs };
                    }
                }

                if (settings.inverseMode && globalState.mode === 'clock') {
                    if (shouldShowAnticipationArc(arc.key, now)) {
                        const anticipationProgress = ms / 1000;
                        const anticipationEndAngle = baseStartAngle + (anticipationProgress * Math.PI * 2);
                        drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, anticipationEndAngle, arc.color, arc.lineWidth);
                    }
                    drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.endAngle, baseStartAngle + Math.PI * 2, arc.color, arc.lineWidth);
                } else {
                    drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.color, arc.lineWidth);
                }

                const anim = resetAnimations[arc.key];
                if (anim && anim.isAnimating) {
                    if (settings.inverseMode && globalState.mode === 'clock') {
                        anim.isAnimating = false;
                    } else {
                        const elapsed = nowMs - anim.startTime;
                        if (elapsed < animationDuration) {
                            const progress = elapsed / animationDuration;
                            const animatedStartAngle = baseStartAngle + (progress * Math.PI * 2);
                            drawArc(dimensions.centerX, dimensions.centerY, arc.radius, animatedStartAngle, baseStartAngle + Math.PI * 2, arc.color, arc.lineWidth);
                        } else {
                            anim.isAnimating = false;
                        }
                    }
                }
                arc.text = getLabelText(arc.key, now);
            }
        });

        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';
            if (settings.arcVisibility.seconds && settings.separatorVisibility.seconds) {
                isRulerMode ? drawRulerSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth) : drawSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
            }
            if (settings.arcVisibility.minutes && settings.separatorVisibility.minutes) {
                isRulerMode ? drawRulerSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth) : drawSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
            }
            if (settings.arcVisibility.hours && settings.separatorVisibility.hours) {
                drawSeparators(dimensions.hoursRadius, 12, dimensions.hoursLineWidth);
                if (isRulerMode) drawAdvancedRulerSeparators(dimensions.hoursRadius, 12, 4, dimensions.hoursLineWidth, 'hours');
            }
            if (settings.arcVisibility.day && settings.separatorVisibility.day) drawSeparators(dimensions.dayRadius, daysInMonth, dimensions.dayLineWidth);
            if (settings.arcVisibility.month && settings.separatorVisibility.month) {
                drawSeparators(dimensions.monthRadius, 12, dimensions.monthLineWidth);
                if (isRulerMode) drawAdvancedRulerSeparators(dimensions.monthRadius, 12, 4, dimensions.monthLineWidth, 'month');
            }
            if (settings.arcVisibility.dayOfWeek && settings.separatorVisibility.dayOfWeek) drawSeparators(dimensions.dayOfWeekRadius, 7, dimensions.dayOfWeekLineWidth);
            if (settings.arcVisibility.weekOfYear && settings.separatorVisibility.weekOfYear) drawSeparators(dimensions.weekOfYearRadius, getTotalWeeksInYear(now.getFullYear()), dimensions.weekOfYearLineWidth);
        }

        visibleArcs.forEach(arc => {
            if (arc.radius > 0 && arc.color) {
                drawLabel(arc);
            }
        });

        if (!isFirstFrameDrawn && dimensions.secondsRadius > 0) {
            isFirstFrameDrawn = true;
            canvas.dispatchEvent(new CustomEvent('clockready', { bubbles: true }));
        }
    }

    const drawStopwatch = () => {
        if (!settings.currentColors || !globalState.stopwatch) {
            return;
        }

        const time = new Date(globalState.stopwatch.elapsedTime);
        const milliseconds = time.getUTCMilliseconds();
        const seconds = time.getUTCSeconds();
        const minutes = time.getUTCMinutes();
        const hours = time.getUTCHours();

        const secondsEndAngle = baseStartAngle + ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;

        const arcs = [
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle, text: hours.toString().padStart(2, '0') },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle, text: minutes.toString().padStart(2, '0') },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle, text: seconds.toString().padStart(2, '0') }
        ];

        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors, arc.lineWidth);
                drawLabel(arc);
            }
        });
    };

    const drawPomodoro = () => {
        if (!settings.currentColors || !globalState.pomodoro) {
            return;
        }

        const { phase, remainingSeconds } = globalState.pomodoro;

        // Determine total duration for the current phase from the state object
        const { workDuration, shortBreakDuration, longBreakDuration } = globalState.pomodoro;

        let totalDuration;
        if (phase === 'work') {
            totalDuration = workDuration * 60;
        } else if (phase === 'shortBreak') {
            totalDuration = shortBreakDuration * 60;
        } else { // longBreak
            totalDuration = longBreakDuration * 60;
        }

        // Calculate remaining time components
        const remaining = Math.max(0, remainingSeconds);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const milliseconds = (remaining - Math.floor(remaining));

        // Define arcs based on remaining time
        const arcs = [];

        // Only show hours arc if total duration is an hour or more
        if (totalDuration >= 3600) {
            const hoursProgress = (hours + (minutes / 60) + (seconds / 3600)) / 12; // Progress for a 12h clock
            const hoursEndAngle = baseStartAngle + hoursProgress * Math.PI * 2;
            arcs.push({
                key: 'hours',
                radius: dimensions.hoursRadius,
                colors: settings.currentColors.hours,
                lineWidth: dimensions.hoursLineWidth,
                startAngle: baseStartAngle,
                endAngle: hoursEndAngle,
                text: hours.toString().padStart(2, '0')
            });
        }

        const minutesProgress = (minutes + (seconds / 60) + (milliseconds / 60)) / 60;
        const minutesEndAngle = baseStartAngle + minutesProgress * Math.PI * 2;
        arcs.push({
            key: 'minutes',
            radius: dimensions.minutesRadius,
            colors: settings.currentColors.minutes,
            lineWidth: dimensions.minutesLineWidth,
            startAngle: baseStartAngle,
            endAngle: minutesEndAngle,
            text: minutes.toString().padStart(2, '0')
        });

        const secondsProgress = (seconds + milliseconds) / 60;
        const secondsEndAngle = baseStartAngle + secondsProgress * Math.PI * 2;
        arcs.push({
            key: 'seconds',
            radius: dimensions.secondsRadius,
            colors: settings.currentColors.seconds,
            lineWidth: dimensions.secondsLineWidth,
            startAngle: baseStartAngle,
            endAngle: secondsEndAngle,
            text: seconds.toString().padStart(2, '0')
        });

        // Draw the arcs and their labels
        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.startAngle, arc.endAngle, arc.colors, arc.lineWidth);
                drawLabel({ ...arc, text: arc.text });
            }
        });

        // Draw separators if enabled
        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';

            // Hour separators are always standard
            if (totalDuration >= 3600) {
                drawSeparators(dimensions.hoursRadius, 12, dimensions.hoursLineWidth);
            }

            // Apply ruler mode only to minutes and seconds
            if (isRulerMode) {
                drawRulerSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
                drawRulerSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
            } else {
                drawSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
                drawSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
            }
        }
    };

    const drawAlarmArc = () => {
        if (!globalState.trackedAlarm || !dimensions.alarmRadius || dimensions.alarmRadius <= 0) {
            return;
        }

        const { remaining, total } = globalState.trackedAlarm;
        // Clamp progress between 0 and 1
        const progress = Math.max(0, Math.min(1, (total - remaining) / total));

        // Start from the top and go clockwise
        const endAngle = baseStartAngle + (progress * Math.PI * 2);
        const color = '#DC143C'; // Crimson Red

        drawArc(dimensions.centerX, dimensions.centerY, dimensions.alarmRadius, baseStartAngle, endAngle, color, dimensions.alarmLineWidth);
    }

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (globalState.mode === 'pomodoro') {
            drawPomodoro();
        } else if (globalState.mode === 'stopwatch') {
            drawStopwatch();
        } else if (globalState.mode === 'timer') {
            drawTimer();
        } else {
            drawClock();
        }
        drawAlarmArc();
        animationFrameId = requestAnimationFrame(animate);
    };

    const calculateMinSize = () => {
        // Calculate minimal size based on visible arcs
        // Base formula: (InnerBuffer + (NumArcs * (LineWidth + Gap))) * 2
        // We can approximate or reuse the logic from resize()

        // Let's reverse engineer the minimum radius.
        // The innermost arc needs a radius > 0.
        // In resize(), radius = currentRadius - (lineWidth / 2).
        // currentRadius starts at (BaseRadius + TotalHeight) / 2.

        // Simplified approach: Count visible arcs.
        // Each arc needs approx 10% of base radius (very rough).
        // A safer bet is a hard minimum pixels per arc.

        const arcOrder = ['alarm', 'weekOfYear', 'seconds', 'minutes', 'hours', 'day', 'month', 'dayOfWeek', 'year'];
        let visibleCount = 0;

        const isArcVisible = (arcKey) => {
             if (arcKey === 'alarm') return true;
             if (globalState.mode === 'timer' && globalState.timer) {
                 // Simplified visibility check for timer mode for min size calc
                 const { totalSeconds } = globalState.timer;
                 if (totalSeconds === 0) return false;
                 // (Reuse visibility logic or just assume max for safety?)
                 // Let's assume standard clock mode for the "safe" minimum,
                 // as timer mode usually has fewer arcs.
                 return false;
             }
             return settings.arcVisibility[arcKey];
        };

        arcOrder.forEach(key => {
            if (isArcVisible(key)) visibleCount++;
        });

        // Heuristic: 25px per arc ring (width + gap) * 2 (both sides) + 50px inner hole
        return (visibleCount * 50) + 100;
    };

    const applyClockSize = () => {
        const wrapper = document.querySelector('.clock-square-wrapper');
        if (!wrapper) return;

        // Base size is relative to the viewport's smallest dimension (to fit in screen)
        const viewportMin = Math.min(window.innerWidth, window.innerHeight);
        const scale = (settings.clockScale !== undefined ? settings.clockScale : 95) / 100;

        // Calculate target size based on percentage of viewport
        let targetSize = viewportMin * scale;

        // Enforce Min Size constraint (visibility)
        const minSize = calculateMinSize();
        if (targetSize < minSize) {
            targetSize = minSize;
        }

        // Apply size
        wrapper.style.width = `${targetSize}px`;
        wrapper.style.height = `${targetSize}px`;

        // Reset CSS resize props if they were somehow left over
        wrapper.style.resize = '';
        wrapper.style.overflow = '';
        wrapper.style.maxWidth = 'none';
        wrapper.style.maxHeight = 'none';

        // Trigger internal resize logic to update canvas
        publicInterface.resize();
    };

    const publicInterface = {
        init: function(initialSettings, initialState) {
            settings = initialSettings;
            globalState = initialState;

            // Standard window resize listener
            window.addEventListener('resize', () => {
                 applyClockSize();
            });

            document.addEventListener('flow-theme-changed', (e) => {
                previousColors = e.detail.oldColors;
                isFlowTransitioning = true;
                flowTransitionStartTime = Date.now();
            });

            // Listen for slider changes
            document.addEventListener('settings-requires-resize', () => {
                 applyClockSize();
            });

            // Initial application
            applyClockSize();

            this.resume();
        },
        simulateNewYear: function() {
             // Set time to Dec 31st, 23:58:10 (5 seconds before trigger)
             const now = new Date();
             const target = new Date(now.getFullYear(), 11, 31, 23, 58, 10);
             timeOffset = target.getTime() - now.getTime();
             console.log("Time Travel Enabled: Simulating New Year's Eve (Dec 31 23:58:10)");
             // Reset lastNow to avoid jump artifacts
             lastNow = getNow();
        },
        pause: function() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },
        resume: function() {
            if (!animationFrameId) {
                lastNow = getNow();
                animate();
            }
        },
        resize: function() {
            if (!canvas) return;

            const dpr = window.devicePixelRatio || 1;
            const cssWidth = canvas.offsetWidth;
            const cssHeight = canvas.offsetHeight;

            canvas.width = cssWidth * dpr;
            canvas.height = cssHeight * dpr;

            // Reset transform and then scale
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Use the CSS dimensions for layout calculations
            dimensions.centerX = cssWidth / 2;
            dimensions.centerY = cssHeight / 2;


            const baseRadius = Math.min(dimensions.centerX, dimensions.centerY) * 0.9;
            const renderedLineWidth = (6 / 57) * baseRadius;
            const thinnerLineWidth = renderedLineWidth * 0.5;
            const renderedGap = (1.875 / 57) * baseRadius;

            const arcOrder = ['alarm', 'weekOfYear', 'seconds', 'minutes', 'hours', 'day', 'month', 'dayOfWeek', 'year'];
            const arcLineWidths = {
                day: renderedLineWidth,
                hours: renderedLineWidth,
                minutes: renderedLineWidth,
                seconds: renderedLineWidth,
                dayOfWeek: thinnerLineWidth,
                month: renderedLineWidth,
                weekOfYear: thinnerLineWidth,
                year: thinnerLineWidth,
                alarm: thinnerLineWidth * 0.75 // Extra thin
            };

            const isArcVisible = (arcKey) => {
                // The alarm arc's visibility is for layout calculation only.
                // It's drawn based on state, not settings.
                if (arcKey === 'alarm') return true;

                if (globalState.mode === 'timer' && globalState.timer) {
                    const { totalSeconds } = globalState.timer;
                    if (totalSeconds === 0) return false;
                    switch (arcKey) {
                        case 'year':
                            return totalSeconds >= 31536000; // 365 days
                        case 'month':
                            return totalSeconds >= 2592000; // 30 days
                        case 'weekOfYear': // Hijacking for 'weeks' in timer mode
                            return totalSeconds >= 604800;
                        case 'day':
                            return totalSeconds >= 86400;
                        case 'hours':
                            return totalSeconds >= 3600;
                        case 'minutes':
                            return totalSeconds >= 60;
                        case 'seconds':
                            return totalSeconds > 0;
                        default:
                            return false; // Do not show other arcs in timer mode
                    }
                } else {
                    // Clock mode
                    return settings.arcVisibility[arcKey];
                }
            };

            const visibleArcs = arcOrder.filter(isArcVisible);
            const numVisible = visibleArcs.length;
            const totalArcWidth = visibleArcs.reduce((total, arcKey) => total + (arcLineWidths[arcKey] || 0), 0);
            const totalGap = (numVisible > 0) ? (numVisible - 1) * renderedGap : 0;
            const totalHeight = totalArcWidth + totalGap;

            let currentRadius = (baseRadius + totalHeight) / 2;

            for (const arcKey of arcOrder) {
                if (isArcVisible(arcKey)) {
                    const lineWidth = arcLineWidths[arcKey];
                    dimensions[`${arcKey}LineWidth`] = lineWidth;
                    dimensions[`${arcKey}Radius`] = currentRadius - (lineWidth / 2);
                    currentRadius -= (lineWidth + renderedGap);
                } else {
                    dimensions[`${arcKey}Radius`] = 0;
                }
            }
        },
        update: function(newSettings, newState) {
            settings = newSettings;
            globalState = newState;
            this.resume();
        }
    };

    return publicInterface;
})();
