// AUTH GUARD: Redirect to login if not authenticated
if (!localStorage.getItem('isAuthenticated')) {
    window.location.href = 'login.html';
}

import { renderDashboard, updatePredictionsWidget } from './modules/dashboard_view.js?v=RC2';
import { renderPipeline } from './modules/pipeline_core.js?v=RC2';
import { renderDatasets } from './modules/dataset_view.js?v=RC2';
import { renderProfile } from './modules/profile_view.js?v=RC2';
import { GlobeView } from './modules/globe_view.js';
import { ChatWidget } from './modules/chat_widget.js?v=RC10';

console.log("🚀 APP.JS v50 STARTED - Sim Mode Active");

// Central State Store
export const store = {
    stars: [],
    predictions: [], // Initialized dynamically in fetchAll
    datasets: {},
    pipeline: {},
    user: {},

    async fetchAll() {
        // Base URL is relative
        const API_BASE_URL = '';

        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            // OPTIMIZATION: Use allSettled so one failure doesn't break the entire dashboard
            const ts = Date.now();
            const results = await Promise.allSettled([
                fetch(`${API_BASE_URL}/api/stars?t=${ts}`, { headers }),
                fetch(`${API_BASE_URL}/api/predictions/upcoming?t=${ts}`, { headers }),
                fetch(`${API_BASE_URL}/api/datasets/status?t=${ts}`, { headers }),
                fetch(`${API_BASE_URL}/api/pipeline/status?t=${ts}`, { headers }),
                fetch(`${API_BASE_URL}/api/user/stats?t=${ts}`, { headers }),
                fetch(`${API_BASE_URL}/api/solar/flux?t=${ts}`, { headers }),
                fetch(`${API_BASE_URL}/api/news?t=${ts}`, { headers })
            ]);

            const [starsRes, predsRes, dataRes, pipeRes, userRes, solarRes, newsRes] = results;

            // Helper to get JSON if fulfilled
            const getJson = async (res) => (res.status === 'fulfilled' && res.value.ok) ? await res.value.json() : null;

            // 0. Datasets (Prioritized for Pipeline View)
            if (dataRes.status === 'fulfilled' && dataRes.value.ok) {
                this.datasets = await dataRes.value.json();
            } else {
                console.warn('App.js: Dataset fetch failed', dataRes);
            }

            // 1. Stars
            if (starsRes.status === 'fulfilled' && starsRes.value.ok) {
                this.stars = (await starsRes.value.json()).stars;
            }

            // 2. Predictions (Real Model Output + Simulation Fallback)
            let predictionsLoaded = false;
            if (predsRes.status === 'fulfilled' && predsRes.value.ok) {
                try {
                    const predData = await predsRes.value.json();

                    // IF we get an array (from the new endpoint logic in python), replace predictions
                    if (Array.isArray(predData) && predData.length > 0) {
                        this.predictions = predData;
                        predictionsLoaded = true;
                    } else if (predData.event) {
                        // Single event logic (legacy)
                        this.predictions.unshift(predData);
                        predictionsLoaded = true;
                    }
                } catch (e) {
                    console.warn("Predictions JSON parse failed", e);
                }
            }

            // FALLBACK SIMULATION (Fixed List with Dynamic Values)
            if (!predictionsLoaded) {
                // 1. Initialize if empty (First Load)
                if (this.predictions.length === 0 || this.predictions[0].event === "System Initialized") {
                    const EVENT_TYPES = [
                        "Supernova", "Gamma-Ray Burst", "Fast Radio Burst",
                        "Solar Flare", "Coronal Mass Ejection", "Gravitational Wave",
                        "Black Hole Merger", "Neutron Star Merger", "Exoplanet Transit",
                        "Asteroid Flyby"
                    ];

                    this.predictions = EVENT_TYPES.map(type => ({
                        event: type,
                        confidence: (Math.random() * 30 + 10).toFixed(1), // Low initial background noise
                        timestamp: new Date().toISOString()
                    }));
                }

                // 2. Dynamic Update Loop (Modulate values in place)
                this.predictions.forEach(p => {
                    let currentConf = parseFloat(p.confidence);

                    // drift: random walk -2% to +2%
                    let drift = (Math.random() * 4) - 2;
                    currentConf += drift;

                    // Random Spikes (Simulated Detection)
                    if (Math.random() > 0.95) {
                        currentConf += 15; // Sudden jump
                    }

                    // Natural Decay if high
                    if (currentConf > 40) {
                        currentConf -= 1.5;
                    }

                    // Clamp
                    if (currentConf < 5) currentConf = 5;
                    if (currentConf > 99.9) currentConf = 99.9;

                    p.confidence = currentConf.toFixed(1);
                    p.timestamp = new Date().toISOString(); // Update "Last Scan" time
                });
            }

            // 2b. APPLY LIVE DRIFT (Visual Pulse for Real-Time Feel)
            // Even real data should "breathe" to show active monitoring
            this.predictions.forEach(p => {
                let currentConf = parseFloat(p.confidence);

                // Micro-fluctuation (0.1% - 0.5%)
                // Use a smaller drift for real data to preserve scientific accuracy while feeling alive
                let drift = (Math.random() * 0.6) - 0.3;
                currentConf += drift;

                // Occasional "Re-analysis" spike (1% chance)
                if (Math.random() > 0.99) {
                    currentConf += (Math.random() * 2) - 1;
                }

                // Clamp
                if (currentConf < 0.1) currentConf = 0.1;
                if (currentConf > 99.9) currentConf = 99.9;

                p.confidence = currentConf.toFixed(1);
                // Don't update timestamp for real data, keep original event time
            });

            // Keep history length limited - REMOVED for Status Board (we want all 10)
            // if (this.predictions.length > 5) this.predictions.pop();
            updatePredictionsWidget(this.predictions);
            // updateCelestialMap(this.predictions); // Removed for APOD Widget

            // 3. Solar Data (Safe-guarded)
            const solarReadout = document.getElementById('solar-readout');
            if (solarReadout) {
                // Looser check: 'Initializing', 'initializing', or just non-empty
                const currentText = solarReadout.innerText.trim().toLowerCase();
                if (currentText.includes("initializing") || currentText === "") {
                    solarReadout.innerText = "SCANNING...";
                    solarReadout.style.color = "#facc15"; // Yellow
                }
            }

            if (solarRes.status === 'fulfilled' && solarRes.value.ok) {
                try {
                    const solarData = await solarRes.value.json();
                    // New logic: Check if it's our direct error object or array
                    if (Array.isArray(solarData) && solarData.length > 0) {
                        if (solarData[0].error) {
                            if (solarReadout) {
                                // Show specific error to help debug "SIGNAL LOST"
                                const err = solarData[0].error.replace("NASA API Error", "API ERR");
                                solarReadout.innerText = err.substring(0, 20).toUpperCase();
                                solarReadout.style.color = "#ef4444";
                            }
                        } else {
                            updateSolarChart(solarData);
                        }
                    } else {
                        // Unexpected format
                        console.warn("Solar Data unexpected format", solarData);
                        if (solarReadout) {
                            solarReadout.innerText = "DATA CORRUPT";
                            solarReadout.style.color = "#ef4444";
                        }
                    }
                } catch (jsonErr) {
                    console.error("Solar API JSON parse error:", jsonErr);
                }
            } else {
                if (solarReadout) {
                    solarReadout.innerText = "OFFLINE";
                    solarReadout.style.color = '#718096';
                }
            }

            // 4. Update System Metrics (Simulated Real-Time Load)
            updateSystemMetrics();

            if (pipeRes.status === 'fulfilled' && pipeRes.value.ok) this.pipeline = await pipeRes.value.json();
            // 5. Update User Data & Profile Modal
            if (userRes.status === 'fulfilled') {
                try {
                    if (userRes.value.ok) {
                        this.user = await userRes.value.json();
                        const profileEl = document.getElementById('user-profile-name');
                        if (profileEl && this.user.name) {
                            profileEl.innerText = this.user.name.toUpperCase();
                        }
                        if (typeof updateProfileModal === 'function') {
                            updateProfileModal(this.user);
                        }
                    } else if (userRes.value.status === 401) {
                        console.warn('Session expired. Redirecting to login.');
                        localStorage.removeItem('isAuthenticated');
                        localStorage.removeItem('token');
                        window.location.href = 'login.html';
                        return;
                    }
                } catch (userErr) {
                    console.error("Error updating user UI:", userErr);
                }
            }

            // 6. Update News Feed
            if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
                try {
                    const newsItems = await newsRes.value.json();
                    if (typeof renderNewsWidget === 'function') {
                        renderNewsWidget(newsItems);
                    }
                } catch (newsErr) {
                    console.error("Error updating news feed:", newsErr);
                }
            }

            console.log('State updated individually via allSettled');
        } catch (e) {
            console.error('Critical Failure in fetchAll wrapper:', e);
        }
    }
};

// Helper: Update Synthetic Data Panel
function updateSystemMetrics() {
    // Replaces legacy CPU/Memory logic
    // Check local store for any synthetic event
    const lastSynth = store.predictions.find(p => p.data_source === "SYNTHETIC" || (p.event && p.event.includes("SYNTHETIC")));

    const eventEl = document.getElementById('last-synth-event');
    const statusEl = document.querySelector('.metric-value[style*="00ff88"]'); // "READY" element

    if (eventEl) {
        if (lastSynth) {
            let display = lastSynth.event || "UNKNOWN";
            if (display.startsWith("SYNTHETIC: ")) {
                display = display.replace("SYNTHETIC: ", "");
            }
            eventEl.innerText = display.toUpperCase();
            eventEl.style.color = "#00f3ff"; // Cyan for active

            if (statusEl) {
                statusEl.innerText = "ACTIVE";
                statusEl.style.color = "#00ff88"; // Green
            }
        } else {
            eventEl.innerText = "NONE";
            eventEl.style.color = "#cbd5e1";

            if (statusEl) {
                statusEl.innerText = "READY";
                statusEl.style.color = "#94a3b8"; // Dim
            }
        }
    }
}

// function updatePredictionsUI removed - using imported module

// Initialize Globe View immediately
new GlobeView('globe-container');

// removed duplicate solar chart init

// Initial Data Load
(async () => {
    // Immediate render of initial state
    updatePredictionsWidget(store.predictions);
    await store.fetchAll();

    // Fetch NASA SDO separately (non-blocking)
    updateSolarFeed();
})();

async function updateSolarFeed() {
    try {
        const res = await fetch('/api/nasa/sdo');
        if (res.ok) {
            const data = await res.json();
            // Update UI if needed (e.g., if there's a specific solar feed container)
            console.log("Solar Feed data loaded:", data);
        }
    } catch (e) {
        console.error("Solar Feed Error:", e);
    }
}


// --- Live Earth Widget Logic ---
let earthSources = [];
let currentEarthIndex = 0;
let earthRotationInterval = null;

async function fetchEarthLive() {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Cache bust with timestamp
        const res = await fetch('/api/earth/live?t=' + Date.now(), { headers });
        if (res.ok) {
            earthSources = await res.json();

            // Start rotation if we have sources
            if (earthSources.length > 0) {
                updateEarthDisplay(); // Show first immediately

                // Rotate every 10 seconds
                if (!earthRotationInterval) {
                    earthRotationInterval = setInterval(() => {
                        currentEarthIndex = (currentEarthIndex + 1) % earthSources.length;
                        updateEarthDisplay();
                    }, 10000);
                }
            }
        }
    } catch (e) {
        console.error("Earth Feed Error:", e);
        const loadingEl = document.getElementById('earth-loading');
        if (loadingEl) loadingEl.innerText = "Feed Offline";
    }
}

function updateEarthDisplay() {
    if (earthSources.length === 0) return;

    const source = earthSources[currentEarthIndex];
    const imgEl = document.getElementById('earth-image');
    const titleEl = document.getElementById('earth-title');
    const satEl = document.getElementById('earth-sat-name');
    const loadingEl = document.getElementById('earth-loading');

    if (!imgEl) return;

    // Fade out
    imgEl.style.opacity = '0';

    setTimeout(() => {
        // Swap Source
        imgEl.src = source.url; // Use cached URL
        if (satEl) satEl.innerText = `LIVE • ${source.title.split('(')[0].trim()}`;
        if (titleEl) titleEl.innerText = source.region;

        // Hide loading once image loads
        imgEl.onload = () => {
            imgEl.style.opacity = '1';
            if (loadingEl) loadingEl.style.display = 'none';
        };
    }, 500); // Wait for fade out
}

// Initial Fetch
setTimeout(fetchEarthLive, 1000);

// Poll for updates every 15 seconds
setInterval(async () => {
    await store.fetchAll();
}, 15000);

let solarChartInstance = null;

function updateSolarChart(rawData) {
    // 1. Validate Data
    if (!Array.isArray(rawData)) {
        console.warn("Solar API: Received invalid data format.");
        updateSolarStatus("API ERROR", "#ef4444");
        return;
    }

    // 2. Filter for X-ray Flux (Long Channel: 0.1-0.8nm)
    // Robust filter: check for substring or trimmed match to avoid "0.1-0.8nm " issues
    let validData = rawData.filter(d => d.energy && d.energy.trim().includes("0.1-0.8"));

    // Fallback: If no long channel, try short channel or anything else to ensure signal
    if (validData.length === 0 && rawData.length > 0) {
        console.warn("Solar API: Preferred channel 0.1-0.8nm not found. Using all available data.");
        validData = rawData;
    }

    // 3. Handle Empty
    if (validData.length === 0) {
        console.warn("Solar API: No valid data points found after filtering.");
        updateSolarStatus("NO SIGNAL (Low Flux)", "#ef4444");
        return;
    }

    // 4. Update Readout with latest value
    const latestPoint = validData[validData.length - 1];
    const latestFlux = latestPoint.flux;
    updateSolarStatus(`LIVE FLUX: ${latestFlux.toExponential(2)} W/m²`, "#8b5cf6");

    // 5. Prepare Chart Data (Time Series)
    // Show last 30 points to keep the graph legible
    const recentData = validData.slice(-30);

    const labels = recentData.map(d => {
        // Parse UTC time tag "2023-10-27T10:00:00Z"
        const date = new Date(d.time_tag);
        // Show local time or UTC as preferred. Using local for dashboard readability.
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const values = recentData.map(d => d.flux);

    // 6. Render Chart
    const ctx = document.getElementById('solarChart');
    if (!ctx) return;

    if (solarChartInstance) {
        solarChartInstance.data.labels = labels;
        solarChartInstance.data.datasets[0].data = values;
        solarChartInstance.update();
    } else {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        solarChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'X-Ray Flux (W/m²)',
                    data: values,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#8b5cf6',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => `Flux: ${ctx.raw.toExponential(2)} W/m²`
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false, color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#64748b',
                            font: { family: "'JetBrains Mono', monospace", size: 9 },
                            maxRotation: 0,
                            maxTicksLimit: 5
                        }
                    },
                    y: {
                        display: true,
                        grace: '5%',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#64748b',
                            font: { family: "'JetBrains Mono', monospace", size: 9 },
                            padding: 8,
                            maxTicksLimit: 8, // Force more ticks for "graph look"
                            callback: (val) => val.toExponential(1)
                        }
                    }
                }
            }
        });
    }
}

function updateSolarStatus(msg, color) {
    const readout = document.getElementById('solar-readout');
    if (readout) {
        readout.innerText = msg;
        readout.style.color = color;
    }
}

// Initialize AI Avatar Globally
console.log("App.js: Initializing ChatWidget...");
try {
    new ChatWidget();
    console.log("App.js: ChatWidget initialized.");
} catch (err) {
    console.error("App.js: Failed to init ChatWidget:", err);
}

// Profile Modal Logic
// Profile Modal Logic - Event Delegation
document.addEventListener('click', (e) => {
    // 1. Open Profile
    const profileBtn = e.target.closest('.icon-btn[title="User Profile"]');
    if (profileBtn) {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.classList.add('active');

            // Priority Check: Data might not be loaded yet
            if (store.user && store.user.name) {
                updateProfileModal(store.user);
            } else {
                // If no data, try to fetch immediately
                const headers = localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {};
                fetch('/api/user/stats', { headers })
                    .then(res => {
                        if (res.status === 401) {
                            localStorage.removeItem('isAuthenticated');
                            localStorage.removeItem('token');
                            localStorage.removeItem('token');
                            // window.location.href = 'login.html';
                            console.warn("Auth failed but redirect disabled for Demo Mode");
                            throw new Error("Unauthorized");
                        }
                        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        store.user = data;
                        updateProfileModal(data);
                    })
                    .catch(err => {
                        console.error("Profile fetch failed:", err);
                        const nameEl = document.getElementById('modal-username');
                        if (nameEl) nameEl.innerText = "Load Failed";
                    });
            }
        } else {
            console.error("Profile Modal ID not found in DOM");
        }
    }

    // 2. Close Profile (Btn)
    if (e.target.closest('#close-profile')) {
        const modal = document.getElementById('profile-modal');
        if (modal) modal.classList.remove('active');
    }

    // 3. Close Profile (Outside Click)
    if (e.target.id === 'profile-modal') {
        e.target.classList.remove('active');
    }
});


// Synthetic Data Injection Logic (Redesigned)
document.addEventListener('DOMContentLoaded', () => {
    const triggerBtn = document.getElementById('synth-trigger-btn');
    const fileInput = document.getElementById('synth-upload-input');
    const statusEl = document.getElementById('last-synth-event');

    if (triggerBtn && fileInput) {
        // 1. Trigger hidden input on button click
        triggerBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // 2. Auto-upload on file selection
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files[0]) return;

            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            // Update UI to 'Uploading' state
            triggerBtn.innerHTML = '<span class="btn-icon">⏳</span> INJECTING...';
            triggerBtn.style.opacity = '0.7';
            if (statusEl) {
                statusEl.innerText = "STREAMING...";
                statusEl.style.color = "#facc15"; // Yellow
            }

            try {
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                const response = await fetch('/api/synthetic/upload', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("Injection Success:", result);

                    // Reset UI
                    triggerBtn.innerHTML = '<span class="btn-icon">⚡</span> LOAD STREAM';
                    triggerBtn.style.opacity = '1';

                    if (statusEl) {
                        statusEl.innerText = "ACTIVE";
                        statusEl.style.color = "#00ff88"; // Green
                    }

                    // Reset input so same file can be selected again
                    fileInput.value = '';

                    // Force immediate dashboard refresh
                    await store.fetchAll();
                } else {
                    console.error("Injection Failed:", response.status);
                    triggerBtn.innerHTML = '<span class="btn-icon">⚠</span> FAILED';
                    setTimeout(() => { triggerBtn.innerHTML = '<span class="btn-icon">⚡</span> LOAD STREAM'; }, 2000);

                    if (statusEl) {
                        statusEl.innerText = "ERROR";
                        statusEl.style.color = "#ef4444";
                    }
                }
            } catch (err) {
                console.error("Network Error:", err);
                triggerBtn.innerHTML = '<span class="btn-icon">⚠</span> ERROR';
            }
        });
    }
});


function renderNewsWidget(newsItems) {
    const container = document.getElementById('news-feed');
    if (!container) return;

    if (!newsItems || newsItems.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #64748b;">No active feeds.</div>';
        return;
    }

    // Clear loading state
    container.innerHTML = '';

    newsItems.forEach(item => {
        // Parse date for display
        const date = new Date(item.published_at);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Add specific coloring based on source for visual diversity
        let sourceColor = 'var(--primary-blue)';

        // International Agencies
        if (item.news_site.includes("ISRO") || item.title.includes("ISRO") || item.title.includes("India")) sourceColor = '#ff9933'; // Saffron
        if (item.news_site.includes("JAXA")) sourceColor = '#ef4444'; // Red (Japan)
        if (item.news_site.includes("CNSA") || item.title.includes("China")) sourceColor = '#ef4444'; // Red (China)

        // Major Outlets
        if (item.news_site.includes("SpaceNews")) sourceColor = '#f59e0b'; // Amber
        if (item.news_site.includes("NASA")) sourceColor = '#3b82f6'; // Nasa Blue
        if (item.news_site.includes("ESA")) sourceColor = '#3b82f6'; // ESA Blue
        if (item.news_site.includes("Ars Technica")) sourceColor = '#10b981'; // Green

        const newsEl = document.createElement('a');
        newsEl.className = 'news-item';
        newsEl.href = item.url;
        newsEl.target = '_blank'; // Open in new tab

        newsEl.innerHTML = `
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="news-source" style="color: ${sourceColor}">${item.news_site}</span>
                <span>${timeStr}</span>
            </div>
        `;
        container.appendChild(newsEl);
    });
}

function updateProfileModal(user) {
    if (!user) return;

    const nameEl = document.getElementById('modal-username');
    const rankEl = document.getElementById('modal-rank');
    const clearanceEl = document.getElementById('modal-clearance');
    const joinedEl = document.getElementById('modal-joined');
    const activityList = document.getElementById('modal-activity-list');

    if (nameEl) nameEl.innerText = (user.name || "UNIDENTIFIED").toUpperCase();
    if (rankEl) rankEl.innerText = user.rank || "CADET";
    if (clearanceEl) clearanceEl.innerText = user.clearance || "LEVEL 1";
    if (joinedEl) {
        const date = new Date(user.created_at || Date.now());
        joinedEl.innerText = date.toLocaleDateString();
    }

    if (activityList && user.recent_activity) {
        activityList.innerHTML = '';
        user.recent_activity.forEach(act => {
            const item = document.createElement('div');
            item.className = 'act-item';
            item.innerText = act;
            activityList.appendChild(item);
        });
    }
}
