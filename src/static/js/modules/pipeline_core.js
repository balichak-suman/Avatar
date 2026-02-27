export function renderPipeline(container, store) {
    const pipeline = store.pipeline || { steps: [], metrics: {} };
    // Default skeleton to preserve layout if data is missing
    const SKELETON_STEPS = [
        { name: "Data Ingestion", status: "pending" },
        { name: "Preprocessing", status: "pending" },
        { name: "Model Training", status: "pending" },
        { name: "Evaluation", status: "pending" },
        { name: "Deployment", status: "pending" }
    ];

    const steps = (pipeline.steps && pipeline.steps.length) ? pipeline.steps : SKELETON_STEPS;

    // Metrics from store (default to 0 if missing)
    const metrics = {
        training_accuracy: pipeline.metrics?.training_accuracy || 0,
        system_load: pipeline.metrics?.system_load || 0,
        model_loss: pipeline.metrics?.model_loss || 0.15,
        inference_time: pipeline.metrics?.inference_time || 45
    };

    container.innerHTML = `
        <div class="mlops-dashboard">
            <!-- TOP SECTION: FEW-SHOT LEARNING MODULE -->
            <section class="glass-panel module-panel">
                <div class="panel-header">FEW-SHOT LEARNING MODULE</div>
                
                <div class="fsl-flow-container">
                    <!-- Support Set Box -->
                    <div class="fsl-box support-box">
                        <div class="box-label">Support Set (Few Examples)</div>
                        <div class="image-row">
                            <div class="fsl-img" style="background-image: url('src/static/images/nebula.jpg'); background: linear-gradient(45deg, #f06, #9f6);"></div>
                            <div class="fsl-img" style="background-image: url('src/static/images/blackhole.jpg'); background: linear-gradient(45deg, #09f, #003);"></div>
                            <div class="fsl-img" style="background-image: url('src/static/images/comet.jpg'); background: linear-gradient(45deg, #fff, #99f);"></div>
                        </div>
                        <div class="box-sublabel">Class A, B, C</div>
                    </div>

                    <!-- Arrow -->
                    <div class="flow-arrow">➜</div>

                    <!-- Meta-Learner Center -->
                    <div class="meta-learner-container">
                        <div class="brain-glow">
                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M9.5 20c-1.5 0-3-.5-4-1.5-1.5-1.5-2-4-1-6 .5-1 1-2 2-2.5.5-.5 1-1 1.5-1s1-.5 2-1c.5-.5 1-1.5 1-2.5 0-1 1-1.5 2-1.5s2 .5 2 1.5c0 1 .5 2 1 2.5s1.5.5 2 1 1 .5 1.5 1 1.5 1.5 2 2.5c1 2 .5 4.5-1 6-1 1-2.5 1.5-4 1.5h-5z" />
                                <path d="M12 4c0-1.1-.9-2-2-2s-2 .9-2 2" opacity="0.5"/>
                            </svg>
                        </div>
                        <div class="learner-label">Meta-Learner Model</div>
                        <div class="nn-badge">Nᴺ</div>
                    </div>

                    <!-- Arrow -->
                    <div class="flow-arrow">➜</div>

                    <!-- Query Set Box -->
                    <div class="fsl-box query-box">
                        <div class="box-label">Query Set Prediction</div>
                        <div class="fsl-img large" style="background: linear-gradient(135deg, #f06, #00f);"></div>
                        <div class="prediction-result">Class A: 98%</div>
                    </div>
                </div>
            </section>

            <!-- BOTTOM SECTION: PIPELINE STATUS -->
            <section class="bottom-section">
                <!-- Status Flow -->
                <div class="pipeline-status-container">
                    <div class="section-header">MLOPS PIPELINE STATUS</div>
                    <div class="pipeline-nodes">
                        ${steps.map((step, i) => renderPipelineNode(step, i, steps.length)).join('<div class="node-connector-separate">➜</div>')}
                    </div>
                </div>

                <!-- Bottom Metrics Graphs -->
                <div class="graphs-row">
                    <div class="graph-box">
                        <div class="graph-label">Training Accuracy</div>
                        <div class="graph-viz">
                            <canvas id="accuracyChart"></canvas>
                        </div>
                    </div>
                    <div class="graph-box">
                        <div class="graph-label">System Load</div>
                        <div class="graph-viz">
                            <canvas id="loadChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- REAL-TIME DATA INGESTION STATUS REMOVED (Moved to Data Streams) -->
            </section>
        </div>
    `;

    // Initialize Charts after render
    initcharts(metrics);
}

export function updatePipelineValues(store) {
    if (!store.pipeline) store.pipeline = { steps: [], metrics: {} };
    const p = store.pipeline;

    // 1. Simulate Metrics Fluctuation
    p.metrics.system_load = Math.min(100, Math.max(0, (p.metrics.system_load || 40) + (Math.random() - 0.5) * 5));
    p.metrics.training_accuracy = Math.min(0.99, Math.max(0.70, (p.metrics.training_accuracy || 0.85) + (Math.random() - 0.5) * 0.01));

    // 2. Update Charts if they exist
    const accChart = Chart.getChart("accuracyChart");
    if (accChart) {
        accChart.data.datasets[0].data.push(p.metrics.training_accuracy * 100);
        accChart.data.datasets[0].data.shift();
        accChart.update('none');
    }

    const loadChart = Chart.getChart("loadChart");
    if (loadChart) {
        loadChart.data.datasets[0].data.push(p.metrics.system_load);
        loadChart.data.datasets[0].data.shift();
        loadChart.update('none');
    }

    // 3. Animate Few-Shot Learning Module (Simulate Inference)
    // Only update occasionally to not be too chaotic
    if (Math.random() > 0.7) {
        const events = [
            "Supernova", "Gamma-Ray Burst", "Solar Flare", "Kilonova",
            "Exoplanet Transit", "Black Hole Merger", "Unknown Anomaly"
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        const conf = (Math.random() * 20 + 80).toFixed(1);

        const predResult = document.querySelector('.prediction-result');
        if (predResult) {
            predResult.innerText = `${event}: ${conf}%`;
            // Trigger a quick flash/glow effect if possible via class
            predResult.style.boxShadow = `0 0 15px ${conf > 90 ? '#00ff88' : '#00dbde'}`;
            setTimeout(() => { predResult.style.boxShadow = 'none'; }, 200);
        }

        // Pulse the brain
        const brain = document.querySelector('.brain-glow');
        if (brain) {
            brain.style.filter = `drop-shadow(0 0 ${Math.random() * 10 + 5}px #8b5cf6)`;
        }

        // Randomly highlight a support image
        const imgs = document.querySelectorAll('.fsl-img:not(.large)');
        if (imgs.length > 0) {
            imgs.forEach(img => img.style.borderColor = 'rgba(59, 130, 246, 0.4)'); // reset
            const randImg = imgs[Math.floor(Math.random() * imgs.length)];
            randImg.style.borderColor = '#00ff88';
        }
    }

    // 4. Simulate Pipeline Progress Cycle
    if (!p.steps || p.steps.length === 0) {
        p.steps = [
            { name: "Data Ingestion", status: "pending", progress: 0 },
            { name: "Preprocessing", status: "pending", progress: 0 },
            { name: "Model Training", status: "pending", progress: 0 },
            { name: "Evaluation", status: "pending", progress: 0 },
            { name: "Deployment", status: "pending", progress: 0 }
        ];
    }

    let activeIndex = p.steps.findIndex(s => s.status === 'running');

    // Auto-start if nothing is running and not all done (or just loop forever)
    if (activeIndex === -1) {
        // Reset if all completed
        if (p.steps.every(s => s.status === 'completed')) {
            if (Math.random() > 0.95) { // Small pause before restart
                p.steps.forEach(s => { s.status = 'pending'; s.progress = 0; });
                p.steps[0].status = 'running';
            }
        } else {
            // Find first pending or ready
            const firstPending = p.steps.findIndex(s => s.status === 'pending' || s.status === 'ready');
            if (firstPending !== -1) {
                p.steps[firstPending].status = 'running';
                if (p.steps[firstPending].progress === undefined) p.steps[firstPending].progress = 0;
            }
        }
        // Refind active
        activeIndex = p.steps.findIndex(s => s.status === 'running');
    }

    if (activeIndex !== -1) {
        const step = p.steps[activeIndex];
        step.progress += 2 + Math.random() * 5; // Steady progress

        if (step.progress >= 100) {
            step.status = 'completed';
            step.progress = 100;
            // Start next immediately
            if (activeIndex + 1 < p.steps.length) {
                p.steps[activeIndex + 1].status = 'running';
                if (p.steps[activeIndex + 1].progress === undefined) p.steps[activeIndex + 1].progress = 0;
            }
        }

        // Fake training metadata
        if (step.name === "Model Training") {
            step.epoch = Math.floor(step.progress / 10) + 1;
            step.loss = (0.5 / step.epoch).toFixed(4);
        }
    }

    updatePipelineDOM(p.steps);
}

function updatePipelineDOM(steps) {
    const container = document.querySelector('.pipeline-nodes');
    if (!container) return;

    // We assume the nodes match the order
    const nodes = container.querySelectorAll('.tech-box-wrapper');
    steps.forEach((step, i) => {
        if (nodes[i]) {
            const node = nodes[i];
            const isRunning = step.status === 'running';
            const isDone = step.status === 'completed';

            // Update classes
            node.classList.remove('type-running', 'type-done', 'type-pending');
            node.classList.add(isRunning ? 'type-running' : (isDone ? 'type-done' : 'type-pending'));

            // Update content logic slightly differently to avoid full reflow? 
            // innerHTML update is easiest for now given the template complexity.
            // But to preserve animations, we might want to be careful.
            // Actually, just re-rendering the status part is enough.

            const contentDiv = node.querySelector('.tech-content');
            let statusHtml = '';
            if (isRunning) {
                statusHtml = `
                    <div class="check-badge" style="visibility:hidden">✓</div>
                    <div class="node-title">${step.name}</div>
                    <div class="node-status text-running">(Running)</div>
                    <div class="node-progress-bar"><div class="node-fill" style="width: ${step.progress}%"></div></div>
                    <div class="node-meta">${step.name === 'Model Training' ? `Loss: ${step.loss}` : 'Processing...'}</div>
                `;
            } else if (isDone) {
                statusHtml = `
                    <div class="check-badge">✓</div>
                    <div class="node-title">${step.name}</div>
                    <div class="node-status text-success">(Done)</div>
                `;
            } else if (step.status === 'ready') {
                statusHtml = `
                    <div class="node-title">${step.name}</div>
                    <div class="node-status text-running">(Ready)</div>
                `;
            } else {
                statusHtml = `
                    <div class="node-title">${step.name}</div>
                    <div class="node-status text-muted">(Waiting)</div>
                `;
            }
            contentDiv.innerHTML = statusHtml;
        }
    });
}

function renderPipelineNode(step, index, total) {
    const isRunning = step.status === 'running';
    const isDone = step.status === 'completed';
    const isPending = step.status === 'pending';

    let statusHtml = '';
    if (isRunning) {
        statusHtml = `
            <div class="node-status text-running">(Few-Shot - Running)</div>
            <div class="node-progress-bar">
                <div class="node-fill" style="width: ${step.progress}%"></div>
            </div>
            <div class="node-meta">Epoch ${step.epoch || '?'} - Loss: ${step.loss || '?'}</div>
        `;
    } else if (isDone) {
        statusHtml = `<div class="node-status text-success">(Done)</div>`;
    } else {
        // Pending or Skeleton
        statusHtml = `<div class="node-status text-muted" style="animation: pulseText 1.5s infinite alternate">(Scanning...)</div>`;
    }

    const typeClass = isRunning ? 'type-running' : (isDone ? 'type-done' : 'type-pending');

    return `
        <div class="tech-box-wrapper ${typeClass}">
            <div class="tech-border"></div>
            <div class="tech-content">
                ${isDone ? '<div class="check-badge">✓</div>' : ''}
                <div class="node-title">${step.name}</div>
                ${statusHtml}
            </div>
            <!-- The 'notch' or tag at the bottom -->
            <div class="tech-tag">
                <div class="tag-dots"><span></span><span></span><span></span></div>
            </div>
            <!-- Arrow integrated -->
            <div class="node-connector">➜</div>
        </div>
    `;
}

function initcharts(metrics) {
    const commonOptions = {
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        maintainAspectRatio: false
    };

    const accCtx = document.getElementById('accuracyChart');
    if (accCtx) {
        new Chart(accCtx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    data: Array(20).fill(metrics.training_accuracy * 100), // Scale to percentage
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0
                }]
            },
            options: { ...commonOptions, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }
        });
    }

    const loadCtx = document.getElementById('loadChart');
    if (loadCtx) {
        new Chart(loadCtx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    data: Array(20).fill(metrics.system_load),
                    borderColor: '#00f3ff',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }]
            },
            options: { ...commonOptions, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } } }
        });
    }
}

// Inject CSS Styles
const style = document.createElement('style');
style.textContent = `
    /* --- SCROLLBAR STYLING --- */
    ::-webkit-scrollbar {
        height: 6px;
        width: 6px;
    }
    ::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.4);
        border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(59, 130, 246, 0.5);
        border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(59, 130, 246, 0.8);
    }

    .mlops-dashboard {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
        color: #fff;
        font-family: 'Inter', sans-serif;
        padding-top: 5px;
        box-sizing: border-box;
        overflow-x: hidden; /* Prevent body scroll */
        overflow-y: hidden; /* No vertical scroll */
    }

    /* --- TOP SECTION --- */
    .module-panel {
        padding: 12px 16px;
        flex: 0 0 auto;
        max-height: 35vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 1px solid rgba(139, 92, 246, 0.3);
        justify-content: flex-start;
        background: rgba(15, 23, 42, 0.6); 
        border-radius: 8px;
        overflow: hidden; /* Contain inner scrolls */
    }

    .panel-header {
        font-size: 0.95rem;
        font-weight: 700;
        color: #cbd5e1;
        margin-bottom: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
        width: 100%;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 6px;
        flex-shrink: 0;
    }

    /* Linear Flow Container - WRAPPED for Responsiveness */
    .fsl-flow-container {
        display: flex;
        align-items: center;
        justify-content: center; /* Center items */
        gap: 12px; 
        width: 100%;
        flex-grow: 1;
        flex-wrap: wrap; /* ALLOW WRAP */
        overflow-x: visible; /* No Scroll */
        padding: 5px 0;
    }
    
    .fsl-box {
        background: rgba(10, 14, 28, 0.8);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 10px;
        padding: 12px 16px;
        text-align: center;
        min-width: 200px; 
        flex: 1 1 auto; /* Allow grow/shrink */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .box-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .box-sublabel {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-top: 8px;
    }

    .image-row {
        display: flex;
        gap: 10px;
        justify-content: center;
        align-items: center;
        margin: 10px 0;
    }

    .fsl-img {
        width: 40px;
        height: 40px;
        border-radius: 6px;
        border: 1px solid rgba(59, 130, 246, 0.4);
        background-size: cover;
        background-position: center;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .fsl-img.large {
        width: 60px;
        height: 60px;
        margin: 6px 0;
    }

    .flow-arrow {
        font-size: 2rem;
        color: #3b82f6;
        flex-shrink: 0;
        opacity: 0.8;
    }

    .meta-learner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 12px 16px;
        background: rgba(10, 14, 28, 0.8);
        border: 1px solid rgba(139, 92, 246, 0.4);
        border-radius: 10px;
        min-width: 160px;
        position: relative;
    }

    .brain-glow {
        width: 45px;
        height: 45px;
        color: #8b5cf6;
        filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
        margin-bottom: 6px;
    }

    .brain-glow svg {
        width: 100%;
        height: 100%;
    }

    .learner-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 8px;
    }

    .nn-badge {
        font-size: 1.2rem;
        font-weight: 700;
        color: #8b5cf6;
        font-style: italic;
        letter-spacing: 1px;
    }

    .prediction-result {
        font-size: 0.9rem;
        font-weight: 600;
        color: #00ff88;
        margin-top: 8px;
        padding: 6px 12px;
        background: rgba(0, 255, 136, 0.1);
        border-radius: 6px;
        border: 1px solid rgba(0, 255, 136, 0.3);
    }

    .bottom-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
        overflow-y: hidden; /* No scrolling */
        max-height: 60vh;
    }

    .pipeline-status-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 0 0 auto;
    }

    .section-header {
        font-size: 0.85rem;
        font-weight: 700;
        color: #cbd5e1;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-align: center;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .pipeline-nodes {
        display: flex;
        align-items: flex-start; 
        justify-content: center; /* Center items */
        width: 100%;
        gap: 12px;
        padding: 6px;
        flex-wrap: wrap; /* ALLOW WRAP */
        overflow-x: visible; /* No Scroll */
    }

    /* --- TECH BOX SHAPE --- */
    .tech-box-wrapper {
        flex: 1 0 150px; /* Don't shrink below 150 */
        max-width: 200px; 
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 100px; 
    }

    .tech-border {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        clip-path: polygon(
            15px 0, calc(100% - 15px) 0, 
            100% 15px, 100% calc(100% - 15px), 
            calc(100% - 15px) 100%, 
            65% 100%, 
            60% calc(100% - 10px), 
            40% calc(100% - 10px), 
            35% 100%, 
            15px 100%, 
            0 calc(100% - 15px), 0 15px
        );
        background: #475569;
        z-index: 1;
    }

    .tech-content {
        position: absolute;
        top: 2px; left: 2px; right: 2px; bottom: 2px;
        clip-path: polygon(
            15px 0, calc(100% - 15px) 0, 
            100% 15px, 100% calc(100% - 15px), 
            calc(100% - 15px) 100%, 
            65% 100%, 
            60% calc(100% - 10px), 
            40% calc(100% - 10px), 
            35% 100%, 
            15px 100%, 
            0 calc(100% - 15px), 0 15px
        );
        background: rgba(15, 23, 42, 0.95);
        z-index: 2;
        padding: 12px 8px 20px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }

    .tech-tag {
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 80px;
        height: 20px;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .tag-dots span {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        margin: 0 3px;
        opacity: 0.7;
    }

    /* Colors by Type */
    .type-done .tech-border { background: #00dbde; box-shadow: 0 0 10px rgba(0, 219, 222, 0.3); }
    .type-done .tech-tag { color: #00dbde; }
    
    .type-running .tech-border { 
        background: linear-gradient(90deg, #00f3ff, #8b5cf6); 
        animation: glowPulse 2s infinite; 
    }
    .type-running .tech-tag { color: #00f3ff; }
    
    .type-pending .tech-border { background: #334155; position: relative; overflow: hidden; }
    .type-pending .tech-content { background: rgba(15, 23, 42, 0.6); }
    .type-pending .tech-tag { color: #475569; }

    /* Animations */
    @keyframes scanLoading { 0% { left: -100%; } 100% { left: 200%; } }
    @keyframes glowPulse { 0% { filter: drop-shadow(0 0 2px rgba(0, 243, 255, 0.5)); } 50% { filter: drop-shadow(0 0 8px rgba(0, 243, 255, 0.8)); } 100% { filter: drop-shadow(0 0 2px rgba(0, 243, 255, 0.5)); } }
    @keyframes pulseText { 0% { opacity: 0.5; } 100% { opacity: 1; } }

    /* Typography */
    .node-title { font-size: 0.8rem; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .node-status { font-size: 0.7rem; margin-bottom: 6px; }
    .text-success { color: #00ff88; }
    .text-running { color: #00f3ff; }
    .text-muted { color: #94a3b8; }
    .node-progress-bar { width: 80%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 8px; overflow: hidden; }
    .node-fill { height: 100%; background: #00f3ff; }
    .node-meta { font-size: 0.7rem; color: #94a3b8; }
    .check-badge { background: rgba(0, 219, 222, 0.2); color: #00dbde; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-bottom: 4px; border: 1px solid #00dbde; }
    .node-connector-separate {
        color: #3b82f6;
        font-size: 1.3rem;
        margin-top: 35px; /* Align with center of boxes roughly */
        flex-shrink: 0;
        opacity: 0.7;
    }

    /* Graphs Row */
    .graphs-row {
        display: flex;
        gap: 12px;
        margin-top: 10px;
        flex-wrap: wrap; /* Allow graphs to wrap */
        flex: 0 0 auto; /* Don't grow, let data row take space */
    }

    .graph-box {
        flex: 1 1 250px; /* Min width 250px */
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 10px;
        padding: 10px;
        height: 85px;
        position: relative;
    }

    .graph-label { font-size: 0.75rem; color: #cbd5e1; margin-bottom: 6px; }
    .graph-viz { width: 100%; height: 55px; }

    /* --- DATA INGESTION ROW --- */
    .data-ingestion-row {
        display: flex;
        gap: 12px;
        margin-top: 5px;
        flex-wrap: wrap;
        width: 100%;
        flex: 1; /* Grow to fill remaining space */
        min-height: 120px; /* Ensure at least some height */
    }

    .data-box {
        flex: 1 1 200px;
        background: rgba(10, 14, 28, 0.6);
        border: 1px solid rgba(0, 219, 222, 0.2);
        border-radius: 8px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        position: relative;
        overflow: hidden;
        height: 100%; /* Force fill */
    }

    .data-box::after {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 4px; height: 100%;
        background: #00dbde;
        opacity: 0.5;
    }

    .box-header {
        font-size: 0.7rem;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 1px;
        margin-bottom: 4px;
    }

    .data-stat {
        display: flex;
        align-items: baseline;
    }

    .data-meta {
        font-size: 0.65rem;
        color: #475569;
        margin-top: 4px;
        font-family: 'JetBrains Mono', monospace;
    }
`;
document.head.appendChild(style);
