// import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
const THREE = window.THREE;

console.log('GlobeView Module Loaded. THREE:', THREE);

export class GlobeView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }
        console.log('GlobeView initialized with container:', this.container);

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.atmosphere = null;
        this.group = null;

        this.globeConfig = {
            pointSize: 4,
            globeColor: "#062056",
            showAtmosphere: true,
            atmosphereColor: "#FFFFFF",
            atmosphereAltitude: 0.1,
            emissive: "#062056",
            emissiveIntensity: 0.1,
            shininess: 0.9,
            polygonColor: "rgba(255,255,255,0.7)",
            ambientLight: "#38bdf8",
            directionalLeftLight: "#ffffff",
            directionalTopLight: "#ffffff",
            pointLight: "#ffffff",
            arcTime: 1000,
            arcLength: 0.9,
            rings: 1,
            maxRings: 3,
            initialPosition: { lat: 22.3193, lng: 114.1694 },
            autoRotate: true,
            autoRotateSpeed: 0.002, // Adjusted for Three.js rotation units
        };

        const colors = ["#06b6d4", "#3b82f6", "#6366f1"];
        this.sampleArcs = [
            {
                order: 1,
                startLat: -19.885592,
                startLng: -43.951191,
                endLat: -22.9068,
                endLng: -43.1729,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 1,
                startLat: 28.6139,
                startLng: 77.209,
                endLat: 3.139,
                endLng: 101.6869,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 1,
                startLat: -19.885592,
                startLng: -43.951191,
                endLat: -1.303396,
                endLng: 36.852443,
                arcAlt: 0.5,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 2,
                startLat: 1.3521,
                startLng: 103.8198,
                endLat: 35.6762,
                endLng: 139.6503,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 2,
                startLat: 51.5072,
                startLng: -0.1276,
                endLat: 3.139,
                endLng: 101.6869,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 2,
                startLat: -15.785493,
                startLng: -47.909029,
                endLat: 36.162809,
                endLng: -115.119411,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 3,
                startLat: -33.8688,
                startLng: 151.2093,
                endLat: 22.3193,
                endLng: 114.1694,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 3,
                startLat: 21.3099,
                startLng: -157.8581,
                endLat: 40.7128,
                endLng: -74.006,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 3,
                startLat: -6.2088,
                startLng: 106.8456,
                endLat: 51.5072,
                endLng: -0.1276,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 4,
                startLat: 11.986597,
                startLng: 8.571831,
                endLat: -15.595412,
                endLng: -56.05918,
                arcAlt: 0.5,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 4,
                startLat: -34.6037,
                startLng: -58.3816,
                endLat: 22.3193,
                endLng: 114.1694,
                arcAlt: 0.7,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 4,
                startLat: 51.5072,
                startLng: -0.1276,
                endLat: 48.8566,
                endLng: -2.3522,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 5,
                startLat: 14.5995,
                startLng: 120.9842,
                endLat: 51.5072,
                endLng: -0.1276,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 5,
                startLat: 1.3521,
                startLng: 103.8198,
                endLat: -33.8688,
                endLng: 151.2093,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 5,
                startLat: 34.0522,
                startLng: -118.2437,
                endLat: 48.8566,
                endLng: -2.3522,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 6,
                startLat: -15.432563,
                startLng: 28.315853,
                endLat: 1.094136,
                endLng: -63.34546,
                arcAlt: 0.7,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 6,
                startLat: 37.5665,
                startLng: 126.978,
                endLat: 35.6762,
                endLng: 139.6503,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 6,
                startLat: 22.3193,
                startLng: 114.1694,
                endLat: 51.5072,
                endLng: -0.1276,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 7,
                startLat: -19.885592,
                startLng: -43.951191,
                endLat: -15.595412,
                endLng: -56.05918,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 7,
                startLat: 48.8566,
                startLng: -2.3522,
                endLat: 52.52,
                endLng: 13.405,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 7,
                startLat: 52.52,
                startLng: 13.405,
                endLat: 34.0522,
                endLng: -118.2437,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 8,
                startLat: -8.833221,
                startLng: 13.264837,
                endLat: -33.936138,
                endLng: 18.436529,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 8,
                startLat: 49.2827,
                startLng: -123.1207,
                endLat: 52.3676,
                endLng: 4.9041,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 8,
                startLat: 1.3521,
                startLng: 103.8198,
                endLat: 40.7128,
                endLng: -74.006,
                arcAlt: 0.5,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 9,
                startLat: 51.5072,
                startLng: -0.1276,
                endLat: 34.0522,
                endLng: -118.2437,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 9,
                startLat: 22.3193,
                startLng: 114.1694,
                endLat: -22.9068,
                endLng: -43.1729,
                arcAlt: 0.7,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 9,
                startLat: 1.3521,
                startLng: 103.8198,
                endLat: -34.6037,
                endLng: -58.3816,
                arcAlt: 0.5,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 10,
                startLat: -22.9068,
                startLng: -43.1729,
                endLat: 28.6139,
                endLng: 77.209,
                arcAlt: 0.7,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 10,
                startLat: 34.0522,
                startLng: -118.2437,
                endLat: 31.2304,
                endLng: 121.4737,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 10,
                startLat: -6.2088,
                startLng: 106.8456,
                endLat: 52.3676,
                endLng: 4.9041,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 11,
                startLat: 41.9028,
                startLng: 12.4964,
                endLat: 34.0522,
                endLng: -118.2437,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 11,
                startLat: -6.2088,
                startLng: 106.8456,
                endLat: 31.2304,
                endLng: 121.4737,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 11,
                startLat: 22.3193,
                startLng: 114.1694,
                endLat: 1.3521,
                endLng: 103.8198,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 12,
                startLat: 34.0522,
                startLng: -118.2437,
                endLat: 37.7749,
                endLng: -122.4194,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 12,
                startLat: 35.6762,
                startLng: 139.6503,
                endLat: 22.3193,
                endLng: 114.1694,
                arcAlt: 0.2,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 12,
                startLat: 22.3193,
                startLng: 114.1694,
                endLat: 34.0522,
                endLng: -118.2437,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 13,
                startLat: 52.52,
                startLng: 13.405,
                endLat: 22.3193,
                endLng: 114.1694,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 13,
                startLat: 11.986597,
                startLng: 8.571831,
                endLat: 35.6762,
                endLng: 139.6503,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 13,
                startLat: -22.9068,
                startLng: -43.1729,
                endLat: -34.6037,
                endLng: -58.3816,
                arcAlt: 0.1,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
            {
                order: 14,
                startLat: -33.936138,
                startLng: 18.436529,
                endLat: 21.395643,
                endLng: 39.883798,
                arcAlt: 0.3,
                color: colors[Math.floor(Math.random() * (colors.length - 1))],
            },
        ];

        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.z = 300;
        this.camera.position.y = 100;
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(this.globeConfig.ambientLight, 0.8);
        this.scene.add(ambientLight);

        const dLight1 = new THREE.DirectionalLight(this.globeConfig.directionalLeftLight, 1);
        dLight1.position.set(-100, 100, 50);
        this.scene.add(dLight1);

        const dLight2 = new THREE.DirectionalLight(this.globeConfig.directionalTopLight, 1);
        dLight2.position.set(100, 100, 50);
        this.scene.add(dLight2);

        // Group for globe and atmosphere
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Texture Loader
        const loader = new THREE.TextureLoader();
        this.textures = {
            map: loader.load('/solar_sys/res/earth/diffuse.jpg'),
            bump: loader.load('/solar_sys/res/earth/bump.jpg'),
            spec: loader.load('/solar_sys/res/earth/spec.jpg'),
            clouds: loader.load('/solar_sys/res/earth/clouds.png')
        };

        // Create Globe
        this.createGlobe();

        // Create Atmosphere
        if (this.globeConfig.showAtmosphere) {
            this.createAtmosphere();
        }

        // Create Arcs
        this.createArcs();

        // Create Rings
        this.rings = [];
        this.createRings();

        // Create Satellites
        this.createSatellites();

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.autoRotate = this.globeConfig.autoRotate;
        this.controls.autoRotateSpeed = this.globeConfig.autoRotateSpeed * 1000; // OrbitControls speed scale is different

        // Animation loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
    }

    // ... (createGlobe, createAtmosphere, latLngToVector3, createArcs, createRings methods remain unchanged)

    createGlobe() {
        // Use a slightly larger radius for the globe to match the design
        const radius = 100;
        const geometry = new THREE.SphereGeometry(radius, 64, 64);

        const material = new THREE.MeshPhongMaterial({
            map: this.textures.map,
            bumpMap: this.textures.bump,
            bumpScale: 0.05,
            specularMap: this.textures.spec,
            specular: new THREE.Color('grey'),
            shininess: 10,
            color: 0xffffff, // White to let texture show
            emissive: 0x112244,
            emissiveIntensity: 0.2
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.group.add(this.globe);

        // Optional: Keep wireframe but make it very subtle or remove if it clashes with texture
        // Keeping it subtle for "tech" feel
        const wireframeGeo = new THREE.WireframeGeometry(geometry);
        const wireframeMat = new THREE.LineBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.05 // Very subtle
        });
        const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
        this.globe.add(wireframe);
    }

    createAtmosphere() {
        const geometry = new THREE.SphereGeometry(100 * (1 + this.globeConfig.atmosphereAltitude), 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: this.textures.clouds,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.atmosphere = new THREE.Mesh(geometry, material);
        this.group.add(this.atmosphere);
    }

    latLngToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = (radius * Math.sin(phi) * Math.sin(theta));
        const y = (radius * Math.cos(phi));

        return new THREE.Vector3(x, y, z);
    }

    createArcs() {
        this.sampleArcs.forEach(arc => {
            const start = this.latLngToVector3(arc.startLat, arc.startLng, 100);
            const end = this.latLngToVector3(arc.endLat, arc.endLng, 100);

            // Calculate mid-point for Bezier curve (control point)
            const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(100 * (1 + arc.arcAlt));

            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            const material = new THREE.LineBasicMaterial({
                color: arc.color,
                transparent: true,
                opacity: 0.6,
                linewidth: 2
            });

            const curveObject = new THREE.Line(geometry, material);
            this.group.add(curveObject);
        });
    }

    createRings() {
        if (!this.globeConfig.rings) return;

        // Create rings for unique locations in sampleArcs
        const uniqueLocations = [];
        const locationSet = new Set();

        this.sampleArcs.forEach(arc => {
            const startKey = `${arc.startLat},${arc.startLng}`;
            const endKey = `${arc.endLat},${arc.endLng}`;

            if (!locationSet.has(startKey)) {
                locationSet.add(startKey);
                uniqueLocations.push({ lat: arc.startLat, lng: arc.startLng, color: arc.color });
            }
            if (!locationSet.has(endKey)) {
                locationSet.add(endKey);
                uniqueLocations.push({ lat: arc.endLat, lng: arc.endLng, color: arc.color });
            }
        });

        uniqueLocations.forEach(loc => {
            const pos = this.latLngToVector3(loc.lat, loc.lng, 100);

            for (let i = 0; i < this.globeConfig.maxRings; i++) {
                const geometry = new THREE.RingGeometry(0, 1, 32);
                const material = new THREE.MeshBasicMaterial({
                    color: loc.color,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });
                const ring = new THREE.Mesh(geometry, material);

                // Orient ring to face outwards from center
                ring.position.copy(pos);
                ring.lookAt(new THREE.Vector3(0, 0, 0));

                // Add some randomness to animation phase
                ring.userData = {
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.02 + Math.random() * 0.02,
                    baseScale: 1
                };

                this.group.add(ring);
                this.rings.push(ring);
            }
        });
    }

    createSatellites() {
        this.satellites = [];
        const satelliteCount = 8; // Number of satellites

        // Materials
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xc0c0c0, // Silver/Chrome
            specular: 0xffffff,
            shininess: 80,
            flatShading: true
        });

        const goldMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700, // Gold foil
            specular: 0xffaa00,
            shininess: 70,
            flatShading: true
        });

        const panelMaterial = new THREE.MeshPhongMaterial({
            color: 0x101030, // Dark blue solar cells
            specular: 0x5555ff,
            shininess: 90,
            side: THREE.DoubleSide
        });

        const detailMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });

        // Orbit Line Material - Fainter
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.15, // Reduced opacity
            blending: THREE.AdditiveBlending
        });

        for (let i = 0; i < satelliteCount; i++) {
            const satelliteGroup = new THREE.Group();
            // satelliteGroup.scale.set(1, 1, 1); // Default scale

            // --- Procedural Model Construction ---

            // 1. Main Bus (Body) - Hexagonal Cylinder
            const busGeo = new THREE.CylinderGeometry(1, 1, 3, 6);
            const bus = new THREE.Mesh(busGeo, goldMaterial);
            bus.rotation.z = Math.PI / 2; // Lay flat
            satelliteGroup.add(bus);

            // 2. Solar Panels
            // Arms
            const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 14, 8);
            const arm = new THREE.Mesh(armGeo, bodyMaterial);
            arm.rotation.z = Math.PI / 2;
            satelliteGroup.add(arm);

            // Panels (Left & Right)
            const panelGeo = new THREE.BoxGeometry(6, 0.1, 3);

            const leftPanel = new THREE.Mesh(panelGeo, panelMaterial);
            leftPanel.position.set(-5, 0, 0);
            satelliteGroup.add(leftPanel);

            // Add grid detail to panels
            const leftGrid = new THREE.Mesh(panelGeo, detailMaterial);
            leftGrid.position.set(-5, 0, 0);
            leftGrid.scale.set(1.01, 1.01, 1.01); // Slightly larger to prevent z-fighting
            satelliteGroup.add(leftGrid);

            const rightPanel = new THREE.Mesh(panelGeo, panelMaterial);
            rightPanel.position.set(5, 0, 0);
            satelliteGroup.add(rightPanel);

            const rightGrid = new THREE.Mesh(panelGeo, detailMaterial);
            rightGrid.position.set(5, 0, 0);
            rightGrid.scale.set(1.01, 1.01, 1.01);
            satelliteGroup.add(rightGrid);

            // 3. Comms Dish
            const dishGeo = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, 0.6); // Hemisphere-ish
            const dish = new THREE.Mesh(dishGeo, bodyMaterial);
            dish.position.set(0, 1.5, 0);
            dish.rotation.x = Math.PI; // Face up/out
            satelliteGroup.add(dish);

            // Antenna spike
            const antGeo = new THREE.CylinderGeometry(0.1, 0.02, 3, 8);
            const antenna = new THREE.Mesh(antGeo, bodyMaterial);
            antenna.position.set(0, 2.5, 0);
            satelliteGroup.add(antenna);

            // --- End Model ---

            // 3. Orbit Parameters
            const altitude = 130 + Math.random() * 50;
            const inclination = (Math.random() - 0.5) * Math.PI;
            const speed = 0.001 + Math.random() * 0.002; // Slower, majestic
            const phase = Math.random() * Math.PI * 2;
            const axis = new THREE.Vector3(Math.sin(inclination), Math.cos(inclination), 0).normalize();

            // 4. Create Orbit Line (Only for 50% of satellites)
            if (i % 2 === 0) {
                const orbitPoints = [];
                const segments = 128;
                for (let j = 0; j <= segments; j++) {
                    const theta = (j / segments) * Math.PI * 2;
                    const p = new THREE.Vector3(altitude, 0, 0);
                    p.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);
                    p.applyAxisAngle(axis, inclination);
                    orbitPoints.push(p);
                }
                const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
                const orbitLine = new THREE.Line(orbitGeo, orbitMaterial);
                this.group.add(orbitLine);
            }

            // Add satellite to scene
            this.group.add(satelliteGroup);

            // Store for animation
            this.satellites.push({
                mesh: satelliteGroup,
                altitude: altitude,
                inclination: inclination,
                speed: speed,
                phase: phase,
                axis: axis
            });
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        if (this.controls) {
            this.controls.update();
        }

        // Animate Rings
        if (this.rings.length > 0) {
            this.rings.forEach(ring => {
                ring.userData.phase += ring.userData.speed;
                const s = Math.sin(ring.userData.phase);
                // Scale goes from 0 to 5 (pulsing)
                const scale = Math.abs(s) * 5;
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = Math.max(0, 1 - Math.abs(s));
            });
        }

        // Animate Satellites
        if (this.satellites) {
            this.satellites.forEach(sat => {
                sat.phase += sat.speed;

                // Calculate position based on circular orbit
                // x = r * cos(phase)
                // z = r * sin(phase)
                // Then rotate by inclination axis

                const x = sat.altitude * Math.cos(sat.phase);
                const z = sat.altitude * Math.sin(sat.phase);

                // Base position on flat plane
                const pos = new THREE.Vector3(x, 0, z);

                // Apply inclination rotation
                pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), sat.inclination); // Tilt around X first
                // Or use the pre-calculated axis if we want a specific orbital plane normal
                // Let's keep it simple: Orbit around Y axis, then tilt

                // Better approach for random orbits:
                // Start at (r, 0, 0), rotate by phase around Y, then rotate by inclination around Z
                const p = new THREE.Vector3(sat.altitude, 0, 0);
                p.applyAxisAngle(new THREE.Vector3(0, 1, 0), sat.phase); // Orbit
                p.applyAxisAngle(sat.axis, sat.inclination); // Tilt

                sat.mesh.position.copy(p);
                sat.mesh.lookAt(new THREE.Vector3(0, 0, 0)); // Always face earth
                sat.mesh.rotateY(Math.PI / 2); // Orient panels correctly
            });
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}
