export function renderDataStreams(container, store) {
    container.innerHTML = `
        <div class="datastreams-dashboard">
            <section class="bottom-section">
                <!-- REAL-TIME DATA INGESTION STATUS -->
                <div class="data-ingestion-row">
                    <div class="data-box" id="ztf-box">
                        <div class="box-header">ZTF DATA STREAM</div>
                        <div class="data-stat">${renderDatasetStatus(store.datasets?.ztf)}</div>
                        <div class="data-meta">LIVE FEED</div>
                    </div>
                    <div class="data-box" id="archive-box">
                        <div class="box-header">ARCHIVE INGESTION (MAST/TESS)</div>
                        <div class="data-stat">${renderDatasetStatus(store.datasets?.mast)}</div>
                        <div class="data-meta">SYNC STATUS: ACTIVE</div>
                    </div>
                </div>
            </section>
        </div>
    `;

    // Inject CSS Styles specific to data streams if not already present
    // Re-using the styles from pipeline_core.js for consistency
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

        .datastreams-dashboard {
            display: flex;
            flex-direction: column;
            gap: 12px;
            height: 100%;
            color: #fff;
            font-family: 'Inter', sans-serif;
            padding-top: 20px;
            box-sizing: border-box;
            overflow-x: hidden; 
            overflow-y: auto; 
        }

        .bottom-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex: 1;
        }

        /* --- DATA INGESTION ROW --- */
        .data-ingestion-row {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            width: 100%;
            flex: 1; 
            min-height: 200px; /* Larger boxes for dedicated page */
        }

        .data-box {
            flex: 1 1 300px;
            background: rgba(10, 14, 28, 0.6);
            border: 1px solid rgba(0, 219, 222, 0.2);
            border-radius: 8px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center; /* Center align for main page */
            position: relative;
            overflow: hidden;
            height: 100%; 
        }

        .data-box::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 6px; height: 100%;
            background: #00dbde;
            opacity: 0.5;
        }

        .box-header {
            font-size: 1rem;
            font-weight: 700;
            color: #94a3b8;
            letter-spacing: 2px;
            margin-bottom: 20px;
        }

        .data-stat {
            display: flex;
            align-items: baseline;
            transform: scale(1.5); /* Make stats larger */
        }

        .data-meta {
            font-size: 0.8rem;
            color: #475569;
            margin-top: 15px;
            font-family: 'JetBrains Mono', monospace;
        }
    `;
    document.head.appendChild(style);
}

export function updateDataStreamValues(store) {
    const ztfBox = document.getElementById('ztf-box');
    const archiveBox = document.getElementById('archive-box');

    if (ztfBox) {
        const statEl = ztfBox.querySelector('.data-stat');
        if (statEl) statEl.innerHTML = renderDatasetStatus(store.datasets?.ztf);
    }

    if (archiveBox) {
        const statEl = archiveBox.querySelector('.data-stat');
        if (statEl) statEl.innerHTML = renderDatasetStatus(store.datasets?.mast);
    }
}

const renderDatasetStatus = (ds) => {
    if (!ds) return '<span class="status-waiting">CONNECTING...</span>';
    const isLive = ds.status === 'downloaded';
    const color = ds.status === 'processed' ? '#00ff88' : (isLive ? '#00ff00' : '#64748b');
    const statusText = ds.status ? (isLive ? 'LIVE STREAM' : ds.status.toUpperCase()) : 'PENDING';
    const pulseClass = isLive ? 'live-pulse' : '';

    return `
        <span style="color: ${color}; font-size: 1.1rem; font-weight: 700;">${ds.size || '0 B'}</span>
        <span class="${pulseClass}" style="font-size: 0.7rem; color: ${color}; margin-left: 8px; font-weight: 600;">[${statusText}]</span>
        <style>
            @keyframes pulse-green {
                0% { opacity: 1; text-shadow: 0 0 5px #00ff00; }
                50% { opacity: 0.7; text-shadow: 0 0 15px #00ff00; }
                100% { opacity: 1; text-shadow: 0 0 5px #00ff00; }
            }
            .live-pulse {
                animation: pulse-green 1.5s infinite;
            }
        </style>
    `;
}
