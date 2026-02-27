
export function renderDashboard(container, store) {
    const predictions = store.predictions || [];

    // Mock data for the chart
    const solarData = [15, 35, 25, 45, 30, 60, 50, 85, 40, 65, 55, 70];
    const labels = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];

    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Main Visualization Panel -->
            <div class="viz-panel glass-panel">
                <div id="globe-container"></div>
                
                <!-- Floating HUD Elements -->
                <div class="hud-element" style="top: 25%; left: 25%;">
                    <div class="hud-icon" style="border-color: #ff0055; color: #ff0055; box-shadow: 0 0 15px rgba(255, 0, 85, 0.3);">☀️</div>
                    <div class="hud-label">Solar Flare Alert</div>
                </div>
                
                <div class="hud-element" style="top: 40%; right: 20%;">
                    <div class="hud-icon" style="border-color: #00f3ff; color: #00f3ff; box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);">⚡</div>
                    <div class="hud-label">Gamma-Ray Burst</div>
                </div>
                
                <div class="hud-element" style="bottom: 30%; left: 20%;">
                    <div class="hud-icon" style="border-color: #ff9f1c; color: #ff9f1c; box-shadow: 0 0 15px rgba(255, 159, 28, 0.3);">☄️</div>
                    <div class="hud-label">Asteroid Pass</div>
                </div>
                
                <!-- Orbit Lines -->
                <div class="orbit-ring ring-1"></div>
                <div class="orbit-ring ring-2"></div>
                <div class="orbit-ring ring-3"></div>
                
                <!-- Bottom Controls -->
                <div class="viz-controls">
                    <div class="control-btn active">🌐</div>
                    <div class="control-btn">👁️</div>
                    <div class="control-btn">🎯</div>
                </div>
            </div>

            <!-- Right Panel: Widgets -->
            <div class="widgets-panel">
                <!-- Upcoming Predictions -->
                <div class="widget-card glass-panel">
                    <div class="widget-header">
                        <span class="widget-title">UPCOMING PREDICTIONS</span>
                    </div>
                    <div class="prediction-list" id="prediction-list-container">
                        ${predictions.length > 0 ? predictions.map(p => `
                        <div class="pred-item">
                            <div class="pred-row">
                                <span class="pred-label">Event:</span>
                                <span class="pred-prob text-green">Conf: ${p.confidence}%</span>
                            </div>
                            <div class="pred-value">${p.event}</div>
                            <div class="pred-date" style="font-size: 0.75rem; color: #94a3b8;">${new Date(p.timestamp).toLocaleTimeString()}</div>
                        </div>
                        `).join('') : '<div class="pred-item"><span class="pred-date">Scanning deep space...</span></div>'}
                    </div>
                </div>

                <!-- Solar Activity Forecast -->
                <div class="widget-card glass-panel">
                    <div class="widget-header">
                        <span class="widget-title">SOLAR ACTIVITY FORECAST</span>
                    </div>
                    <div class="chart-container">
                        <canvas id="solarChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize Three.js Globe
    initGlobe(store.stars);

    // Initialize Chart.js
    initChart(labels, solarData);
}

// Exportable update function to avoid re-rendering the whole dashboard (which resets the Globe)
export function updatePredictionsWidget(predictions) {
    const container = document.getElementById('upcoming-predictions-list');
    if (!container) return;

    // Sort by confidence (High to Low) to bring critical events to top
    const sortedPredictions = [...predictions].sort((a, b) => parseFloat(b.confidence) - parseFloat(a.confidence));

    container.innerHTML = sortedPredictions.length > 0 ? sortedPredictions.map(p => {
        // Formatting Logic
        let confidenceVal = parseFloat(p.confidence);
        // Handle case where confidence is 0.0-1.0 vs 0-100
        if (confidenceVal < 1.0) confidenceVal *= 100;

        let displayConf = confidenceVal.toFixed(1);
        let confColor = '#00ff88'; // Green
        if (confidenceVal < 80) confColor = '#facc15'; // Yellow
        if (confidenceVal < 60) confColor = '#ef4444'; // Red

        let displayEvent = p.event;
        if (displayEvent === "Unknown Anomaly") displayEvent = "Unidentified Signal";
        if (displayEvent === "Planet Crossing") displayEvent = "Exoplanet Transit";

        return `
        <div class="pred-item" style="border-left: 3px solid ${confColor};">
            <div class="pred-info">
                <div class="pred-name" style="color: #fff; font-weight: 600;">${displayEvent.toUpperCase()}</div>
                <div class="pred-date" style="font-size: 0.75rem; color: #94a3b8; font-family: 'JetBrains Mono';">
                    T+${new Date(p.timestamp).toLocaleTimeString([], { hour12: false })}
                </div>
            </div>
            <div class="pred-prob" style="color: ${confColor}; text-align: right;">
                <div style="font-size: 0.7rem; opacity: 0.7;">CONFIDENCE</div>
                ${displayConf}%
            </div>
        </div>
        `;
    }).join('') : '<div class="pred-item"><span class="pred-date">Scanning deep space sector...</span></div>';
}

function initChart(labels, data) {
    const ctx = document.getElementById('solarChart').getContext('2d');

    // Refined Gradient: Purple to Transparent
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(188, 19, 254, 0.4)'); // Vibrant purple at top
    gradient.addColorStop(0.5, 'rgba(188, 19, 254, 0.1)'); // Fades out
    gradient.addColorStop(1, 'rgba(188, 19, 254, 0.0)'); // Transparent at bottom

    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Activity',
                data: data,
                borderColor: '#bc13fe', // Neon Purple Line
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.4, // Smooth curves
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10, family: "'JetBrains Mono'" } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#64748b', font: { size: 10, family: "'JetBrains Mono'" }, stepSize: 25 },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function initGlobe(starsData) {
    const container = document.getElementById('globe-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 13;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Globe
    const geometry = new THREE.SphereGeometry(4.2, 64, 64);

    // Shader material for holographic effect
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x2d5bff) },
            viewVector: { value: camera.position }
        },
        vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main() {
                vec3 vNormal = normalize(normalMatrix * normal);
                vec3 vNormel = normalize(normalMatrix * viewVector);
                intensity = pow(0.6 - dot(vNormal, vNormel), 3.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float intensity;
            void main() {
                vec3 glow = color * intensity;
                gl_FragColor = vec4(glow, 1.0);
            }
        `,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Dotted Wireframe
    const wireframeGeo = new THREE.WireframeGeometry(geometry);
    const wireframeMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.15 });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    globe.add(wireframe);

    // Particles/Stars
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 2000;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 35;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.04,
        color: 0x88ccff,
        transparent: true,
        opacity: 0.5
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // Animation Loop
    const animate = () => {
        requestAnimationFrame(animate);
        globe.rotation.y += 0.0015;
        particles.rotation.y -= 0.0003;
        renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
    resizeObserver.observe(container);
}

// Add specific styles for this view
const style = document.createElement('style');
style.textContent = `
    .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 24px;
        height: 100%;
    }

    .viz-panel {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    }
    
    #globe-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
    }

    .widgets-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-width: 0; /* Prevent flex overflow */
    }

    .widget-card {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
    }
    
    .widget-card:first-child {
        flex: 0 0 auto;
    }
    
    .widget-card:last-child {
        flex: 1;
        min-height: 200px;
    }

    .widget-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding-bottom: 12px;
        margin-bottom: 4px;
    }

    .widget-title {
        font-size: 1rem;
        font-weight: 600;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .prediction-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        padding-right: 4px;
    }

    .pred-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        transition: all 0.2s;
        border: 1px solid transparent;
    }

    .pred-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(2px);
    }

    .pred-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .pred-name {
        font-weight: 500;
        color: #e2e8f0;
        font-size: 0.95rem;
    }

    .pred-date {
        font-size: 0.8rem;
        color: #64748b;
    }

    .pred-prob {
        font-weight: 600;
        color: #00f3ff;
        font-size: 1rem;
        text-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
    }

    .chart-container {
        flex: 1;
        min-height: 0;
        position: relative;
    }

    /* HUD Elements */
    .hud-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        padding: 20px;
    }

    .hud-top-left {
        position: absolute;
        top: 20px;
        left: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .hud-element {
        background: rgba(10, 10, 30, 0.8);
        padding: 8px 12px;
        border-radius: 4px;
        border-left: 2px solid #00f3ff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        color: #00f3ff;
        backdrop-filter: blur(4px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }

    .hud-bottom-right {
        position: absolute;
        bottom: 20px;
        right: 20px;
        text-align: right;
    }

    .viz-controls {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 16px;
        pointer-events: auto;
    }

    .hud-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 1.2rem;
    }

    .hud-icon:nth-child(1) { color: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.5); }
    .hud-icon:nth-child(2) { color: #eab308; box-shadow: 0 0 10px rgba(234, 179, 8, 0.4); border-color: rgba(234, 179, 8, 0.5); }
    .hud-icon:nth-child(3) { color: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.4); border-color: rgba(34, 197, 94, 0.5); }

    .hud-icon:hover {
        transform: scale(1.1);
        background: rgba(255, 255, 255, 0.1);
    }

    /* Orbit Rings */
    .orbit-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        pointer-events: none;
    }

    .orbit-ring.ring-1 { width: 60%; height: 60%; border-color: rgba(0, 243, 255, 0.1); animation: spin 20s linear infinite; }
    .orbit-ring.ring-2 { width: 80%; height: 80%; border-color: rgba(217, 70, 239, 0.1); animation: spin-rev 30s linear infinite; }
    .orbit-ring.ring-3 { width: 45%; height: 45%; border-color: rgba(255, 255, 255, 0.05); border-style: dashed; animation: spin 40s linear infinite; }

    @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
    @keyframes spin-rev { from { transform: translate(-50%, -50%) rotate(360deg); } to { transform: translate(-50%, -50%) rotate(0deg); } }
`;
document.head.appendChild(style);
let celestialMapInstance = null;

export function initCelestialMap(predictions) {
    const ctx = document.getElementById('celestialMapChart');
    if (!ctx) return;

    // Transform predictions into Celestial Coordinates {x: RA, y: Dec}
    // If real RA/Dec isn't available, simulate it for the demo
    const chartData = predictions.map((p, index) => {
        // Deterministic pseudo-random based on timestamp or index to keep points stable during updates
        // Fix: timestamp might be a number, safe convert to string
        const tsStr = String(p.timestamp || "");
        const seed = tsStr.length > 0 ? tsStr.charCodeAt(tsStr.length - 1) : index;

        // Support both flat p.ra and nested p.coordinates.ra
        const ra = p.coordinates?.ra ?? p.ra;
        const dec = p.coordinates?.dec ?? p.dec;

        return {
            x: (ra !== undefined) ? ra : (Math.random() * 360), // Right Ascension: 0-360 deg
            y: (dec !== undefined) ? dec : ((Math.random() * 180) - 90), // Declination: -90 to +90 deg
            confidence: parseFloat(p.confidence) // Keep confidence for styling
        };
    });

    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    celestialMapInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Event Locations',
                data: chartData,
                backgroundColor: (context) => {
                    const val = context.raw?.confidence || 0;
                    return val > 80 ? '#00ff88' : (val > 50 ? '#00f3ff' : '#ff0055');
                },
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointStyle: 'crossRot' // Star-like shape
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `RA: ${ctx.raw.x.toFixed(1)}°, Dec: ${ctx.raw.y.toFixed(1)}° (Conf: ${ctx.raw.confidence}%)`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 360,
                    title: {
                        display: true,
                        text: 'Right Ascension (°)',
                        color: '#64748b',
                        font: { size: 9, family: "'JetBrains Mono'" }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b', font: { size: 9 }, stepSize: 60 }
                },
                y: {
                    type: 'linear',
                    min: -90,
                    max: 90,
                    title: {
                        display: true,
                        text: 'Declination (°)',
                        color: '#64748b',
                        font: { size: 9, family: "'JetBrains Mono'" }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b', font: { size: 9 }, stepSize: 30 }
                }
            }
        }
    });
}

export function updateCelestialMap(predictions) {
    if (!celestialMapInstance) {
        initCelestialMap(predictions);
        return;
    }

    // Preserve previous coordinates if possible to avoid jumping points unless it's a new event
    // For this demo, we'll re-generate or assume the backend provides stable coordinates in future
    const newData = predictions.map((p, index) => {
        const ra = p.coordinates?.ra ?? p.ra;
        const dec = p.coordinates?.dec ?? p.dec;

        return {
            x: (ra !== undefined) ? ra : (Math.random() * 360),
            y: (dec !== undefined) ? dec : ((Math.random() * 180) - 90),
            confidence: parseFloat(p.confidence)
        };
    });

    celestialMapInstance.data.datasets[0].data = newData;
    celestialMapInstance.update('none');
}
