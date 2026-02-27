export class ChatWidget {
    constructor() {
        console.log("ChatWidget: Constructor called");
        this.isOpen = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.robot = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.controls = null;
        this.init();
    }

    init() {
        console.log("ChatWidget: Init sequence starting...");
        this.createStyles();
        this.createDOM();
        this.initThreeJS();
        this.bindEvents();
        console.log("ChatWidget: Init complete.");
    }

    startAutoWave(clips) {
        const waveClip = THREE.AnimationClip.findByName(clips, 'Wave');
        if (!waveClip || !this.mixer) return;

        this.waveAction = this.mixer.clipAction(waveClip);
        this.waveAction.loop = THREE.LoopOnce;
        this.waveAction.clampWhenFinished = false;

        // Wave once immediately after load
        setTimeout(() => this.playWave(), 2000);

        // Then wave every 10 seconds
        setInterval(() => {
            if (!this.isOpen) this.playWave();
        }, 10000);
    }

    playWave() {
        if (!this.waveAction) return;
        this.waveAction.reset();
        this.waveAction.play();
    }

    createStyles() {
        const style = document.createElement('style');
        style.innerText = `
            #avatar-orb {
                width: 224px; /* 1.6x of 140px */
                height: 224px;
                background: transparent;
                cursor: grab;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #avatar-orb:active {
                cursor: grabbing;
            }

            /* Fixed Position Fallback (if no sidebar) */
            #avatar-orb.fixed-mode {
                position: fixed;
                bottom: 10px;
                right: 10px;
            }

            /* Sidebar Mode */
            #avatar-orb.sidebar-mode {
                margin-top: auto;
                margin-left: -5px; /* Slight offset for centering 224px in 280px sidebar */
                margin-bottom: 20px;
                position: relative;
            }

            #avatar-orb:hover canvas {
                filter: drop-shadow(0 0 18px rgba(0, 217, 255, 0.45));
            }

            #chat-window {
                position: fixed;
                bottom: 90px;
                width: 350px;
                height: 500px;
                background: rgba(10, 14, 26, 0.95);
                border: 1px solid #00d9ff;
                border-radius: 12px;
                backdrop-filter: blur(10px);
                display: none;
                flex-direction: column;
                box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
                z-index: 9999;
                font-family: 'Inter', sans-serif;
            }
            
            #chat-window.right-aligned {
                right: 30px;
                bottom: 250px;
            }

            #chat-window.left-aligned {
                left: 280px; /* Sidebar width */
                bottom: 40px;
                border-bottom-left-radius: 0;
            }

            .chat-header {
                padding: 15px;
                border-bottom: 1px solid rgba(0, 217, 255, 0.3);
                background: rgba(0, 217, 255, 0.1);
                color: #00d9ff;
                font-weight: 700;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px 12px 0 0;
            }
            
            .chat-close {
                cursor: pointer;
                font-size: 1.2em;
            }
            
            .chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .message {
                max-width: 80%;
                padding: 10px;
                border-radius: 8px;
                font-size: 0.9em;
                line-height: 1.4;
            }
            .message.user {
                align-self: flex-end;
                background: rgba(0, 217, 255, 0.2);
                color: #fff;
                border: 1px solid rgba(0, 217, 255, 0.3);
            }
            .message.ai {
                align-self: flex-start;
                background: rgba(255, 255, 255, 0.05);
                color: #cfd8dc;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .message.mission-topic {
                border-color: #00f3ff !important;
                color: #00f3ff !important;
                background: rgba(0, 243, 255, 0.1) !important;
                box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
            }
            .message.general-topic {
                border-color: #8b5cf6 !important;
                color: #8b5cf6 !important;
                background: rgba(139, 92, 246, 0.1) !important;
                box-shadow: 0 0 10px rgba(139, 92, 246, 0.1);
            }
            .chat-input-area {
                padding: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                gap: 10px;
            }
            #chat-input {
                flex: 1;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                padding: 8px;
                color: #fff;
                outline: none;
            }
            #chat-send {
                background: #00d9ff;
                border: none;
                border-radius: 4px;
                padding: 8px 15px;
                color: #000;
                font-weight: bold;
                cursor: pointer;
            }
            .chat-messages::-webkit-scrollbar { width: 5px; }
            .chat-messages::-webkit-scrollbar-thumb { background: #0056b3; border-radius: 5px; }
        `;
        document.head.appendChild(style);
    }

    createDOM() {
        const orb = document.createElement('div');
        orb.id = 'avatar-orb';
        orb.title = "Drag to Rotate | Click to Chat";

        const chatWindowEl = document.createElement('div');
        chatWindowEl.id = 'chat-window';
        chatWindowEl.innerHTML = `
            <div class="chat-header">
                <span>COSMIC ORACLE AI</span>
                <span class="chat-close">×</span>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="message ai">Commander online. Systems active. How can I assist you?</div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Ask about space or data stats..." autocomplete="off">
                <button id="chat-send">SEND</button>
            </div>
        `;
        document.body.appendChild(chatWindowEl);

        const sidebar = document.querySelector('.sidebar-box') || document.querySelector('.nav-menu');

        if (sidebar) {
            orb.classList.add('sidebar-mode');
            sidebar.appendChild(orb);
            chatWindowEl.classList.add('left-aligned');

            const computedStyle = window.getComputedStyle(sidebar);
            if (computedStyle.display !== 'flex') {
                sidebar.style.display = 'flex';
                sidebar.style.flexDirection = 'column';
            }
        } else {
            orb.classList.add('fixed-mode');
            document.body.appendChild(orb);
            chatWindowEl.classList.add('right-aligned');
        }

        this.orb = orb;
        this.chatWindow = chatWindowEl;
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');
        this.messages = document.getElementById('chat-messages');
        this.closeBtn = chatWindowEl.querySelector('.chat-close');
    }

    initThreeJS() {
        if (!window.THREE || !window.THREE.GLTFLoader) {
            console.error("Three.js or GLTFLoader missing. Fallback to Emoji.");
            this.orb.innerHTML = '🤖';
            return;
        }

        this.scene = new THREE.Scene();

        // FULL BODY CAMERA SETTINGS
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 2, 7);

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(224, 224); // 1.6x Size
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.orb.appendChild(this.renderer.domElement);

        // OrbitControls for interaction
        if (window.THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = false;
            this.controls.enablePan = false;
            this.controls.minPolarAngle = Math.PI / 3;
            this.controls.maxPolarAngle = Math.PI / 1.5;
            this.controls.target.set(0, 1.5, 0);
            this.controls.update();
        }

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0x00d9ff, 2);
        dirLight.position.set(3, 10, 10);
        this.scene.add(dirLight);

        const loader = new THREE.GLTFLoader();
        loader.load('/solar_sys/res/RobotExpressive.glb', (gltf) => {
            this.robot = gltf.scene;
            this.scene.add(this.robot);

            // Positioning for Full Body - LIFTED MORE & LEFT
            this.robot.position.set(-0.6, 0.3, 0); // X=-0.6 (Left), Y=0.3 (Lifted)
            this.robot.scale.set(0.6, 0.6, 0.6);

            this.mixer = new THREE.AnimationMixer(this.robot);
            this.clips = gltf.animations;

            const clip = THREE.AnimationClip.findByName(this.clips, 'Idle') || this.clips[0];
            if (clip) {
                const action = this.mixer.clipAction(clip);
                action.play();
            }

            // Start auto-wave cycle
            this.startAutoWave(this.clips);

            this.animate();

        }, undefined, (error) => {
            console.error('An error occurred loading the robot:', error);
            this.orb.innerHTML = '🤖';
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        if (this.mixer) this.mixer.update(delta);
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    bindEvents() {
        this.orb.addEventListener('click', (e) => {
            this.toggleChat();
        });

        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChat();
        });

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.chatWindow.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen) this.input.focus();
    }

    addMessage(text, type, extraClass = '') {
        const div = document.createElement('div');
        div.className = `message ${type} ${extraClass}`;
        div.innerText = text;

        // Force colors via inline styles to override any specificy issues
        if (extraClass === 'mission-topic') {
            div.style.borderColor = '#00f3ff';
            div.style.color = '#00f3ff';
            div.style.backgroundColor = 'rgba(0, 243, 255, 0.1)';
            div.style.boxShadow = '0 0 10px rgba(0, 243, 255, 0.1)';
        } else if (extraClass === 'general-topic') {
            div.style.borderColor = '#8b5cf6';
            div.style.color = '#8b5cf6';
            div.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
            div.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.1)';
        }

        this.messages.appendChild(div);
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        this.input.value = '';

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai';
        loadingDiv.innerText = 'Processing...';
        this.messages.appendChild(loadingDiv);
        this.messages.scrollTop = this.messages.scrollHeight;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            this.messages.removeChild(loadingDiv);

            // Parse Tag
            let content = data.response;
            let extraClass = '';

            if (content.startsWith('[MISSION]')) {
                content = content.replace('[MISSION]', '').trim();
                extraClass = 'mission-topic';
            } else if (content.startsWith('[GENERAL]')) {
                content = content.replace('[GENERAL]', '').trim();
                extraClass = 'general-topic';
            }

            this.addMessage(content, 'ai', extraClass);
        } catch (e) {
            this.messages.removeChild(loadingDiv);
            this.addMessage("Connection Error: Uplink failed.", 'ai');
            console.error(e);
        }
    }
}
