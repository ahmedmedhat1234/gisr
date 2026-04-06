// ===================================================
// جِسر - تطبيق لغة الإشارة العربية المتقدم
// نسخة شاملة: تعلم + تواصل + تحدي + إحصائيات
// ===================================================

// ===== المتغيرات الأساسية =====
let camera = null, hands = null, isRunning = false;
let currentMode = 'communicate'; // learn | communicate | challenge

const video    = document.getElementById('webcam');
const canvas   = document.getElementById('canvas');
const ctx      = canvas.getContext('2d');

// ===== بيانات الحروف =====
const LETTERS = {
    'أ': { name:'ألف',  desc:'قبضة مغلقة كاملة - كل الأصابع منطوية', f:[0,0,0,0,0] },
    'ب': { name:'باء',  desc:'سبابة واحدة للأعلى فقط', f:[0,1,0,0,0] },
    'ت': { name:'تاء',  desc:'سبابة + وسطى ملتصقتان للأعلى', f:[0,1,1,0,0] },
    'ث': { name:'ثاء',  desc:'سبابة + وسطى + بنصر مستقيمة للأعلى', f:[0,1,1,1,0] },
    'ج': { name:'جيم',  desc:'أربعة أصابع بدون إبهام', f:[0,1,1,1,1] },
    'ح': { name:'حاء',  desc:'كف مفتوح كامل - كل الأصابع مستقيمة', f:[1,1,1,1,1] },
    'خ': { name:'خاء',  desc:'إبهام فقط للجانب', f:[1,0,0,0,0] },
    'د': { name:'دال',  desc:'سبابة + خنصر مرفوعان (شكل V مقلوب)', f:[0,1,0,0,1] },
    'ذ': { name:'ذال',  desc:'إبهام + سبابة + وسطى + بنصر (بدون خنصر)', f:[1,1,1,1,0] },
    'ر': { name:'راء',  desc:'خنصر فقط للأعلى', f:[0,0,0,0,1] },
    'ز': { name:'زاي',  desc:'سبابة + وسطى متباعدتان (V للنصر)', f:[0,1,1,0,0] },
    'س': { name:'سين',  desc:'إبهام + سبابة يلمسان (OK) + ثلاثة مرفوعة', f:[1,1,1,1,0] },
    'ش': { name:'شين',  desc:'سبابة + وسطى + بنصر منحنية قليلاً', f:[0,1,1,1,0] },
    'ص': { name:'صاد',  desc:'كف مفتوح مائل للأمام', f:[1,1,1,1,1] },
    'ض': { name:'ضاد',  desc:'كف مع ثني أطراف الأصابع', f:[1,1,1,1,1] },
    'ط': { name:'طاء',  desc:'كف مغلق مع رفع الإبهام لأعلى', f:[1,1,1,1,1] },
    'ظ': { name:'ظاء',  desc:'إبهام + سبابة + وسطى + بنصر مرفوعة', f:[1,1,1,1,0] },
    'ع': { name:'عين',  desc:'كف شبه مغلق على شكل قوس', f:[1,1,1,1,1] },
    'غ': { name:'غين',  desc:'سبابة للأسفل (عكس ب)', f:[0,1,0,0,0] },
    'ف': { name:'فاء',  desc:'قبضة مغلقة مع إبهام بارز', f:[1,0,0,0,0] },
    'ق': { name:'قاف',  desc:'إبهام + سبابة مرفوعان (L shape)', f:[1,1,0,0,0] },
    'ك': { name:'كاف',  desc:'إبهام + سبابة + وسطى (C shape)', f:[1,1,1,0,0] },
    'ل': { name:'لام',  desc:'إبهام + سبابة + وسطى يلمس إبهام', f:[1,1,0,0,0] },
    'م': { name:'ميم',  desc:'قرصة - كل الأصابع تلمس الإبهام', f:[1,1,1,1,0] },
    'ن': { name:'نون',  desc:'سبابة فوق الإبهام + باقي منطوية', f:[1,1,0,0,0] },
    'ه': { name:'هاء',  desc:'كف مع ثني أطراف الأصابع للداخل', f:[1,1,1,1,1] },
    'و': { name:'واو',  desc:'إبهام + خنصر مرفوعان (شاكا 🤙)', f:[1,0,0,0,1] },
    'ي': { name:'ياء',  desc:'سبابة + خنصر مرفوعان (rock sign 🤘)', f:[0,1,0,0,1] }
};

const LETTER_KEYS = Object.keys(LETTERS);
const SUPPORTED_CHARS = new Set([...LETTER_KEYS, ' ']);

const SPECIAL_GESTURE_COOLDOWN = 1400;
const SPECIAL_GESTURE_LOCK_MS = 700;

// ===== الإحصائيات =====
let stats = loadStats();
let sessionStart = null;
let sessionLetterCount = 0;

function loadStats() {
    return JSON.parse(localStorage.getItem('jisrStats') || JSON.stringify({
        totalLetters: 0,
        totalMinutes: 0,
        bestScore: 0,
        challengeHistory: [],
        letterFreq: {},
        challengeCorrect: 0,
        challengeTotal: 0,
        sessions: []
    }));
}
function saveStats() {
    localStorage.setItem('jisrStats', JSON.stringify(stats));
}

// ===== وضع التعلم =====
let learnIndex = 0;
let learnCorrectSet = new Set();
let learnWaitingConfirm = false;

function initLearnMode() {
    learnIndex = 0;
    learnCorrectSet.clear();
    updateLearnTarget();
    updateLearnProgress();
}

function updateLearnTarget() {
    const letter = LETTER_KEYS[learnIndex];
    document.getElementById('learnTarget').textContent = letter;
    document.getElementById('learnHint').textContent   = LETTERS[letter].desc;
    document.getElementById('learnFeedback').textContent = '';
}

function updateLearnProgress() {
    const pct = (learnCorrectSet.size / LETTER_KEYS.length) * 100;
    document.getElementById('learnFill').style.width = pct + '%';
    document.getElementById('learnCount').textContent = learnCorrectSet.size + '/' + LETTER_KEYS.length;
}

function handleLearnDetection(letter) {
    const target = LETTER_KEYS[learnIndex];
    const fb = document.getElementById('learnFeedback');
    const flash = document.getElementById('resultFlash');

    if (letter === target) {
        fb.textContent = '✅ ممتاز!';
        fb.style.color = '#43e97b';
        flash.className = 'cam-result-flash correct';
        learnCorrectSet.add(target);
        updateLearnProgress();
        playBeep(880);
        setTimeout(() => {
            flash.className = 'cam-result-flash';
            if (learnIndex < LETTER_KEYS.length - 1) {
                learnIndex++;
                updateLearnTarget();
            } else {
                fb.textContent = '🎉 أتقنت كل الحروف!';
            }
        }, 1200);
    }
}

// ===== وضع التحدي =====
let challengeScore  = 0;
let challengeStreak = 0;
let challengeMaxStreak = 0;
let challengeCorrect = 0;
let challengeTotal   = 0;
let challengeTimeLeft = 60;
let challengeInterval = null;
let challengeCurrentTarget = '';

function initChallengeMode() {
    challengeScore  = 0;
    challengeStreak = 0;
    challengeMaxStreak = 0;
    challengeCorrect = 0;
    challengeTotal   = 0;
    challengeTimeLeft = 60;
    updateChallengeUI();
    pickChallengeTarget();
    startChallengeTimer();
}

function pickChallengeTarget() {
    challengeCurrentTarget = LETTER_KEYS[Math.floor(Math.random() * LETTER_KEYS.length)];
    document.getElementById('challengeTarget').textContent = challengeCurrentTarget;
}

function startChallengeTimer() {
    clearInterval(challengeInterval);
    challengeInterval = setInterval(() => {
        challengeTimeLeft--;
        document.getElementById('challengeTimer').textContent = challengeTimeLeft;
        if (challengeTimeLeft <= 0) {
            clearInterval(challengeInterval);
            endChallenge();
        }
        if (challengeTimeLeft <= 10) {
            document.getElementById('challengeTimer').style.color = '#ff6584';
        }
    }, 1000);
}

function updateChallengeUI() {
    document.getElementById('challengeScore').textContent  = challengeScore;
    document.getElementById('challengeStreak').textContent = challengeStreak;
}

function handleChallengeDetection(letter) {
    const flash = document.getElementById('resultFlash');
    challengeTotal++;

    if (letter === challengeCurrentTarget) {
        challengeCorrect++;
        challengeStreak++;
        if (challengeStreak > challengeMaxStreak) challengeMaxStreak = challengeStreak;
        const bonus = challengeStreak >= 5 ? 3 : challengeStreak >= 3 ? 2 : 1;
        challengeScore += 10 * bonus;
        flash.className = 'cam-result-flash correct';
        playBeep(880);
    } else {
        challengeStreak = 0;
        flash.className = 'cam-result-flash wrong';
        playBeep(220);
    }
    updateChallengeUI();
    setTimeout(() => {
        flash.className = 'cam-result-flash';
        pickChallengeTarget();
    }, 600);
}

function endChallenge() {
    clearInterval(challengeInterval);
    const accuracy = challengeTotal > 0 ? Math.round((challengeCorrect / challengeTotal) * 100) : 0;

    // حفظ في الإحصائيات
    if (challengeScore > stats.bestScore) stats.bestScore = challengeScore;
    stats.challengeCorrect += challengeCorrect;
    stats.challengeTotal   += challengeTotal;
    stats.challengeHistory.push({ score: challengeScore, date: new Date().toLocaleDateString('ar-EG'), accuracy });
    saveStats();
    updateStatsUI();

    document.getElementById('finalScore').textContent = challengeScore;
    document.getElementById('mCorrect').textContent   = challengeCorrect + '/' + challengeTotal;
    document.getElementById('mStreak').textContent    = challengeMaxStreak;
    document.getElementById('modalMsg').textContent   = getScoreMessage(challengeScore);
    openModal('challengeModal');
}

function getScoreMessage(score) {
    if (score >= 200) return '🔥 أسطورة! أداء استثنائي!';
    if (score >= 100) return '⭐ ممتاز جداً! أنت محترف!';
    if (score >= 50)  return '👍 جيد! استمر في التدريب!';
    return '💪 لا بأس! التدريب يصنع الفارق!';
}

function restartChallenge() {
    closeModal('challengeModal');
    initChallengeMode();
}

// ===== كشف الأصابع =====
function dist(a, b) {
    return Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2);
}

function getFingers(lm) {
    const isRight = lm[17].x < lm[5].x;
    return {
        thumb:  isRight ? lm[4].x > lm[3].x + 0.02 : lm[4].x < lm[3].x - 0.02,
        index:  lm[8].y  < lm[6].y  - 0.04,
        middle: lm[12].y < lm[10].y - 0.04,
        ring:   lm[16].y < lm[14].y - 0.04,
        pinky:  lm[20].y < lm[18].y - 0.04
    };
}

function countTotal(f) {
    return [f.thumb,f.index,f.middle,f.ring,f.pinky].filter(Boolean).length;
}

function isCurled(lm, tip, pip) {
    return lm[tip].y > lm[pip].y + 0.01;
}

function analyzeGesture(lm) {
    const f = getFingers(lm);
    const n = countTotal(f);

    const d_ti = dist(lm[4], lm[8]);   // thumb-index
    const d_im = dist(lm[8], lm[12]);  // index-middle
    const d_ip = dist(lm[8], lm[20]);  // index-pinky
    const palmSpread = dist(lm[5], lm[17]);

    const indexDown = lm[8].y > lm[6].y + 0.04;

    // ── 0 أصابع ──
    if (n === 0) return f.thumb ? null : 'أ';
    if (n === 1 && f.thumb && !f.index)                return 'خ';
    if (n === 1 && f.index && !f.thumb) {
        if (indexDown) return 'غ';
        return 'ب';
    }
    if (n === 1 && f.pinky && !f.index)                return 'ر';

    // ── 2 أصابع ──
    if (n === 2 && f.thumb && f.index && !f.middle) {
        if (d_ti < 0.045) return 'ن';
        if (d_ti < 0.085) return 'ل';
        return 'ق';
    }
    if (n === 2 && f.thumb && f.pinky && !f.index)     return 'و';
    if (n === 2 && f.index && f.middle && !f.thumb && !f.ring) {
        return d_im > 0.09 ? 'ز' : 'ت';
    }
    if (n === 2 && f.index && f.pinky && !f.middle) {
        return d_ip > 0.25 ? 'د' : 'ي';
    }
    if (n === 2 && f.thumb && f.middle && !f.index)    return 'ف';

    // ── 3 أصابع ──
    if (n === 3 && f.thumb && f.index && f.middle && !f.ring) {
        if (d_ti < 0.07) return 'م';
        return 'ك';
    }
    if (n === 3 && f.index && f.middle && f.ring && !f.thumb) {
        const curled = isCurled(lm,8,6) || isCurled(lm,12,10) || isCurled(lm,16,14);
        return curled ? 'ش' : 'ث';
    }

    // ── 4 أصابع ──
    if (n === 4 && !f.thumb)                           return 'ج';
    if (n === 4 && f.thumb && f.index && f.middle && f.ring && !f.pinky) {
        return d_ti < 0.08 ? 'س' : 'ذ';
    }
    if (n === 4 && f.thumb && !f.ring)                 return 'ظ';

    // ── 5 أصابع ──
    if (n === 5) {
        if (d_ti < 0.07) return 'ط';
        const curlCount = [
            isCurled(lm,8,6), isCurled(lm,12,10),
            isCurled(lm,16,14), isCurled(lm,20,18)
        ].filter(Boolean).length;
        if (curlCount === 0 && palmSpread > 0.34) return 'ص';
        if (curlCount >= 3) return 'ض';
        if (curlCount >= 2) return 'ع';
        if (curlCount >= 1) return 'ه';
        return 'ح';
    }

    return null;
}

// ===== حالة الكشف =====
let lastLetter = null, detStartTime = null, detTimer = false;
const STABLE_TIME = 1800;

// مكتشف الحركات الخاصة (مسافة، حذف)
let previousSpecialState = 'other';
let lastSpecialGestureAt = 0;
let specialGestureLockUntil = 0;

function getSpecialGestureState(lm) {
    const n = countTotal(getFingers(lm));
    if (n === 5) return 'open';
    if (n === 0) return 'fist';
    return 'other';
}

function getFingerStateVector(lm) {
    const f = getFingers(lm);
    return [f.thumb ? 1 : 0, f.index ? 1 : 0, f.middle ? 1 : 0, f.ring ? 1 : 0, f.pinky ? 1 : 0];
}

function gestureMatchesLetter(lm, letter) {
    const info = LETTERS[letter];
    if (!info) return false;

    const state = getFingerStateVector(lm);
    const matchesPattern = info.f.every((v, idx) => Number(v) === state[idx]);
    if (!matchesPattern) return false;

    if (letter === 'غ') return lm[8].y > lm[6].y + 0.04;
    if (letter === 'ب') return lm[8].y < lm[6].y - 0.04;
    return true;
}

function resolveDetectedLetter(lm, detected) {
    if (!isTargetModeActive()) return detected;
    const expected = getCurrentTargetChar();
    if (!expected || expected === ' ') return detected;
    if (detected === expected) return detected;
    if (gestureMatchesLetter(lm, expected)) return expected;
    return detected;
}
function detectSpecialGestures(lm) {
    if (currentMode !== 'communicate') {
        previousSpecialState = 'other';
        return;
    }

    const now = Date.now();
    const currentState = getSpecialGestureState(lm);

    if (now < specialGestureLockUntil) {
        previousSpecialState = currentState;
        return;
    }
    if (currentState === previousSpecialState) return;
    if (now - lastSpecialGestureAt < SPECIAL_GESTURE_COOLDOWN) {
        previousSpecialState = currentState;
        return;
    }

    if (previousSpecialState === 'open' && currentState === 'fist') {
        lastSpecialGestureAt = now;
        specialGestureLockUntil = now + SPECIAL_GESTURE_LOCK_MS;
        triggerSpaceGesture();
    } else if (previousSpecialState === 'fist' && currentState === 'open') {
        lastSpecialGestureAt = now;
        specialGestureLockUntil = now + SPECIAL_GESTURE_LOCK_MS;
        triggerDeleteGesture();
    }

    previousSpecialState = currentState;
}

// ===== معالجة MediaPipe =====
function onResults(results) {
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks?.length > 0) {
        const lm = results.multiHandLandmarks[0];
        drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#6c63ff', lineWidth: 3 });
        drawLandmarks(ctx, lm, { color: '#ff6584', lineWidth: 2, radius: 3 });

        detectSpecialGestures(lm);
        if (Date.now() < specialGestureLockUntil) {
            resetDetection();
            setStatus('active', 'تم تنفيذ حركة خاصة');
            ctx.restore();
            return;
        }

        if (isTargetModeActive() && getCurrentTargetChar() === ' ') {
            resetDetection();
            showCurrentLetter('⎵');
            setStatus('active', 'المطلوب الآن مسافة: ✋→✊');
            ctx.restore();
            return;
        }

        let detected = analyzeGesture(lm);
        detected = resolveDetectedLetter(lm, detected);

        if (detected) {
            if (detected !== lastLetter) {
                lastLetter = detected;
                detStartTime = Date.now();
                detTimer = false;
            } else {
                const elapsed = Date.now() - detStartTime;
                const pct = Math.min((elapsed / STABLE_TIME) * 100, 100);
                updateConf(pct);

                if (elapsed >= STABLE_TIME && !detTimer) {
                    detTimer = true;
                    onLetterConfirmed(detected);
                    setTimeout(() => {
                        detTimer = false;
                        detStartTime = Date.now();
                    }, 900);
                }
            }
            showCurrentLetter(detected);
            setStatus('detecting', 'جاري الكشف...');
        } else {
            resetDetection();
            document.getElementById('currentLetter').innerHTML = '❓';
            setStatus('active', 'حرّك يدك');
        }
    } else {
        resetDetection();
        previousSpecialState = 'other';
        document.getElementById('currentLetter').innerHTML = '<span class="dc-waiting">لا توجد يد</span>';
        setStatus('active', 'ضع يدك أمام الكاميرا');
    }
    ctx.restore();
}
function resetDetection() {
    lastLetter = null; detStartTime = null; detTimer = false;
    updateConf(0);
}

function onLetterConfirmed(letter) {
    stats.totalLetters++;
    stats.letterFreq[letter] = (stats.letterFreq[letter] || 0) + 1;
    sessionLetterCount++;
    saveStats();

    if (currentMode === 'communicate') {
        handleCommunicateDetection(letter);
    } else if (currentMode === 'learn') {
        handleLearnDetection(letter);
    } else if (currentMode === 'challenge') {
        handleChallengeDetection(letter);
    }
}

function showCurrentLetter(letter) {
    const el = document.getElementById('currentLetter');
    el.innerHTML = letter;
    el.style.fontSize = '6rem';
}

function updateConf(pct) {
    document.getElementById('confFill').style.width = pct + '%';
    document.getElementById('confPct').textContent  = Math.round(pct) + '%';
}

function setStatus(cls, txt) {
    const s = document.getElementById('detectionStatus');
    s.querySelector('.sdot').className = 'sdot ' + cls;
    s.querySelector('.stxt').textContent = txt;
}

// ===== الكاميرا =====
function initHands() {
    hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({
        maxNumHands: 1, modelComplexity: 1,
        minDetectionConfidence: 0.62,
        minTrackingConfidence:  0.55
    });
    hands.onResults(onResults);
}

async function startCamera() {
    try {
        if (!hands) initHands();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480, facingMode:'user' }});
        video.srcObject = stream;
        await video.play();
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        camera = new Camera(video, {
            onFrame: async () => { await hands.send({ image: video }); },
            width: 640, height: 480
        });
        await camera.start();
        isRunning = true;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled  = false;
        setStatus('active', 'الكاميرا تعمل');
        sessionStart = Date.now();
        if (currentMode === 'challenge') initChallengeMode();
    } catch(e) {
        alert('⚠️ تعذّر تشغيل الكاميرا:\n' + e.message);
    }
}

function stopCamera() {
    if (camera) camera.stop();
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    clearInterval(challengeInterval);
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled  = true;
    document.getElementById('currentLetter').innerHTML = '<span class="dc-waiting">متوقف</span>';
    setStatus('', 'غير نشط');
    updateConf(0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // حفظ وقت الجلسة
    if (sessionStart) {
        const minutes = Math.round((Date.now() - sessionStart) / 60000);
        stats.totalMinutes += minutes;
        if (sessionLetterCount > 0) {
            stats.sessions.unshift({ date: new Date().toLocaleDateString('ar-EG'), letters: sessionLetterCount, minutes });
            if (stats.sessions.length > 10) stats.sessions.pop();
        }
        saveStats();
        sessionStart = null;
        sessionLetterCount = 0;
        updateStatsUI();
    }
}

// ===== الجملة (وضع التواصل) =====
let currentSentence = '';
let targetSentence = '';
let targetProgress = 0;

function normalizeArabicText(text) {
    const map = {
        'ا': 'أ', 'إ': 'أ', 'آ': 'أ',
        'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي',
        'ة': 'ه', 'ـ': ''
    };

    let out = '';
    for (const ch of (text || '')) {
        if (ch === '\n' || ch === '\t') {
            out += ' ';
            continue;
        }
        out += Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
    }
    return out.replace(/\s+/g, ' ').trim();
}

function sanitizeTargetSentence(text) {
    const normalized = normalizeArabicText(text);
    let cleaned = '';
    for (const ch of normalized) {
        if (SUPPORTED_CHARS.has(ch)) cleaned += ch;
    }
    return cleaned.replace(/\s+/g, ' ').trim();
}

function isTargetModeActive() {
    return currentMode === 'communicate' && targetSentence.length > 0;
}

function getCurrentTargetChar() {
    return targetProgress < targetSentence.length ? targetSentence[targetProgress] : null;
}

function setTargetStatus(message, tone = 'normal') {
    const el = document.getElementById('targetSentenceStatus');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('ok', 'error');
    if (tone === 'ok') el.classList.add('ok');
    if (tone === 'error') el.classList.add('error');
}

function renderTargetSequence() {
    const wrap = document.getElementById('targetSequenceWrap');
    if (!wrap) return;

    if (!targetSentence.length) {
        wrap.innerHTML = '';
        wrap.classList.add('hidden');
        return;
    }

    const chars = Array.from(targetSentence);
    wrap.innerHTML = chars.map((ch, idx) => {
        const classes = ['target-char'];
        if (ch === ' ') classes.push('space');
        if (idx < targetProgress) classes.push('done');
        else if (idx === targetProgress) classes.push('current');
        return `<span class="${classes.join(' ')}">${ch === ' ' ? '⎵' : ch}</span>`;
    }).join('');
    wrap.classList.remove('hidden');
}

function renderTargetHint() {
    const card = document.getElementById('targetHintCard');
    const letterEl = document.getElementById('targetHintLetter');
    const visualEl = document.getElementById('targetHintVisual');
    const textEl = document.getElementById('targetHintText');
    if (!card || !letterEl || !visualEl || !textEl) return;

    if (!targetSentence.length || targetProgress >= targetSentence.length) {
        card.classList.add('hidden');
        return;
    }

    const expected = getCurrentTargetChar();
    if (expected === ' ') {
        letterEl.textContent = '⎵';
        visualEl.innerHTML = '';
        textEl.textContent = 'المطلوب الآن مسافة. نفّذ الحركة: ✋ ثم ✊.';
        card.classList.remove('hidden');
        return;
    }

    const info = LETTERS[expected];
    if (!info) {
        card.classList.add('hidden');
        return;
    }

    letterEl.textContent = expected;
    visualEl.innerHTML = buildHandSVG(expected, info.f);
    textEl.textContent = `${info.name} - ${info.desc}`;
    card.classList.remove('hidden');
}

function initCommunicateUI() {
    renderSentence();
    enableSentenceButtons();
    renderTargetSequence();
    renderTargetHint();

    if (targetSentence.length) {
        if (targetProgress >= targetSentence.length) {
            setTargetStatus('تم إنجاز الجملة بالكامل.', 'ok');
        } else {
            const expected = getCurrentTargetChar();
            setTargetStatus(`المطلوب الآن: ${expected === ' ' ? 'مسافة' : expected}`);
        }
    } else {
        setTargetStatus('اكتب جملة ثم اضغط "تحضير".');
    }
}

function setTargetSentence() {
    const input = document.getElementById('targetSentenceInput');
    const rawValue = input ? input.value : '';
    const cleaned = sanitizeTargetSentence(rawValue);

    if (!cleaned.length) {
        targetSentence = '';
        targetProgress = 0;
        renderTargetSequence();
        renderTargetHint();
        setTargetStatus('الجملة فارغة أو تحتوي رموز غير مدعومة.', 'error');
        return;
    }

    targetSentence = cleaned;
    targetProgress = 0;
    currentSentence = '';
    renderSentence();
    enableSentenceButtons();
    document.getElementById('translationBox').classList.add('hidden');

    if (input) input.value = cleaned;

    renderTargetSequence();
    renderTargetHint();
    const expected = getCurrentTargetChar();
    setTargetStatus(`تم تحضير الجملة. ابدأ بـ: ${expected === ' ' ? 'مسافة' : expected}`, 'ok');
    playBeep(760);
}

function resetTargetSentence() {
    targetSentence = '';
    targetProgress = 0;

    const input = document.getElementById('targetSentenceInput');
    if (input) input.value = '';

    renderTargetSequence();
    renderTargetHint();
    setTargetStatus('تم مسح الجملة المستهدفة.');
}

function addToSentence(letter, options = {}) {
    if (!letter) return false;
    if (letter === ' ' && (!currentSentence.length || currentSentence.endsWith(' '))) return false;

    currentSentence += letter;
    renderSentence();
    enableSentenceButtons();

    if (!options.skipBeep) {
        playBeep(letter === ' ' ? 560 : 880);
    }
    return true;
}

function deleteLastFromSentence(options = {}) {
    if (!currentSentence.length) return null;

    const removed = currentSentence.slice(-1);
    currentSentence = currentSentence.slice(0, -1);
    renderSentence();
    enableSentenceButtons();

    if (!options.skipBeep) playBeep(240);
    return removed;
}

function handleTargetSuccess(letter) {
    const added = addToSentence(letter, { skipBeep: true });
    if (!added) return;

    targetProgress = Math.min(targetProgress + 1, targetSentence.length);
    renderTargetSequence();
    renderTargetHint();
    playBeep(920);

    if (targetProgress >= targetSentence.length) {
        setTargetStatus('🎉 اكتملت الجملة بنجاح.', 'ok');
    } else {
        const next = getCurrentTargetChar();
        setTargetStatus(`ممتاز. التالي: ${next === ' ' ? 'مسافة' : next}`, 'ok');
    }
}

function handleTargetMismatch(detected) {
    const expected = getCurrentTargetChar();
    const expectedLabel = expected === ' ' ? 'مسافة' : expected;
    const detectedLabel = detected === ' ' ? 'مسافة' : detected;

    const flash = document.getElementById('resultFlash');
    flash.className = 'cam-result-flash wrong';
    setTimeout(() => flash.className = 'cam-result-flash', 320);

    playBeep(220);
    setTargetStatus(`المطلوب الآن: ${expectedLabel}. المكتشف: ${detectedLabel || 'غير واضح'}`, 'error');
}

function handleCommunicateDetection(letter) {
    if (!isTargetModeActive()) {
        addToSentence(letter);
        return;
    }

    const expected = getCurrentTargetChar();
    if (!expected) return;

    if (expected === ' ') {
        handleTargetMismatch(letter);
        setTargetStatus('المطلوب الآن مسافة بالحركة: ✋ ثم ✊.', 'error');
        return;
    }

    if (letter === expected) {
        handleTargetSuccess(letter);
    } else {
        handleTargetMismatch(letter);
    }
}

function triggerSpaceGesture() {
    const flash = document.getElementById('resultFlash');
    flash.className = 'cam-result-flash correct';
    setTimeout(() => flash.className = 'cam-result-flash', 260);

    if (isTargetModeActive()) {
        const expected = getCurrentTargetChar();
        if (expected === ' ') {
            const added = addToSentence(' ', { skipBeep: true });
            if (added) {
                targetProgress = Math.min(targetProgress + 1, targetSentence.length);
                renderTargetSequence();
                renderTargetHint();
                playBeep(700);

                if (targetProgress >= targetSentence.length) {
                    setTargetStatus('🎉 اكتملت الجملة بنجاح.', 'ok');
                } else {
                    const next = getCurrentTargetChar();
                    setTargetStatus(`ممتاز. التالي: ${next === ' ' ? 'مسافة' : next}`, 'ok');
                }
            }
        } else {
            playBeep(220);
            setTargetStatus('هذه الحركة للمسافة فقط، والمطلوب الآن حرف.', 'error');
        }
    } else {
        const added = addToSentence(' ', { skipBeep: true });
        if (added) {
            playBeep(560);
            setStatus('active', 'تمت إضافة مسافة');
        } else {
            setStatus('active', 'لا يمكن إضافة مسافة الآن');
        }
    }

    resetDetection();
}

function triggerDeleteGesture() {
    const removed = deleteLastFromSentence({ skipBeep: true });
    if (!removed) {
        setStatus('active', 'لا يوجد شيء للحذف');
        return;
    }

    const flash = document.getElementById('resultFlash');
    flash.className = 'cam-result-flash wrong';
    setTimeout(() => flash.className = 'cam-result-flash', 260);
    playBeep(250);

    if (isTargetModeActive()) {
        targetProgress = Math.max(0, targetProgress - 1);
        renderTargetSequence();
        renderTargetHint();

        if (targetProgress >= targetSentence.length) {
            setTargetStatus('تم الرجوع خطوة.');
        } else {
            const expected = getCurrentTargetChar();
            setTargetStatus(`تم الحذف. المطلوب الآن: ${expected === ' ' ? 'مسافة' : expected}`);
        }
    }

    setStatus('active', 'تم حذف آخر حرف');
    resetDetection();
}

function renderSentence() {
    const el = document.getElementById('sentence');
    el.innerHTML = currentSentence.length
        ? currentSentence
        : '<span class="sc-empty">ابدأ بتكوين جملتك...</span>';
}

function enableSentenceButtons() {
    ['speakBtn','translateBtn','shareBtn','saveBtn','clearBtn'].forEach(id => {
        document.getElementById(id).disabled = !currentSentence.length;
    });
}

function clearSentence() {
    if (!confirm('مسح الجملة؟')) return;

    currentSentence = '';
    if (isTargetModeActive()) {
        targetProgress = 0;
        renderTargetSequence();
        renderTargetHint();
        setTargetStatus('تم مسح المكتوب. ابدأ من أول الجملة.');
    }

    renderSentence();
    enableSentenceButtons();
    document.getElementById('translationBox').classList.add('hidden');
}

function speakSentence() {
    if (!currentSentence || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(currentSentence);
    u.lang = 'ar-SA'; u.rate = 0.85;
    u.onstart = () => {
        const b = document.getElementById('speakBtn');
        b.innerHTML = '⏸️';
        b.style.color = '#ff6584';
    };
    u.onend = () => {
        const b = document.getElementById('speakBtn');
        b.innerHTML = '🔊';
        b.style.color = '';
    };
    window.speechSynthesis.speak(u);
}

async function translateSentence() {
    if (!currentSentence) return;
    const btn = document.getElementById('translateBtn');
    btn.innerHTML = '⏳';
    btn.disabled = true;

    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(currentSentence)}&langpair=ar|en`);
        const data = await res.json();
        const translation = data.responseData?.translatedText || 'تعذرت الترجمة';
        document.getElementById('translationText').textContent = translation;
        document.getElementById('translationBox').classList.remove('hidden');
    } catch {
        document.getElementById('translationText').textContent = '⚠️ تعذرت الترجمة - تأكد من الاتصال بالإنترنت';
        document.getElementById('translationBox').classList.remove('hidden');
    } finally {
        btn.innerHTML = '🌐';
        btn.disabled = false;
    }
}

function openShareModal() {
    document.getElementById('sharePreview').textContent = currentSentence;
    openModal('shareModal');
}

function copyToClipboard() {
    navigator.clipboard.writeText(currentSentence).then(() => {
        const btn = document.querySelector('#shareModal .btn-primary');
        if (!btn) return;
        const old = btn.textContent;
        btn.textContent = '✅ تم النسخ!';
        setTimeout(() => btn.textContent = old, 2000);
    });
}

function downloadAsImage() {
    const c = document.createElement('canvas');
    c.width = 800; c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#161827';
    x.fillRect(0, 0, 800, 300);
    x.fillStyle = '#6c63ff';
    x.font = 'bold 24px Cairo, Arial';
    x.textAlign = 'center';
    x.fillText('جِسر - تطبيق لغة الإشارة', 400, 50);
    x.fillStyle = '#e8eaf6';
    x.font = 'bold 80px Cairo, Arial';
    x.fillText(currentSentence, 400, 180);
    x.fillStyle = '#9fa8da';
    x.font = '18px Cairo, Arial';
    x.fillText('ثانوية التاسعة عشر · 2026', 400, 260);

    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'jisr-sentence.png';
    a.click();
}

function saveSentence() {
    if (!currentSentence) return;
    const saved = JSON.parse(localStorage.getItem('jisrSaved') || '[]');
    saved.unshift({ text: currentSentence, date: new Date().toLocaleString('ar-EG') });
    localStorage.setItem('jisrSaved', JSON.stringify(saved));
    playBeep(660);
    const btn = document.getElementById('saveBtn');
    btn.innerHTML = '✅';
    setTimeout(() => btn.innerHTML = '💾', 1500);
    loadSavedPanel();
}



// ===== الجمل المحفوظة =====
function loadSavedPanel() {
    const saved = JSON.parse(localStorage.getItem('jisrSaved') || '[]');
    const list  = document.getElementById('savedList');
    const empty = document.getElementById('noSaved');
    list.innerHTML = '';
    empty.style.display = saved.length ? 'none' : 'block';
    saved.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'saved-item';
        div.innerHTML = `
            <div>
                <div class="saved-text">${item.text}</div>
                <div class="saved-meta">${item.date}</div>
            </div>
            <div class="saved-btns">
                <button class="saved-btn saved-btn-speak"  onclick="speakText('${item.text}')">🔊 نطق</button>
                <button class="saved-btn saved-btn-delete" onclick="deleteSaved(${i})">🗑️ حذف</button>
            </div>`;
        list.appendChild(div);
    });
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
}

function deleteSaved(i) {
    if (!confirm('حذف الجملة؟')) return;
    const saved = JSON.parse(localStorage.getItem('jisrSaved') || '[]');
    saved.splice(i, 1);
    localStorage.setItem('jisrSaved', JSON.stringify(saved));
    loadSavedPanel();
}

function exportAll() {
    const saved = JSON.parse(localStorage.getItem('jisrSaved') || '[]');
    if (!saved.length) { alert('لا توجد جمل محفوظة'); return; }
    const text = saved.map((s, i) => `${i+1}. ${s.text} (${s.date})`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jisr-saved.txt';
    a.click();
}

// ===== الإحصائيات =====
function updateStatsUI() {
    document.getElementById('statTotal').textContent    = stats.totalLetters;
    document.getElementById('statTime').textContent     = stats.totalMinutes;
    document.getElementById('statBest').textContent     = stats.bestScore;
    const acc = stats.challengeTotal > 0
        ? Math.round((stats.challengeCorrect / stats.challengeTotal) * 100) + '%'
        : '-';
    document.getElementById('statAccuracy').textContent = acc;

    // رسم بياني للحروف
    const chart = document.getElementById('freqChart');
    const sorted = Object.entries(stats.letterFreq).sort((a,b) => b[1]-a[1]).slice(0,10);
    const max = sorted[0]?.[1] || 1;
    chart.innerHTML = sorted.length ? sorted.map(([l, c]) => `
        <div class="freq-item">
            <span class="freq-letter">${l}</span>
            <div class="freq-bar-wrap"><div class="freq-bar" style="width:${(c/max)*100}%"></div></div>
            <span class="freq-count">${c}</span>
        </div>`).join('') : '<p style="color:var(--text3)">لا توجد بيانات بعد</p>';

    // الحروف الضعيفة (الأقل استخداماً)
    const weak = document.getElementById('weakLetters');
    const usedLetters = new Set(Object.keys(stats.letterFreq));
    const weakList = LETTER_KEYS.filter(l => !usedLetters.has(l)).slice(0, 8);
    weak.innerHTML = weakList.length
        ? weakList.map(l => `<span class="weak-tag">${l} (${LETTERS[l].name})</span>`).join('')
        : '<span style="color:var(--accent3)">✅ أتقنت كل الحروف!</span>';

    // سجل الجلسات
    const log = document.getElementById('sessionLog');
    log.innerHTML = stats.sessions.length
        ? stats.sessions.slice(0,5).map(s => `
            <div class="session-item">
                <span class="session-date">${s.date}</span>
                <div class="session-data">
                    <span>✍️ ${s.letters} حرف</span>
                    <span>⏱️ ${s.minutes} دقيقة</span>
                </div>
            </div>`).join('')
        : '<p style="color:var(--text3)">لا توجد جلسات سابقة</p>';
}

function resetStats() {
    if (!confirm('مسح كل الإحصائيات؟')) return;
    stats = {
        totalLetters:0, totalMinutes:0, bestScore:0,
        challengeHistory:[], letterFreq:{},
        challengeCorrect:0, challengeTotal:0, sessions:[]
    };
    saveStats();
    updateStatsUI();
}

// ===== دليل الحروف =====
function buildGuide() {
    const grid = document.getElementById('lettersGuide');
    grid.innerHTML = LETTER_KEYS.map(l => {
        const d = LETTERS[l];
        return `
        <div class="letter-card" data-letter="${l}" data-name="${d.name}">
            <div class="lc-header">
                <span class="lc-char">${l}</span>
                <span class="lc-name">${d.name}</span>
            </div>
            <div class="lc-visual">${buildHandSVG(l, d.f)}</div>
            <div class="lc-desc">${d.desc}</div>
        </div>`;
    }).join('');
}

function buildHandSVG(l, f) {
    return `<svg class="hand-svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="130" rx="48" ry="52" fill="#2a2d4a" stroke="#6c63ff" stroke-width="2"/>
        <rect x="38"  y="${f[0]?'88':'112'}" width="20" height="${f[0]?'58':'32'}" rx="10"
              fill="${f[0]?'#6c63ff':'#3d4270'}" transform="rotate(-35 48 120)"/>
        <rect x="67"  y="${f[1]?'32':'88'}"  width="18" height="${f[1]?'82':'48'}" rx="9"
              fill="${f[1]?'#6c63ff':'#3d4270'}"/>
        <rect x="91"  y="${f[2]?'22':'83'}"  width="18" height="${f[2]?'92':'52'}" rx="9"
              fill="${f[2]?'#6c63ff':'#3d4270'}"/>
        <rect x="115" y="${f[3]?'28':'85'}"  width="17" height="${f[3]?'86':'48'}" rx="9"
              fill="${f[3]?'#6c63ff':'#3d4270'}"/>
        <rect x="137" y="${f[4]?'40':'90'}"  width="16" height="${f[4]?'72':'42'}" rx="8"
              fill="${f[4]?'#6c63ff':'#3d4270'}"/>
        <text x="100" y="193" text-anchor="middle" font-size="20" font-weight="bold" fill="#6c63ff">${l}</text>
    </svg>`;
}

function filterGuide(query) {
    document.querySelectorAll('#lettersGuide .letter-card').forEach(card => {
        const match = card.dataset.letter.includes(query) || card.dataset.name.includes(query);
        card.style.display = match ? '' : 'none';
    });
}

// ===== التنقل =====
function startApp(mode) {
    currentMode = mode;
    document.getElementById('splashScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');

    const badge = document.getElementById('modeBadge');
    const modeNames = { learn:'🎓 تعلم', communicate:'💬 تواصل', challenge:'🏆 تحدي' };
    badge.textContent = modeNames[mode];

    document.getElementById('learnHeader').classList.add('hidden');
    document.getElementById('challengeHeader').classList.add('hidden');
    document.getElementById('sentenceCard').classList.add('hidden');

    if (mode === 'learn') {
        document.getElementById('learnHeader').classList.remove('hidden');
        initLearnMode();
    } else if (mode === 'communicate') {
        document.getElementById('sentenceCard').classList.remove('hidden');
        initCommunicateUI();
    } else if (mode === 'challenge') {
        document.getElementById('challengeHeader').classList.remove('hidden');
    }

    updateStatsUI();
}

function goHome() {
    stopCamera();
    clearInterval(challengeInterval);
    document.getElementById('splashScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function switchPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.querySelector(`[data-panel="${name}"]`).classList.add('active');
    if (name === 'stats')  updateStatsUI();
    if (name === 'guide')  buildGuide();
    if (name === 'saved')  loadSavedPanel();
}

// ===== Modals =====
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== صوت =====
function playBeep(freq = 660) {
    try {
        const ac   = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
        osc.start(); osc.stop(ac.currentTime + 0.12);
    } catch(e) {}
}

// ===== Init =====
window.addEventListener('load', () => {
    buildGuide();
    loadSavedPanel();
    updateStatsUI();
    initCommunicateUI();

    const input = document.getElementById('targetSentenceInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setTargetSentence();
            }
        });
    }
    console.log('🤟 جِسر جاهز - النسخة المتقدمة');
});



