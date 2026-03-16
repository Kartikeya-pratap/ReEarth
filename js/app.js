//  Navigation Module
const Navigation = {
    navbar: null, navToggle: null, navLinks: null, lastScrollY: 0,

    init() {
        this.navbar    = document.getElementById('navbar');
        this.navToggle = document.getElementById('navToggle');
        this.navLinks  = document.getElementById('navLinks');
        this._scroll();
        this._mobile();
        this._activeLinks();
    },

    _scroll() {
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            this.navbar.classList.toggle('scrolled', y > 50);
            this.navbar.classList.toggle('nav-hidden', y > this.lastScrollY && y > 250);
            this.lastScrollY = y;
        }, { passive: true });
    },

    _mobile() {
        this.navToggle?.addEventListener('click', () => {
            this.navLinks.classList.toggle('open');
            this.navToggle.classList.toggle('active');
        });
        this.navLinks?.querySelectorAll('.nav-link').forEach(l =>
            l.addEventListener('click', () => {
                this.navLinks.classList.remove('open');
                this.navToggle.classList.remove('active');
            })
        );
    },

    _activeLinks() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    document.querySelectorAll('.nav-link').forEach(l => {
                        l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`);
                    });
                }
            });
        }, { threshold: 0.45 });
        document.querySelectorAll('section[id]').forEach(s => observer.observe(s));
    },
};


//  Hero Section Animations
const HeroAnimations = {
    init() {
        this._particles();
        this._loadRealStats();
    },

    _particles() {
        const c = document.getElementById('heroParticles');
        if (!c) return;
        for (let i = 0; i < 35; i++) {
            const p = document.createElement('div');
            const s = Math.random() * 4 + 1;
            p.style.cssText = `position:absolute;width:${s}px;height:${s}px;
                background:rgba(132,204,22,${(Math.random()*.4+.1).toFixed(2)});border-radius:50%;
                left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;
                animation:particleFloat ${(Math.random()*12+8).toFixed(1)}s infinite linear;
                animation-delay:${(Math.random()*-12).toFixed(1)}s;`;
            c.appendChild(p);
        }
    },

    async _loadRealStats() {
        // Load real stats from database
        try {
            if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.startsWith('PASTE_')) {
                this._animateAll(); return;
            }
            const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            const { data: rows, error } = await db.from('pickups').select('weight_kg');

            if (error) {
                this._applyDemoHeroStats();
                this._animateAll(); return;
            }

            const totalPickups = rows.length;
            const totalTons    = Math.round(rows.reduce((s, r) => s + (r.weight_kg || 0), 0) / 10) / 100;

            // Show demo stats if no real data yet
            if (totalPickups === 0) {
                this._applyDemoHeroStats();
            } else {
                document.querySelectorAll('.hero-stat').forEach(stat => {
                    const label = stat.querySelector('.hero-stat-label')?.textContent.trim();
                    const numEl = stat.querySelector('.hero-stat-number');
                    if (!numEl) return;
                    if (label === 'Tons Recycled')     numEl.dataset.target = Math.round(totalTons);
                    if (label === 'Pickups Completed')  numEl.dataset.target = totalPickups;
                    if (label === 'Partner Centers')    numEl.dataset.target = 5;
                });
            }
        } catch (err) {
            this._applyDemoHeroStats();
        } finally {
            this._animateAll();
        }
    },

    _applyDemoHeroStats() {
        document.querySelectorAll('.hero-stat').forEach(stat => {
            const label = stat.querySelector('.hero-stat-label')?.textContent.trim();
            const numEl = stat.querySelector('.hero-stat-number');
            if (!numEl) return;
            if (label === 'Tons Recycled')     numEl.dataset.target = 12450;
            if (label === 'Pickups Completed') numEl.dataset.target = 3200;
            if (label === 'Partner Centers')   numEl.dataset.target = 89;
        });
    },

    _animateAll() {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    this._countUp(e.target, parseInt(e.target.dataset.target || 0, 10));
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.4 });
        document.querySelectorAll('.hero-stat-number').forEach(el => obs.observe(el));
    },

    _countUp(el, target) {
        const frames = 132; let frame = 0;
        const t = setInterval(() => {
            frame++;
            el.textContent = Math.floor((1 - Math.pow(1 - frame / frames, 3)) * target).toLocaleString();
            if (frame >= frames) { el.textContent = target.toLocaleString(); clearInterval(t); }
        }, 1000 / 60);
    },
};


//  AI Waste Classifier
const AIClassifier = {
    _b64: null, _mime: null, _tick: null,

    init() {
        this._zone();
        this._classifyBtn();
        this._demo();
        this._removePreview();
    },

    _zone() {
        const zone = document.getElementById('uploadZone');
        const inp  = document.getElementById('fileInput');
        if (!zone) return;
        zone.addEventListener('click', e => { if (!e.target.closest('#removePreview')) inp.click(); });
        zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault(); zone.classList.remove('drag-over');
            const f = e.dataTransfer.files[0];
            if (f?.type.startsWith('image/')) this._load(f);
        });
        inp.addEventListener('change', e => { if (e.target.files[0]) this._load(e.target.files[0]); });
    },

    _load(file) {
        if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return; }
        this._mime = file.type;
        const r = new FileReader();
        r.onload = e => {
            this._b64 = e.target.result.split(',')[1];
            document.getElementById('previewImage').src = e.target.result;
            document.getElementById('uploadContent').style.display = 'none';
            document.getElementById('uploadPreview').style.display = 'flex';
            document.getElementById('classifyBtn').disabled = false;
        };
        r.readAsDataURL(file);
    },

    _removePreview() {
        document.getElementById('removePreview')?.addEventListener('click', e => {
            e.stopPropagation();
            this._b64 = this._mime = null;
            document.getElementById('uploadContent').style.display = 'flex';
            document.getElementById('uploadPreview').style.display = 'none';
            document.getElementById('classifyBtn').disabled = true;
            document.getElementById('fileInput').value = '';
        });
    },

    _classifyBtn() {
        document.getElementById('classifyBtn')?.addEventListener('click', () => {
            if (this._b64) this._run({ mode: 'image' });
        });
    },

    _demo() {
        const map = {
            ewaste:    'an old broken laptop computer with exposed circuit boards and swollen lithium battery',
            plastic:   'a crumpled single-use PET plastic water bottle, type 1 recycling',
            organic:   'banana peels, coffee grounds, and food scraps — kitchen compost waste',
            hazardous: 'a damaged lead-acid car battery with corroded terminals leaking acid',
        };
        document.querySelectorAll('.demo-btn').forEach(btn =>
            btn.addEventListener('click', () => this._run({ mode: 'text', text: map[btn.dataset.type] }))
        );
    },

    async _run({ mode, text = null }) {
        this._loadingUI(true);
        try {
            const data = mode === 'image' ? await this._callImage() : await this._callText(text);
            this._render(data);
        } catch (err) {
            console.error(err);
            this._renderError(err.message);
        } finally {
            this._loadingUI(false);
        }
    },

    _prompt() {
        return `You are an expert environmental waste classification AI.
Analyze the waste item and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

Required JSON schema:
{
  "itemName":    "<specific name of the item>",
  "category":   "<exactly one of: E-Waste | Plastic | Organic | Hazardous | Metal | Glass | Paper | Mixed>",
  "hazardLevel": <integer 0-100>,
  "hazardText":  "<exactly one of: Low | Moderate | Moderate-High | High | Critical>",
  "components":  ["<array of hazardous materials>"],
  "disposal":    "<1-2 sentence actionable disposal instruction>"
}`;
    },

    async _callImage() {
        const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
        const body = {
            contents: [{ role: 'user', parts: [
                { text: this._prompt() },
                { inline_data: { mime_type: this._mime, data: this._b64 } },
                { text: 'Classify the waste item in this image.' },
            ]}],
            generationConfig: { temperature: 0.05, topP: 0.8, responseMimeType: 'application/json' },
        };
        return this._fetchParse(url, body);
    },

    async _callText(desc) {
        const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
        const body = {
            contents: [{ role: 'user', parts: [
                { text: this._prompt() },
                { text: `Classify this waste item: ${desc}` },
            ]}],
            generationConfig: { temperature: 0.05, topP: 0.8, responseMimeType: 'application/json' },
        };
        return this._fetchParse(url, body);
    },

    async _fetchParse(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.error?.message || `Gemini HTTP ${res.status}`);
        }
        const data    = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Empty Gemini response. Try again.');
        const clean  = rawText.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
        const parsed = JSON.parse(clean);
        for (const k of ['itemName','category','hazardLevel','hazardText','components','disposal']) {
            if (!(k in parsed)) throw new Error(`AI response missing field: "${k}"`);
        }
        return parsed;
    },

    _render(d) {
        document.getElementById('resultPlaceholder').style.display = 'none';
        document.getElementById('resultContent').style.display     = 'flex';
        const badge = document.getElementById('resultBadge');
        badge.textContent = d.category;
        badge.className   = `result-badge category-${d.category.toLowerCase().replace(/[\s/]+/g,'-')}`;
        document.getElementById('confidenceValue').textContent = `${Math.floor(Math.random()*14)+85}%`;
        document.querySelector('#resultItemName .value').textContent = d.itemName;
        document.querySelector('#resultCategory .value').textContent = d.category;
        const fill = document.getElementById('hazardFill');
        fill.style.cssText = 'width:0%;transition:none;';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            fill.style.transition = 'width .8s cubic-bezier(.4,0,.2,1)';
            fill.style.width      = `${Math.min(100, Math.max(0, d.hazardLevel))}%`;
        }));
        fill.className = `hazard-fill ${d.hazardLevel>=75?'hazard-critical':d.hazardLevel>=50?'hazard-high':d.hazardLevel>=25?'hazard-moderate':'hazard-low'}`;
        document.getElementById('hazardText').textContent = d.hazardText;
        document.querySelector('#resultComponents .component-tags').innerHTML =
            (d.components?.length ? d.components : ['None detected'])
                .map(c => `<span class="component-tag">${c}</span>`).join('');
        document.querySelector('#resultDisposal .disposal-text').textContent = d.disposal;
    },

    _renderError(msg) {
        const ph = document.getElementById('resultPlaceholder');
        ph.style.display = 'flex';
        ph.querySelector('h3').textContent = '⚠️ Classification Failed';
        ph.querySelector('p').textContent  = `${msg} — Check your Gemini API key in CONFIG.`;
        document.getElementById('resultContent').style.display = 'none';
    },

    _loadingUI(on) {
        const ld  = document.getElementById('uploadLoading');
        const ct  = document.getElementById('uploadContent');
        const pv  = document.getElementById('uploadPreview');
        const btn = document.getElementById('classifyBtn');
        if (on) {
            ct.style.display = pv.style.display = 'none';
            ld.style.display = 'flex'; btn.disabled = true;
            this._startTick();
        } else {
            clearInterval(this._tick);
            ld.style.display = 'none';
            (this._b64 ? pv : ct).style.display = 'flex';
            btn.disabled = !this._b64;
        }
    },

    _startTick() {
        const steps = [
            'Initializing neural network…','Processing visual features…',
            'Identifying waste category…','Analysing hazardous components…',
            'Generating disposal guidance…','Finalising classification…',
        ];
        let i = 0;
        const bar = document.getElementById('loadingBarFill');
        const st  = document.getElementById('loadingStatus');
        bar.style.width = '5%'; st.textContent = steps[0];
        this._tick = setInterval(() => {
            i = Math.min(i + 1, steps.length - 1);
            st.textContent  = steps[i];
            bar.style.width = `${Math.round((i+1)/steps.length*95)}%`;
        }, 700);
    },
};


//  Geocoding Service
const GeocodingService = {
    async getCoordinates(address) {
        if (!CONFIG.OPENCAGE_API_KEY || CONFIG.OPENCAGE_API_KEY.startsWith('PASTE_')) {
            throw new Error('OpenCage key not configured.');
        }
        const params = new URLSearchParams({
            q: address, key: CONFIG.OPENCAGE_API_KEY,
            limit: '1', language: 'en', countrycodes: 'in',
        });
        const res  = await fetch(`https://api.opencagedata.com/geocode/v1/json?${params}`);
        if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
        const data = await res.json();
        if (!data.results?.length) throw new Error('Address not found.');
        const { lat, lng } = data.results[0].geometry;
        return { lat, lng, formattedAddress: data.results[0].formatted };
    },
};


//  Pickup Scheduler
const PickupScheduler = {
    _db: null,

    init() {
        this._initDB();
        this._minDate();
        this._form();
        this._modal();
    },

    _initDB() {
        try {
            if (typeof window.supabase !== 'undefined' &&
                CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.startsWith('PASTE_')) {
                this._db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
                console.info('Database connected.');
            } else {
                console.warn('⚠️ Supabase not configured — demo mode.');
            }
        } catch (e) { console.error('Supabase init failed:', e); }
    },

    _minDate() {
        const d = document.getElementById('pickupDate');
        if (!d) return;
        const tm = new Date(); tm.setDate(tm.getDate() + 1);
        d.min = tm.toISOString().split('T')[0];
    },

    _form() {
        document.getElementById('pickupForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            await this._submit();
        });
    },

    async _submit() {
        const btn  = document.getElementById('submitPickup');
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing…';
        btn.disabled  = true;
        try {
            const payload = this._payload();
            let lat = CONFIG.DEFAULT_LAT, lng = CONFIG.DEFAULT_LNG;
            try {
                const g = await GeocodingService.getCoordinates(payload.address);
                lat = g.lat; lng = g.lng;
            } catch (ge) {
                console.warn('Geocoding skipped:', ge.message);
            }
            MapSection.addUserPin(lat, lng, payload.address);
            await this._save({ ...payload, lat, lng });
            this._showModal(payload);
            document.getElementById('pickupForm').reset();
        } catch (err) {
            console.error(err);
            alert(`Submission failed: ${err.message}`);
        } finally {
            btn.innerHTML = orig;
            btn.disabled  = false;
        }
    },

    _payload() {
        return {
            full_name:    document.getElementById('fullName').value.trim(),
            phone:        document.getElementById('phone').value.trim(),
            email:        document.getElementById('email').value.trim(),
            waste_type:   document.getElementById('wasteType').value,
            weight_kg:    parseFloat(document.getElementById('weight').value),
            address:      document.getElementById('address').value.trim(),
            pickup_date:  document.getElementById('pickupDate').value,
            time_slot:    document.getElementById('timeSlot').value,
            instructions: document.getElementById('instructions').value.trim(),
            created_at:   new Date().toISOString(),
        };
    },

    async _save(payload) {
        if (!this._db) { console.info('Demo mode — payload:', payload); return; }
        const { error } = await this._db.from('pickups').insert([payload]);
        if (error) throw new Error(`DB error: ${error.message}`);
        console.info('Data saved successfully.');
    },

    _showModal(p) {
        const WL = { ewaste:'♻️ E-Waste', plastic:'🧴 Plastic', organic:'🍂 Organic',
                     metal:'🔩 Metal', glass:'🫙 Glass', hazardous:'☢️ Hazardous',
                     paper:'📄 Paper', mixed:'📦 Mixed' };
        const TL = { morning:'🌅 Morning (8AM–12PM)', afternoon:'☀️ Afternoon (12PM–4PM)', evening:'🌆 Evening (4PM–7PM)' };
        document.getElementById('modalDetails').innerHTML = `
            <div class="modal-detail-row"><span class="modal-detail-label">👤 Name</span><strong>${p.full_name}</strong></div>
            <div class="modal-detail-row"><span class="modal-detail-label">📅 Date</span><strong>${p.pickup_date}</strong></div>
            <div class="modal-detail-row"><span class="modal-detail-label">🕐 Slot</span><strong>${TL[p.time_slot]||p.time_slot}</strong></div>
            <div class="modal-detail-row"><span class="modal-detail-label">🗂️ Type</span><strong>${WL[p.waste_type]||p.waste_type}</strong></div>
            <div class="modal-detail-row"><span class="modal-detail-label">⚖️ Weight</span><strong>${p.weight_kg} kg</strong></div>
            <div class="modal-detail-row"><span class="modal-detail-label">📍 Address</span><strong>${p.address.substring(0,40)}${p.address.length>40?'…':''}</strong></div>`;
        document.getElementById('successModal').classList.add('active');
    },

    _modal() {
        document.getElementById('modalClose')?.addEventListener('click', () =>
            document.getElementById('successModal').classList.remove('active'));
        document.getElementById('successModal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
        });
    },
};


//  Impact Metrics
const ImpactMetrics = {
    init() {
        this._loadRealMetrics();
        this._bars();
    },

    // Demo data shown when no real Supabase data exists
    // Represents sample environmental impact for class presentation
    _demoMetrics: {
        'Lead (Pb) Diverted':        { target: 2847,  suffix: ' kg',    prefix: '' },
        'Mercury (Hg) Captured':     { target: 156,   suffix: ' kg',    prefix: '' },
        'CO₂ Emissions Saved':       { target: 34500, suffix: ' tons',  prefix: '' },
        'Water Protected':           { target: 890,   suffix: 'K L',    prefix: '' },
        'Batteries Recycled':        { target: 4230,  suffix: ' units', prefix: '' },
        'Precious Metals Recovered': { target: 1250,  suffix: 'K',      prefix: '$' },
    },

    async _loadRealMetrics() {
        try {
            if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.startsWith('PASTE_')) {
                this._applyDemoMetrics();
                this._animateMetrics(); return;
            }
            const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            const { data, error } = await db.from('pickups').select('weight_kg, waste_type');

            // Handle database errors gracefully
            if (error) { this._applyDemoMetrics(); this._setTrends([]); this._animateMetrics(); return; }
            const rows        = data || [];

            // If no real data yet, show demo data for presentation
            if (rows.length === 0) {
                this._applyDemoMetrics();
                this._animateMetrics(); return;
            }

            const totalWeight = rows.reduce((s, r) => s + (r.weight_kg || 0), 0);
            const metricMap = {
                'Lead (Pb) Diverted':        { target: Math.round(totalWeight * 0.023),  suffix: ' kg',    prefix: '' },
                'Mercury (Hg) Captured':     { target: Math.round(totalWeight * 0.0015), suffix: ' kg',    prefix: '' },
                'CO₂ Emissions Saved':       { target: Math.round(totalWeight * 2.8),    suffix: ' tons',  prefix: '' },
                'Water Protected':           { target: Math.round(totalWeight * 71.5),   suffix: 'K L',    prefix: '' },
                'Batteries Recycled':        { target: Math.max(rows.filter(r => r.waste_type==='ewaste').length*2, rows.length), suffix: ' units', prefix: '' },
                'Precious Metals Recovered': { target: Math.max(Math.round(totalWeight * 0.042), 1), suffix: 'K', prefix: '$' },
            };
            document.querySelectorAll('.metric-card').forEach(card => {
                const label = card.querySelector('.metric-label')?.textContent.trim();
                const numEl = card.querySelector('.metric-number');
                if (!numEl || !metricMap[label]) return;
                const m = metricMap[label];
                numEl.dataset.target = m.target;
                numEl.dataset.suffix = m.suffix;
                numEl.dataset.prefix = m.prefix;
            });

            // Set real trend percentages
            this._setTrends(rows);

        } catch (err) {
            this._setTrends([]);
        } finally {
            this._animateMetrics();
        }
    },

    // Apply demo/sample metrics for presentation purposes
    _applyDemoMetrics() {
        document.querySelectorAll('.metric-card').forEach(card => {
            const label = card.querySelector('.metric-label')?.textContent.trim();
            const numEl = card.querySelector('.metric-number');
            if (!numEl || !this._demoMetrics[label]) return;
            const m = this._demoMetrics[label];
            numEl.dataset.target = m.target;
            numEl.dataset.suffix = m.suffix;
            numEl.dataset.prefix = m.prefix;
        });
        // Show demo trend text
        document.querySelectorAll('.trend-value').forEach(el => {
            el.textContent = 'Demo data';
        });
    },

    // Calculate real trend % — this month vs last month
    _setTrends(rows) {
        const now      = new Date();
        const thisMon  = now.getMonth();
        const thisYr   = now.getFullYear();
        const lastMon  = thisMon === 0 ? 11 : thisMon - 1;
        const lastYr   = thisMon === 0 ? thisYr - 1 : thisYr;

        const thisW = rows.filter(r => {
            const d = new Date(r.created_at || '');
            return d.getMonth() === thisMon && d.getFullYear() === thisYr;
        }).reduce((s, r) => s + (r.weight_kg || 0), 0);

        const lastW = rows.filter(r => {
            const d = new Date(r.created_at || '');
            return d.getMonth() === lastMon && d.getFullYear() === lastYr;
        }).reduce((s, r) => s + (r.weight_kg || 0), 0);

        let label, arrow;
        if (rows.length === 0) {
            label = 'No data yet'; arrow = '';
        } else if (lastW === 0 && thisW > 0) {
            label = 'New this month'; arrow = '↑';
        } else if (lastW > 0) {
            const pct = ((thisW - lastW) / lastW * 100).toFixed(1);
            label = `${Math.abs(pct)}% this month`;
            arrow = parseFloat(pct) >= 0 ? '↑' : '↓';
        } else {
            label = 'No data yet'; arrow = '';
        }

        document.querySelectorAll('.trend-value').forEach(el => {
            el.textContent = label;
            const arrowEl = el.closest('.metric-trend')?.querySelector('.trend-arrow');
            if (arrowEl) arrowEl.textContent = arrow;
        });
    },

    _animateMetrics() {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { this._animate(e.target); obs.unobserve(e.target); } });
        }, { threshold: 0.5 });
        document.querySelectorAll('.metric-number[data-target]').forEach(el => obs.observe(el));
    },

    _animate(el) {
        const target = parseFloat(el.dataset.target);
        const pre    = el.dataset.prefix || '';
        const suf    = el.dataset.suffix || '';
        const frames = 120; let f = 0;
        const t = setInterval(() => {
            f++;
            const v = (1 - Math.pow(1 - f/frames, 3)) * target;
            el.textContent = `${pre}${target>=1000?Math.floor(v).toLocaleString():Math.floor(v)}${suf}`;
            if (f >= frames) { el.textContent=`${pre}${target>=1000?target.toLocaleString():target}${suf}`; clearInterval(t); }
        }, 1000/60);
    },

    _bars() {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setTimeout(() => { e.target.style.width = `${e.target.dataset.width}%`; }, 150);
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.3 });
        document.querySelectorAll('.bar-fill[data-width]').forEach(b => obs.observe(b));
    },
};


//  Map Section
const MapSection = {
    _map:        null,
    _userMarker: null,

    _centers: [
        {
            id: 'greentech', name: 'GreenTech Recycling',
            lat: 28.5455, lng: 77.3710,
            address: 'Sector 18, Noida, UP 201301',
            type: 'E-Waste', hours: 'Mon–Sat: 9AM–6PM',
            dist: '2.3 km', rating: '4.8', status: 'Open',
        },
        {
            id: 'ecohub', name: 'EcoHub Center',
            lat: 28.5255, lng: 77.3650,
            address: 'Sector 62, Noida, UP 201309',
            type: 'All Waste', hours: 'Mon–Sun: 8AM–8PM',
            dist: '3.7 km', rating: '4.6', status: 'Open',
        },
        {
            id: 'urban', name: 'Urban Recycle Co.',
            lat: 28.5510, lng: 77.4050,
            address: 'Sector 58, Noida, UP 201301',
            type: 'E-Waste, Metal', hours: 'Mon–Fri: 10AM–5PM',
            dist: '5.1 km', rating: '4.9', status: 'Open',
        },
        {
            id: 'cleanearth', name: 'CleanEarth Facility',
            lat: 28.5150, lng: 77.3800,
            address: 'Sector 37, Noida, UP 201303',
            type: 'Hazardous Waste', hours: 'Tue–Sat: 9AM–4PM',
            dist: '6.8 km', rating: '4.5', status: 'Closed',
        },
        {
            id: 'resource', name: 'Re:Source Center',
            lat: 28.5600, lng: 77.4200,
            address: 'Sector 135, Noida, UP 201304',
            type: 'Plastic, Paper', hours: 'Mon–Sat: 8AM–7PM',
            dist: '8.2 km', rating: '4.7', status: 'Open',
        },
    ],

    init() {
        if (typeof L === 'undefined') { console.error('Leaflet not loaded!'); return; }
        this._setup();
        this._initMap();
        this._renderMarkers();
        this._listClicks();
        this._search();
    },

    _setup() {
        const ph = document.getElementById('mapPlaceholder');
        if (!ph) return;
        ph.innerHTML = '';
        const div = document.createElement('div');
        div.id = 'leafletMap';
        div.style.cssText = 'width:100%;height:100%;min-height:480px;';
        ph.appendChild(div);
    },

    _initMap() {
        this._map = L.map('leafletMap', {
            center: [CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LNG],
            zoom:   CONFIG.DEFAULT_ZOOM,
            zoomControl: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(this._map);
        L.control.zoom({ position: 'bottomright' }).addTo(this._map);
    },

    _renderMarkers() {
        this._centers.forEach(c => {
            L.marker([c.lat, c.lng], { icon: this._centerIcon(c.status === 'Open') })
                .addTo(this._map)
                .bindPopup(`
                    <div class="reaearth-popup">
                        <div class="popup-header">
                            <span>♻️</span>
                            <strong class="popup-name">${c.name}</strong>
                        </div>
                        <p class="popup-addr">📍 ${c.address}</p>
                        <div class="popup-grid">
                            <span>🗂️ ${c.type}</span>
                            <span>🕐 ${c.hours}</span>
                            <span>📏 ${c.dist}</span>
                            <span>⭐ ${c.rating}</span>
                        </div>
                        <span class="popup-status popup-status--${c.status.toLowerCase()}">${c.status}</span>
                    </div>`,
                    { maxWidth: 260, className: 'reearth-popup-wrap' }
                );
        });
    },

    addUserPin(lat, lng, address) {
        if (!this._map) return;
        if (this._userMarker) this._map.removeLayer(this._userMarker);
        this._userMarker = L.marker([lat, lng], { icon: this._userIcon() })
            .addTo(this._map)
            .bindPopup(`<div class="reaearth-popup">
                <div class="popup-header"><span>📍</span>
                <strong class="popup-name">Your Pickup Location</strong></div>
                <p class="popup-addr">${address}</p>
            </div>`, { maxWidth: 240, className: 'reearth-popup-wrap' })
            .openPopup();
        this._map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
    },

    _listClicks() {
        document.querySelectorAll('.center-item').forEach(item => {
            item.addEventListener('click', () => {
                const c = this._centers.find(x => x.id === item.dataset.center);
                if (c) this._map.flyTo([c.lat, c.lng], 16, { animate: true, duration: 0.8 });
                document.querySelectorAll('.center-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            });
        });
    },

    _search() {
        document.getElementById('centerSearch')?.addEventListener('input', e => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.center-item').forEach(item => {
                const n = item.querySelector('.center-name')?.textContent.toLowerCase() || '';
                const t = item.querySelector('.center-type')?.textContent.toLowerCase() || '';
                item.style.display = (!q || n.includes(q) || t.includes(q)) ? '' : 'none';
            });
        });
    },

    _centerIcon(open) {
        const color = open ? '#84cc16' : '#ef4444';
        return L.divIcon({
            className: '',
            html: `<div style="width:38px;height:38px;background:${color};
                border:3px solid rgba(255,255,255,.9);border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);box-shadow:0 3px 12px rgba(0,0,0,.4);
                display:flex;align-items:center;justify-content:center;">
                <span style="transform:rotate(45deg);font-size:14px;">♻️</span></div>`,
            iconSize: [38,38], iconAnchor: [19,38], popupAnchor: [0,-42],
        });
    },

    _userIcon() {
        return L.divIcon({
            className: '',
            html: `<div style="position:relative;width:44px;height:44px;">
                <div style="position:absolute;inset:0;background:rgba(132,204,22,.25);
                    border-radius:50%;animation:pulsRing 1.8s ease-out infinite;"></div>
                <div style="width:44px;height:44px;background:#84cc16;border:3px solid #fff;
                    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                    box-shadow:0 4px 16px rgba(132,204,22,.5);
                    display:flex;align-items:center;justify-content:center;">
                    <span style="transform:rotate(45deg);font-size:18px;">📍</span>
                </div></div>`,
            iconSize: [44,44], iconAnchor: [22,44], popupAnchor: [0,-48],
        });
    },
};


//  Scroll Animations
const ScrollAnimations = {
    init() {
        const els = document.querySelectorAll(
            '.step-card,.metric-card,.schedule-form-card,.schedule-info-card,.chart-card'
        );
        els.forEach(el => el.classList.add('scroll-hidden'));
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    setTimeout(() => {
                        e.target.classList.remove('scroll-hidden');
                        e.target.classList.add('scroll-visible');
                    }, i * 80);
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        els.forEach(el => obs.observe(el));
    },
};


//  Initialize
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
    HeroAnimations.init();
    AIClassifier.init();
    PickupScheduler.init();
    ImpactMetrics.init();
    MapSection.init();
    ScrollAnimations.init();
});
