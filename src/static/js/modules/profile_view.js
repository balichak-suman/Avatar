
export function renderProfile(container, store) {
    const user = store.user || {
        name: 'Unknown User',
        rank: 'Guest',
        clearance: 'None',
        joined: 'N/A',
        email: 'N/A',
        recent_activity: []
    };

    // directly inject children to match .modal-content grid (350px 1fr) defined in style.css
    container.innerHTML = `
        <!-- LEFT PANEL: IDENTITY -->
        <div class="profile-sidebar glass-panel-custom">
            <div class="profile-hex-large">
                <div class="hex-inner-large">
                    <div class="avatar-icon-large">👤</div>
                </div>
            </div>
            <h2 class="profile-name-large">${user.name}</h2>
            <div class="profile-meta-stack">
                <div class="meta-row"><span class="label">Rank:</span> <span class="val-rank">${user.rank}</span></div>
                <div class="meta-row"><span class="label">Clearance:</span> <span class="val-clearance">${user.clearance}</span></div>
                <div class="meta-row"><span class="label">Joined:</span> <span class="val-date">${user.joined}</span></div>
            </div>
            <button class="btn-edit-profile-large" onclick="editProfile()">Edit Profile</button>
        </div>

        <!-- RIGHT PANEL: CONTENT -->
        <div class="profile-main-content">
            
            <!-- TOP BOX: MISSION STATUS -->
            <div class="content-box glass-panel-custom">
                <h3 class="box-title">MISSION STATUS</h3>
                
                <div class="status-grid">
                    <!-- Access Module -->
                    <div class="status-module">
                        <div class="module-header">ACCESS PROTOCOL</div>
                        <div class="info-row">
                            <span class="info-label">Email Link</span>
                            <span class="info-val cyan text-ellipsis">${user.email || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Session Token</span>
                            <div class="token-wrapper">
                                <span id="token-display" class="token-text">****************</span>
                                <button class="token-eye-btn" onclick="revealToken()">👁️</button>
                            </div>
                        </div>
                    </div>

                    <!-- Settings Module -->
                    <div class="status-module">
                        <div class="module-header">SYSTEM SETTINGS</div>
                        <div class="switch-row">
                            <span>Critical Alerts</span>
                            <label class="toggle-switch">
                                <input type="checkbox" checked onchange="toggleSetting('alerts', this.checked)">
                                    <span class="slider"></span>
                            </label>
                        </div>
                        <div class="switch-row">
                            <span>Holo Render</span>
                            <label class="toggle-switch">
                                <input type="checkbox" checked onchange="toggleSetting('shaders', this.checked)">
                                    <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Permissions Footer -->
                <div class="perm-footer">
                    <span class="perm-tag success">✓ Telemetry</span>
                    <span class="perm-tag success">✓ Datasets</span>
                    <span class="perm-tag warning">⚠ Override</span>
                    <span class="perm-tag error">✕ Core Mod</span>
                </div>
            </div>

            <!-- BOTTOM BOX: RECENT ACTIVITY -->
            <div class="content-box glass-panel-custom">
                <h3 class="box-title">RECORDS LOG</h3>
                <div class="activity-scroll-area">
                        ${user.recent_activity.length ? user.recent_activity.map(act => `
                        <div class="activity-item">
                            <span class="act-time">[${act.time}]</span>
                            <span class="act-desc">${act.action}</span>
                        </div>
                    `).join('') : '<div class="no-data">No recent activity logged.</div>'}
                </div>
            </div>

        </div>
    `;

    // Global Handlers (Debounced/Lazy init)
    if (!window.revealToken) {
        window.revealToken = function () {
            const token = localStorage.getItem('token');
            const display = document.getElementById('token-display');
            if (!display) return;

            if (display.innerText.includes('*')) {
                display.innerText = token ? (token.substring(0, 12) + '...') : 'No Token';
                display.style.color = '#00ff88';
            } else {
                display.innerText = '****************';
                display.style.color = '#64748b';
            }
        };
    }
    if (!window.toggleSetting) {
        window.toggleSetting = function (key, value) {
            console.log(`Setting ${key} changed to ${value}`);
            localStorage.setItem(`setting_${key}`, value);
        };
    }

    if (!window.editProfile) {
        window.editProfile = function () {
            // "Mission Control" Themed Feedback
            alert("⚠️ SECURITY ALERT: Core Identity modification requires COMMANDER_LEVEL_5 authorization.\n\nPlease contact System Administrator for rank promotion or data correction.");
        };
    }
}

// STYLES
const style = document.createElement('style');
style.textContent = `
    /* Using component-scoped styles to avoid global reset conflicts */

    .glass-panel-custom {
        background: rgba(13, 16, 28, 0.85);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 243, 255, 0.3);
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.05), inset 0 0 30px rgba(0, 0, 0, 0.6);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    
    /* LEFT SIDEBAR */
    .profile-sidebar {
        align-items: center;
        text-align: center;
        justify-content: center;
        height: 100%; 
    }

    .profile-hex-large {
        width: 130px;
        height: 130px;
        margin-bottom: 20px;
        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        background: linear-gradient(135deg, #00f3ff, #bc13fe);
        padding: 2px;
        box-shadow: 0 0 30px rgba(0, 243, 255, 0.2);
    }
    .hex-inner-large {
        width: 100%; height: 100%;
        background: #0b101d; 
        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        display: flex; align-items: center; justify-content: center;
    }
    .avatar-icon-large { font-size: 3.5rem; }

    .profile-name-large {
        margin: 5px 0 15px 0;
        font-size: 1.6rem;
        font-weight: 700;
        background: linear-gradient(to right, #fff, #a5b4fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
    }

    .profile-meta-stack {
        width: 100%;
        display: flex; 
        flex-direction: column;
        gap: 8px;
        margin-bottom: 25px;
    }
    .meta-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 12px;
        background: rgba(255,255,255,0.03);
        border-radius: 4px;
        font-size: 0.9rem;
    }
    .label { color: #94a3b8; }
    .val-rank { color: #facc15; font-weight: 600; }
    .val-clearance { color: #00f3ff; }
    .val-date { color: #cbd5e1; }

    .btn-edit-profile-large {
        width: 100%;
        padding: 12px;
        background: linear-gradient(90deg, rgba(0, 243, 255, 0.1), rgba(188, 19, 254, 0.1));
        border: 1px solid #00f3ff;
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: 0.3s;
        box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
    }
    .btn-edit-profile-large:hover {
        background: linear-gradient(90deg, rgba(0, 243, 255, 0.2), rgba(188, 19, 254, 0.2));
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
    }

    /* RIGHT CONTENT */
    .profile-main-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: 100%;
        overflow-y: auto;
        padding-right: 4px;
    }

    .content-box {
        flex-shrink: 0;
    }
    
    .box-title {
        margin: 0 0 15px 0;
        font-size: 0.9rem;
        color: #facc15; 
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: 1px;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
    }

    /* MISSION STATUS GRID */
    .status-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
    }

    .status-module {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .module-header {
        font-size: 0.7rem;
        color: #64748b;
        font-weight: 700;
        margin-bottom: 10px;
        text-transform: uppercase;
    }

    .info-row, .switch-row {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 8px; font-size: 0.8rem;
        color: #e2e8f0;
    }
    
    .text-ellipsis {
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .info-val.cyan { color: #00f3ff; }
    
    .token-wrapper {
        background: rgba(0,0,0,0.5);
        padding: 4px 8px;
        border-radius: 4px;
        display: flex; align-items: center; gap: 8px;
    }
    .token-text { font-family: monospace; font-size: 0.75rem; color: #64748b; }
    .token-eye-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0; opacity: 0.8; }
    .token-eye-btn:hover { opacity: 1; filter: brightness(1.2); }

    /* TOGGLE SWITCH */
    .toggle-switch {
        position: relative; width: 34px; height: 18px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: #334155; border-radius: 20px; transition: .4s;
    }
    .slider:before {
        position: absolute; content: ""; height: 12px; width: 12px;
        left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .4s;
    }
    input:checked + .slider { background-color: #bc13fe; }
    input:checked + .slider:before { transform: translateX(16px); }

    /* PERMISSIONS TAGS */
    .perm-footer {
        display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto;
    }
    .perm-tag {
        font-size: 0.75rem; padding: 4px 8px; border-radius: 4px;
        background: rgba(255,255,255,0.05);
        border: 1px solid transparent;
    }
    .perm-tag.success { color: #4ade80; border-color: rgba(74, 222, 128, 0.2); }
    .perm-tag.warning { color: #facc15; border-color: rgba(250, 204, 21, 0.2); }
    .perm-tag.error { color: #f87171; border-color: rgba(248, 113, 113, 0.2); }

    /* RECENT ACTIVITY */
    .activity-scroll-area {
        max-height: 140px;
        overflow-y: auto;
        display: flex; flex-direction: column;
    }
    .activity-item {
        display: flex;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 0.85rem;
    }
    .activity-item:last-child { border-bottom: none; }
    .act-time {
        width: 80px;
        color: #64748b;
        font-family: monospace;
        font-size: 0.75rem;
    }
    .act-desc {
        color: #e2e8f0;
        flex: 1;
    }
    .no-data { padding: 5px; color: #64748b; font-size: 0.8rem; }
`;
document.head.appendChild(style);
