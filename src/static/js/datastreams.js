
import { store } from './app.js?v=70';

console.log("DataStreams Module Loaded");

// Ensure data is loaded
if (store.predictions.length === 0) {
    store.fetchAll();
}

// DOM Elements
const ztfTerminal = document.getElementById('ztf-terminal');
const tessTerminal = document.getElementById('tess-terminal');
const rateEl = document.getElementById('ingest-rate');
const packetEl = document.getElementById('active-packets');
const idEl = document.getElementById('latest-id');
const classEl = document.getElementById('latest-class');

// Extended Metadata Elements
const metaRa = document.getElementById('meta-ra');
const metaDec = document.getElementById('meta-dec');
const metaMag = document.getElementById('meta-mag');
const metaConf = document.getElementById('meta-conf');

// Global injector
// Global injector linked to Backend API
window.injectEvent = async function (type) {
    console.log(`Requesting Synthetic ${type} generation...`);

    // Optimistic UI Feed update (visual feedback immediately)
    const mockPkt = {
        id: `REQ-${Math.floor(Math.random() * 9999)}`,
        source: 'SYNTH-GEN',
        classification: `GENERATING ${type.toUpperCase()}...`,
        status: 'PENDING'
    };
    if (type === 'Supernova') addLogEntry(mockPkt, ztfTerminal);
    if (type === 'Transit') addLogEntry(mockPkt, tessTerminal);

    try {
        const response = await fetch('/api/synthetic/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: type })
        });

        if (response.ok) {
            // DOWNLOAD FLOW
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            // Get filename from header or fallback
            const disposition = response.headers.get('Content-Disposition');
            let filename = `synth_${type}.json`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            console.log("Synthetic Data Downloaded");

            // Confirm in UI
            const confirmPkt = {
                id: `DL-${Math.floor(Math.random() * 9999)}`,
                source: 'SYSTEM',
                classification: `FILE GENERATED`,
                status: 'DOWNLOADED'
            };
            if (type === 'Supernova') addLogEntry(confirmPkt, ztfTerminal);
            else addLogEntry(confirmPkt, tessTerminal);

        } else {
            console.error("Injection failed", response.status);
            alert("Failed to inject event: Server Error");
        }
    } catch (e) {
        console.error("Injection network error", e);
        alert("Network Error during injection");
    }
}

// AI Generation Logic
window.injectEventAI = async function () {
    const promptEl = document.getElementById('ai-prompt');
    if (!promptEl || !promptEl.value.trim()) {
        alert("Please enter a command for the AI.");
        return;
    }

    const prompt = promptEl.value.trim();
    console.log(`Requesting AI Generation: "${prompt}"`);

    // UI Feedback
    const mockPkt = {
        id: `AI-REQ-${Math.floor(Math.random() * 9999)}`,
        source: 'COSMIC-ORACLE',
        classification: `ANALYZING PROMPT...`,
        status: 'PROCESSING'
    };
    addLogEntry(mockPkt, ztfTerminal);

    try {
        const response = await fetch('/api/synthetic/generate_ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (response.ok) {
            // DOWNLOAD FLOW
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            // Get filename from header or fallback
            const disposition = response.headers.get('Content-Disposition');
            let filename = `synth_ai_gen.json`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            console.log("AI Data Downloaded");

            // Confirm in UI
            const confirmPkt = {
                id: `AI-DL-${Math.floor(Math.random() * 9999)}`,
                source: 'SYSTEM',
                classification: `AI FILE GENERATED`,
                status: 'DOWNLOADED'
            };
            addLogEntry(confirmPkt, ztfTerminal);

        } else {
            console.error("AI Generation failed", response.status);
            alert("AI Generation failed: Server Error");
        }
    } catch (e) {
        console.error("AI network error", e);
        alert("Network Error during AI generation");
    }
}

// State
let msgCount = 0;
const MAX_LOGS = 50;

// Initialize Viz
// 3D SKY MAP VISUALIZATION (Replacing 2D Waveform)
const container = document.getElementById('scene-container');
let scene, camera, renderer, globe, pointsGroup;

function init3D() {
    if (!container) return;

    // Setup
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Safety check
    if (typeof THREE === 'undefined') {
        console.warn("Three.js not loaded. Skipping 3D viz.");
        container.innerHTML = '<div style="padding:20px; color:red">⚠ VISUALIZATION SYSTEM OFFLINE</div>';
        return;
    }

    scene = new THREE.Scene();
    // Dark bg match ui
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.002);

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 250;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    // Globe (Wireframe)
    const geometry = new THREE.IcosahedronGeometry(80, 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Core (Solid)
    const coreGeo = new THREE.IcosahedronGeometry(78, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Points Group for Alerts
    pointsGroup = new THREE.Group();
    scene.add(pointsGroup);

    // Initial Random Stars
    for (let i = 0; i < 100; i++) {
        addPoint(Math.random() * 360, Math.random() * 180 - 90, 0xffffff, 0.5);
    }

    animate();
}

function addPoint(ra, dec, color = 0xff0000, size = 1.5) {
    // RA (0-360) -> Phi (0-2PI)
    // Dec (-90-90) -> Theta (0-PI)
    const phi = (ra * Math.PI) / 180;
    const theta = ((90 - dec) * Math.PI) / 180;
    const r = 80;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.cos(theta);
    const z = r * Math.sin(theta) * Math.sin(phi);

    const geo = new THREE.SphereGeometry(size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);

    pointsGroup.add(mesh);

    // Limit points
    if (pointsGroup.children.length > 200) {
        pointsGroup.remove(pointsGroup.children[0]);
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (globe) globe.rotation.y += 0.002;
    if (pointsGroup) pointsGroup.rotation.y += 0.002;

    renderer.render(scene, camera);
}

// Window resize handling
window.addEventListener('resize', () => {
    if (container && camera && renderer) {
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
});

// Start
init3D();


// API Polling for Real Data logs
async function fetchLogs() {
    // Fallback if store is empty/loading: Generate Mock Data
    const useSimulation = !store || !store.predictions || store.predictions.length === 0;

    // 1. ZTF Packet (Left Terminal)
    if (Math.random() > 0.3) {
        let pred;
        if (useSimulation) {
            // Mock ZTF Data
            pred = { event: Math.random() > 0.8 ? "Supernova" : "Variable Star" };
        } else {
            pred = store.predictions[Math.floor(Math.random() * store.predictions.length)];
        }

        const ztfPacket = {
            id: `ZTF${Math.floor(Math.random() * 20 + 20)}a${Math.random().toString(36).substring(7)}`,
            source: 'ZTF',
            ra: (Math.random() * 360).toFixed(4),
            dec: (Math.random() * 180 - 90).toFixed(4),
            mag: (16 + Math.random() * 5).toFixed(2),
            classification: pred.event.replace(" [RARE]", "")
        };
        addLogEntry(ztfPacket, ztfTerminal);
        updateMetrics(ztfPacket);

        // Add to 3D Map (Only if init3D succeeded)
        if (typeof addPoint === 'function') {
            addPoint(parseFloat(ztfPacket.ra), parseFloat(ztfPacket.dec), 0xef4444, 2);
        }
    }

    // 2. TESS Packet (Right Terminal)
    if (Math.random() > 0.6) {
        const tessPacket = {
            id: `TIC${Math.floor(Math.random() * 100000000)}`,
            source: 'TESS',
            sector: Math.floor(Math.random() * 30 + 1),
            camera: Math.floor(Math.random() * 4 + 1),
            flux: (Math.random() * 1000).toFixed(1),
            status: 'TRANSIT_CHECK'
        };
        addLogEntry(tessPacket, tessTerminal);
    }
}

function addLogEntry(pkt, container) {
    if (!container) return;

    const div = document.createElement('div');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });

    const isAlert = pkt.classification === "Supernova" || pkt.classification === "Gamma-Ray Burst";
    const typeClass = isAlert ? 'alert' : 'info';
    let color = '#3b82f6';
    if (pkt.source === 'TESS') color = '#8b5cf6';
    if (pkt.classification === 'Supernova') color = '#ef4444';

    div.className = `log-entry ${typeClass}`;
    const jsonStr = JSON.stringify(pkt, null, 2).replace(/"/g, '').replace(/,/g, '');

    // Use Pre tag for JSON but rely on global CSS for wrapping
    div.innerHTML = `
        <div style="margin-bottom:2px">
            <span class="timestamp">[${time}]</span> 
            <span style="color:#fff; font-weight:bold">RX ${pkt.source}</span> 
            <span style="color:${color}">${pkt.classification ? pkt.classification.toUpperCase() : 'TELEMETRY'}</span>
        </div>
        <pre>${jsonStr}</pre>
    `;

    container.appendChild(div);
    if (container.children.length > MAX_LOGS) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
}

function updateMetrics(pkt) {
    if (idEl) idEl.innerText = pkt.id;
    if (classEl) {
        classEl.innerText = pkt.classification ? pkt.classification.toUpperCase() : 'UNKNOWN';
        classEl.style.color = (pkt.classification === "Supernova") ? "#ef4444" : "#fff";
    }

    // Update Extended Meta
    if (metaRa && pkt.ra) metaRa.innerText = parseFloat(pkt.ra).toFixed(2);
    if (metaDec && pkt.dec) metaDec.innerText = parseFloat(pkt.dec).toFixed(2);
    if (metaMag && pkt.mag) metaMag.innerText = pkt.mag;
    if (metaMag && !pkt.mag) metaMag.innerText = "N/A";

    // Confidence Bar (Fake or Real)
    if (metaConf) {
        const conf = pkt.confidence || (0.7 + Math.random() * 0.3);
        metaConf.style.width = `${conf * 100}%`;
        metaConf.style.background = conf > 0.9 ? '#ef4444' : '#3b82f6';
    }

    if (rateEl) rateEl.innerText = (0.8 + Math.random()).toFixed(2);
    if (packetEl) packetEl.innerText = Math.floor(800 + Math.random() * 100);
}

// Start Stream
setInterval(fetchLogs, 800);
