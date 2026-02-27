
export function renderDatasets(container, store) {
    const datasets = store.datasets || {};

    const createCard = (key, data, icon) => {
        const statusClass = {
            'pending': 'text-muted',
            'downloaded': 'text-cyan',
            'processed': 'text-purple',
            'ready': 'text-green'
        }[data.status] || 'text-muted';

        const progressWidth = {
            'pending': '0%',
            'downloaded': '50%',
            'processed': '100%',
            'ready': '100%'
        }[data.status] || '0%';

        return `
        <div class="glass-panel dataset-card">
            <div class="card-icon">${icon}</div>
            <div class="card-content">
                <h3 class="card-title">${data.name}</h3>
                <div class="card-meta">
                    <span>Status: <span class="${statusClass}">${data.status.toUpperCase()}</span></span>
                    <span>Size: ${data.size}</span>
                </div>
                
                <div class="progress-bar mt-3">
                    <div class="progress-fill" style="width: ${progressWidth}; background: var(--primary-cyan);"></div>
                </div>

                <div class="card-actions mt-3">
                    <button class="btn-neon sm" ${data.status === 'processed' ? 'disabled' : ''}>
                        ${data.status === 'pending' ? 'Ingest Stream' : 'Reprocess'}
                    </button>
                    <button class="btn-icon">⚙️</button>
                </div>
            </div>
        </div>
        `;
    };

    container.innerHTML = `
        <div class="view-header mb-4">
            <h2 class="section-title">Data Acquisition Streams</h2>
            <div class="header-actions">
                <button class="btn-neon">Add Source +</button>
            </div>
        </div>

        <div class="dataset-grid">
            ${createCard('ztf', datasets.ztf || { name: 'ZTF', status: 'pending', size: '0 B' }, '🔭')}
            ${createCard('tess', datasets.tess || { name: 'TESS', status: 'pending', size: '0 B' }, '🛰️')}
            ${createCard('mast', datasets.mast || { name: 'MAST', status: 'pending', size: '0 B' }, '📡')}
            ${createCard('sim', datasets.sim || { name: 'Simulation', status: 'pending', size: '0 B' }, '🌌')}
        </div>

        <div class="glass-panel mt-4 terminal-panel">
            <div class="terminal-header">
                <span>System Log</span>
                <span class="status-dot active"></span>
            </div>
            <div class="terminal-body" id="terminal-log">
                <div class="log-line"><span class="time">[09:45:12]</span> Connection established to ZTF stream...</div>
                <div class="log-line"><span class="time">[09:45:15]</span> Handshake successful. Latency: 45ms</div>
                <div class="log-line"><span class="time">[09:46:00]</span> TESS sector 45 data packet received.</div>
            </div>
        </div>
    `;
}

// Add specific styles
const style = document.createElement('style');
style.textContent = `
    .dataset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
    }

    .dataset-card {
        display: flex;
        gap: 20px;
        align-items: flex-start;
        transition: transform 0.3s, box-shadow 0.3s;
    }

    .dataset-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 243, 255, 0.15);
    }

    .card-icon {
        font-size: 2.5rem;
        background: rgba(255, 255, 255, 0.05);
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
    }

    .card-content {
        flex: 1;
    }

    .card-title {
        font-size: 1.2rem;
        margin-bottom: 5px;
        color: var(--text-highlight);
    }

    .card-meta {
        font-size: 0.85rem;
        color: var(--text-muted);
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .card-actions {
        display: flex;
        gap: 10px;
    }

    .btn-icon {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-muted);
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
    }

    .terminal-panel {
        font-family: 'Courier New', monospace;
    }

    .terminal-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 10px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background: var(--primary-cyan);
        border-radius: 50%;
        box-shadow: 0 0 8px var(--primary-cyan);
    }

    .terminal-body {
        max-height: 150px;
        overflow-y: auto;
        font-size: 0.85rem;
        color: #a0a0b0;
    }

    .log-line {
        margin-bottom: 4px;
    }

    .time {
        color: var(--primary-purple);
        margin-right: 8px;
    }
`;
document.head.appendChild(style);
