/**
 * ReEarth — EcoBot Chatbot v2
 * Features: circular logo, hover preview, maximize, Gemini AI
 */
const ReEarthChatbot = (() => {

    const GEMINI_KEY = () => window.CONFIG?.GEMINI_API_KEY || ''
    const SYSTEM_PROMPT = `You are EcoBot, the friendly AI assistant for ReEarth — an EIA mitigation platform for e-waste and solid waste management in India.

Your personality: helpful, knowledgeable, concise, eco-conscious. Use occasional relevant emojis.

Help users with:
- Classifying waste (e-waste, plastic, organic, hazardous, metal, glass, paper)
- Scheduling waste pickup through ReEarth
- Recycling centers in Noida/Delhi NCR
- Environmental impact of e-waste
- Tips for responsible disposal
- Hazardous materials in electronics (lead, mercury, cadmium)
- How the ReEarth platform works

Platform features:
1. AI Waste Classifier — upload photo to classify waste
2. Schedule Pickup — doorstep waste collection form
3. Impact Metrics — CO2 saved, lead diverted stats
4. Find Centers — map of nearby certified recycling centers in Noida

Keep responses concise (2-4 sentences). Use bullet points for lists. Format with **bold** for important terms. You are EcoBot by ReEarth, not a Google AI.`;

    const SUGGESTIONS = [
        '♻️ How do I classify waste?',
        '📅 Schedule a pickup',
        '🔋 Are batteries hazardous?',
        '💻 Dispose a laptop?',
        '📍 Find recycling centers',
        '🌿 Impact of recycling?',
    ];

    let isOpen         = false;
    let isMaximized    = false;
    let isTyping       = false;
    let messageHistory = [];
    let hasGreeted     = false;
    let hoverTimer     = null;
    let previewVisible = false;

    // ── Build DOM ─────────────────────────────────────────────
    function buildHTML() {
        // Hover preview tooltip
        const preview = document.createElement('div');
        preview.id        = 'cb-preview';
        preview.className = 'cb-gone';
        preview.innerHTML = `
            <div class="cb-preview-title">
                <div class="cb-preview-dot"></div>
                <span>EcoBot</span> is online
            </div>
            <div class="cb-preview-msg">Ask me about waste classification, pickups, or recycling centers! ♻️</div>
        `;

        // Trigger button with circular logo
        const trigger = document.createElement('button');
        trigger.id        = 'cb-trigger';
        trigger.title     = 'Chat with EcoBot';
        trigger.innerHTML = `
            <div class="cb-logo-circle">
                <div class="cb-logo-inner">
                    <div class="cb-logo-icon">♻️</div>
                    <div class="cb-logo-label">ECOBOT</div>
                </div>
                <div class="cb-close-x">✕</div>
            </div>
            <span id="cb-badge">1</span>
        `;

        // Chat window
        const win = document.createElement('div');
        win.id        = 'cb-window';
        win.className = 'cb-hidden';
        win.innerHTML = `
            <div id="cb-header">
                <div class="cb-avatar">🤖</div>
                <div class="cb-header-info">
                    <div class="cb-header-name">EcoBot</div>
                    <div class="cb-header-status">
                        <div class="cb-status-dot"></div>
                        Online · ReEarth AI Assistant
                    </div>
                </div>
                <div class="cb-header-actions">
                    <button class="cb-icon-btn" id="cb-maximize-btn" title="Maximize">⛶</button>
                    <button class="cb-icon-btn" id="cb-clear-btn"    title="Clear chat">🗑️</button>
                    <button class="cb-icon-btn" id="cb-close-btn"    title="Close">✕</button>
                </div>
            </div>
            <div id="cb-messages">
                <div class="cb-welcome">
                    <span class="cb-welcome-emoji">♻️</span>
                    <div class="cb-welcome-title">Hi! I'm EcoBot 👋</div>
                    <div class="cb-welcome-sub">Your AI guide for e-waste & recycling.<br>Ask me anything about waste management!</div>
                </div>
                <div class="cb-suggestions" id="cb-suggestions">
                    ${SUGGESTIONS.map(s => `<button class="cb-chip">${s}</button>`).join('')}
                </div>
            </div>
            <div id="cb-input-area">
                <textarea id="cb-input" placeholder="Ask about waste, pickups, recycling…" rows="1" maxlength="500"></textarea>
                <button id="cb-send" disabled title="Send">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
            <div id="cb-footer">Powered by <span>ReEarth AI</span> · Gemini</div>
        `;

        document.body.appendChild(preview);
        document.body.appendChild(trigger);
        document.body.appendChild(win);
    }

    // ── Toggle open/close ─────────────────────────────────────
    function toggle() {
        isOpen = !isOpen;
        const win     = document.getElementById('cb-window');
        const trigger = document.getElementById('cb-trigger');
        const badge   = document.getElementById('cb-badge');

        trigger.classList.toggle('cb-open', isOpen);
        hidePreview(true);

        if (isOpen) {
            badge.classList.add('cb-hidden');
            win.classList.remove('cb-hidden', 'cb-animating-out');
            win.classList.add('cb-animating-in');
            win.addEventListener('animationend', () => win.classList.remove('cb-animating-in'), { once: true });
            setTimeout(() => document.getElementById('cb-input')?.focus(), 350);

            if (!hasGreeted) {
                hasGreeted = true;
                setTimeout(() => appendBotMessage("Hello! 👋 I'm **EcoBot**, ReEarth's AI assistant. I can help you classify waste, schedule pickups, find recycling centers near Noida, and answer e-waste questions. What can I help you with today?"), 600);
            }
        } else {
            // Restore normal size when closing
            if (isMaximized) toggleMaximize();
            win.classList.add('cb-animating-out');
            win.addEventListener('animationend', () => {
                win.classList.add('cb-hidden');
                win.classList.remove('cb-animating-out');
            }, { once: true });
        }
    }

    // ── Maximize / Restore ────────────────────────────────────
    function toggleMaximize() {
        isMaximized = !isMaximized;
        const win = document.getElementById('cb-window');
        const btn = document.getElementById('cb-maximize-btn');

        win.classList.toggle('cb-maximized', isMaximized);
        btn.classList.toggle('cb-is-max',    isMaximized);
        btn.title     = isMaximized ? 'Restore' : 'Maximize';
        btn.textContent = isMaximized ? '⊡' : '⛶';
    }

    // ── Hover Preview ─────────────────────────────────────────
    function showPreview() {
        if (isOpen) return;
        const el = document.getElementById('cb-preview');
        if (!el) return;
        el.classList.remove('cb-gone', 'cb-preview-hidden');
        el.classList.add('cb-preview-visible');
        previewVisible = true;
    }

    function hidePreview(instant) {
        const el = document.getElementById('cb-preview');
        if (!el || !previewVisible) return;
        if (instant) {
            el.classList.add('cb-gone');
            el.classList.remove('cb-preview-visible', 'cb-preview-hidden');
        } else {
            el.classList.remove('cb-preview-visible');
            el.classList.add('cb-preview-hidden');
            el.addEventListener('animationend', () => {
                el.classList.add('cb-gone');
                el.classList.remove('cb-preview-hidden');
            }, { once: true });
        }
        previewVisible = false;
    }

    // ── Send message ──────────────────────────────────────────
    async function sendMessage(text) {
        text = text.trim();
        if (!text || isTyping) return;

        const key = GEMINI_KEY();
        if (!key || key.startsWith('PASTE_')) {
            appendBotMessage('⚠️ Gemini API key not configured. Add your `GEMINI_API_KEY` to the CONFIG in `app.js`.', true);
            return;
        }

        document.getElementById('cb-suggestions') && (document.getElementById('cb-suggestions').style.display = 'none');

        appendUserMessage(text);
        clearInput();
        messageHistory.push({ role: 'user', parts: [{ text }] });

        isTyping = true;
        updateSendBtn();
        const typingEl = showTyping();

        try {
            const response = await callGemini(messageHistory);
            removeTyping(typingEl);
            appendBotMessage(response);
            messageHistory.push({ role: 'model', parts: [{ text: response }] });
            if (messageHistory.length > 20) messageHistory = messageHistory.slice(-20);
        } catch (err) {
            removeTyping(typingEl);
            console.error('EcoBot error:', err);
            appendBotMessage(`Sorry, I hit an error: ${err.message}. Please try again!`, true);
        } finally {
            isTyping = false;
            updateSendBtn();
        }
    }

    // ── Gemini call ───────────────────────────────────────────
    async function callGemini(history) {
        const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY()}`;
        const body = {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: history,
            generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 400 },
        };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error?.message || `API error ${res.status}`); }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response.');
        return text;
    }

    // ── DOM helpers ───────────────────────────────────────────
    function appendUserMessage(text) {
        const msgs = document.getElementById('cb-messages');
        const div  = document.createElement('div');
        div.className = 'cb-msg cb-user';
        div.innerHTML = `<div><div class="cb-bubble">${escapeHTML(text)}</div><div class="cb-msg-time">${getTime()}</div></div>`;
        msgs.appendChild(div);
        scrollToBottom();
    }

    function appendBotMessage(text, isError = false) {
        const msgs = document.getElementById('cb-messages');
        const div  = document.createElement('div');
        div.className = 'cb-msg cb-bot';
        div.innerHTML = `
            <div class="cb-msg-avatar">🤖</div>
            <div>
                <div class="cb-bubble ${isError ? 'cb-error-bubble' : ''}">${formatMarkdown(text)}</div>
                <div class="cb-msg-time">${getTime()}</div>
            </div>`;
        msgs.appendChild(div);
        scrollToBottom();
    }

    function showTyping() {
        const msgs = document.getElementById('cb-messages');
        const div  = document.createElement('div');
        div.className = 'cb-typing';
        div.innerHTML = `<div class="cb-msg-avatar">🤖</div><div class="cb-typing-bubble"><div class="cb-dot"></div><div class="cb-dot"></div><div class="cb-dot"></div></div>`;
        msgs.appendChild(div);
        scrollToBottom();
        return div;
    }

    function removeTyping(el)  { el?.remove(); }
    function scrollToBottom()  { const m = document.getElementById('cb-messages'); if (m) m.scrollTop = m.scrollHeight; }
    function clearInput()      { const i = document.getElementById('cb-input'); if (i) { i.value = ''; i.style.height = 'auto'; } updateSendBtn(); }
    function updateSendBtn()   { const i = document.getElementById('cb-input'), b = document.getElementById('cb-send'); if (b) b.disabled = !i?.value.trim() || isTyping; }
    function getTime()         { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
    function escapeHTML(s)     { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function formatMarkdown(t) {
        return t
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
            .replace(/\*(.*?)\*/g,'<em>$1</em>')
            .replace(/`(.*?)`/g,'<code style="background:rgba(132,204,22,.1);padding:1px 5px;border-radius:4px;font-size:.8em;color:#a3e635;">$1</code>')
            .replace(/^[•\-] (.+)$/gm,'<li>$1</li>')
            .replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>')
            .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')
            .replace(/^(?!<)/,'<p>').replace(/(?<!>)$/,'</p>');
    }

    function clearChat() {
        messageHistory = []; hasGreeted = false;
        const msgs = document.getElementById('cb-messages');
        if (!msgs) return;
        msgs.innerHTML = `
            <div class="cb-welcome">
                <span class="cb-welcome-emoji">♻️</span>
                <div class="cb-welcome-title">Chat cleared! 🌿</div>
                <div class="cb-welcome-sub">Start a fresh conversation below.</div>
            </div>
            <div class="cb-suggestions" id="cb-suggestions">
                ${SUGGESTIONS.map(s => `<button class="cb-chip">${s}</button>`).join('')}
            </div>`;
        bindChips();
        hasGreeted = true;
        setTimeout(() => appendBotMessage("Chat cleared! Ready to help with any waste management questions. ♻️"), 300);
    }

    function bindChips() {
        document.querySelectorAll('.cb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.textContent.replace(/^[^\w]+/,'').trim();
                sendMessage(text);
            });
        });
    }

    // ── Bind all events ───────────────────────────────────────
    function bindEvents() {
        const trigger = document.getElementById('cb-trigger');

        // Click to open
        trigger?.addEventListener('click', toggle);

        // Hover → show preview after 400ms delay
        trigger?.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(showPreview, 400);
        });
        // Mouse leave trigger → hide preview
        trigger?.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            setTimeout(() => hidePreview(false), 200);
        });

        // Maximize button
        document.getElementById('cb-maximize-btn')?.addEventListener('click', toggleMaximize);

        // Close button in header
        document.getElementById('cb-close-btn')?.addEventListener('click', () => { if (isOpen) toggle(); });

        // Clear button
        document.getElementById('cb-clear-btn')?.addEventListener('click', clearChat);

        // Send button
        document.getElementById('cb-send')?.addEventListener('click', () => sendMessage(document.getElementById('cb-input')?.value || ''));

        // Enter key to send
        document.getElementById('cb-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e.target.value); }
        });

        // Auto-resize textarea
        document.getElementById('cb-input')?.addEventListener('input', e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            updateSendBtn();
        });

        // Escape to close
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (isMaximized) toggleMaximize();
                else if (isOpen)  toggle();
            }
        });

        bindChips();
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        buildHTML();
        bindEvents();
        console.info('✅ EcoBot v2 ready.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { toggle, sendMessage, clearChat, toggleMaximize };
})();
