import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World } from './world.js';
import { Player } from './player.js';
import { BlockManager } from './blocks.js';
import { UI } from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.gameMode = 'creative'; // 'creative' or 'survival'
        this.isPaused = true;
        
        this.initThree();
        this.blockManager = new BlockManager();
        this.world = new World(this);
        this.player = new Player(this);
        this.ui = new UI(this);
        
        this.lastTime = 0;
        this.setupEventListeners();
        this.animate();
    }
    
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 50, 0);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // Basic lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5).normalize();
        this.scene.add(directionalLight);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Handle controls lock/unlock
        this.controls.addEventListener('lock', () => {
            this.isPaused = false;
            document.getElementById('game-menu').classList.remove('active');
        });
        
        this.controls.addEventListener('unlock', () => {
            this.isPaused = true;
            document.getElementById('game-menu').classList.add('active');
        });
        
        // Game mode selection
        document.getElementById('start-creative').addEventListener('click', () => {
            this.gameMode = 'creative';
            this.startGame();
        });
        
        document.getElementById('start-survival').addEventListener('click', () => {
            this.gameMode = 'survival';
            this.startGame();
        });
        
        document.getElementById('resume-game').addEventListener('click', () => {
            this.controls.lock();
        });
        
        // Mouse input for block interaction
        document.addEventListener('mousedown', (event) => {
            if (this.isPaused) return;
            
            if (event.button === 0) { // Left click: destroy block
                this.world.removeBlock(this.player.getTargetBlock());
            } else if (event.button === 2) { // Right click: place block
                const targetPos = this.player.getTargetPosition();
                if (targetPos) {
                    this.world.placeBlock(targetPos, this.player.selectedBlockType);
                }
            }
        });
        
        // Prevent context menu on right-click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startGame() {
        // Initialize world based on game mode
        this.world.initialize();
        this.player.initialize();
        this.controls.lock();
    }
    
    update(deltaTime) {
        if (!this.isPaused) {
            this.player.update(deltaTime);
            this.world.update(deltaTime);
        }
        
        // Update debug info
        const pos = this.camera.position;
        document.getElementById('position').textContent = `Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
        document.getElementById('chunk').textContent = `Chunk: (${Math.floor(pos.x / 16)}, ${Math.floor(pos.z / 16)})`;
    }
    
    animate(time = 0) {
        requestAnimationFrame((t) => this.animate(t));
        
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        
        // Update FPS counter
        document.getElementById('fps').textContent = `FPS: ${Math.round(1 / (deltaTime || 0.016))}`;
        
        this.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    new Game();
});

