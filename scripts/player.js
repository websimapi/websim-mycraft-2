import * as THREE from 'three';

export class Player {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.controls = game.controls;
        this.scene = game.scene;
        this.world = game.world;
        
        this.height = 1.8;
        this.walkSpeed = 5.0;
        this.runSpeed = 8.0;
        this.jumpSpeed = 8.0;
        this.gravity = 20.0;
        
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        
        this.health = 20;
        this.hunger = 20;
        this.inventory = []; // Array of items player has
        this.selectedSlot = 0;
        this.selectedBlockType = 1; // Default to stone
        
        // Ray for block targeting
        this.raycaster = new THREE.Raycaster();
        this.targetDistance = 5;
        
        this.setupEventListeners();
    }
    
    initialize() {
        this.camera.position.set(0, 50, 0);
        this.velocity.set(0, 0, 0);
        this.health = 20;
        this.hunger = 20;
        
        // Initialize inventory based on game mode
        if (this.game.gameMode === 'creative') {
            // Add all block types to inventory
            this.inventory = Array.from({ length: 10 }, (_, i) => ({ type: 'block', id: i + 1 }));
        } else {
            // Start with empty inventory
            this.inventory = [];
        }
        
        // Update UI
        this.updateStatusBars();
    }
    
    setupEventListeners() {
        // Keyboard controls
        this.keys = {};
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            // Handle key presses
            if (event.code === 'KeyE' && !this.game.isPaused) {
                this.toggleInventory();
            }
            
            // Number keys to select hotbar slot
            if (event.code.startsWith('Digit') && !isNaN(parseInt(event.code.slice(-1)))) {
                const slotNum = parseInt(event.code.slice(-1)) - 1;
                if (slotNum >= 0 && slotNum < 9) {
                    this.selectedSlot = slotNum;
                    this.updateHotbarSelection();
                    
                    // Update selected block type based on inventory
                    if (this.inventory[this.selectedSlot]) {
                        this.selectedBlockType = this.inventory[this.selectedSlot].id;
                    }
                }
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // Mouse wheel to scroll through hotbar
        document.addEventListener('wheel', (event) => {
            if (this.game.isPaused) return;
            
            if (event.deltaY > 0) {
                this.selectedSlot = (this.selectedSlot + 1) % 9;
            } else {
                this.selectedSlot = (this.selectedSlot - 1 + 9) % 9;
            }
            
            this.updateHotbarSelection();
            
            // Update selected block type based on inventory
            if (this.inventory[this.selectedSlot]) {
                this.selectedBlockType = this.inventory[this.selectedSlot].id;
            }
        });
    }
    
    update(deltaTime) {
        if (this.game.isPaused) return;
        
        this.processMovement(deltaTime);
        this.updatePhysics(deltaTime);
        this.checkBlockCollisions();
        
        // In survival mode, handle health & hunger
        if (this.game.gameMode === 'survival') {
            this.hungerTimer = (this.hungerTimer || 0) + deltaTime;
            if (this.hungerTimer > 10) { // Reduce hunger every 10 seconds
                this.hunger = Math.max(0, this.hunger - 1);
                this.hungerTimer = 0;
                this.updateStatusBars();
            }
            
            // Health regeneration when hunger is high
            if (this.hunger > 18) {
                this.healthRegenTimer = (this.healthRegenTimer || 0) + deltaTime;
                if (this.healthRegenTimer > 4 && this.health < 20) {
                    this.health += 1;
                    this.healthRegenTimer = 0;
                    this.updateStatusBars();
                }
            }
            
            // Take damage when hunger is empty
            if (this.hunger === 0) {
                this.starvationTimer = (this.starvationTimer || 0) + deltaTime;
                if (this.starvationTimer > 4) {
                    this.health = Math.max(1, this.health - 1); // Don't kill player, leave at 1 health
                    this.starvationTimer = 0;
                    this.updateStatusBars();
                }
            }
        }
    }
    
    processMovement(deltaTime) {
        // Get movement direction based on camera orientation
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        
        const sideways = new THREE.Vector3(-direction.z, 0, direction.x);
        
        // Reset horizontal velocity
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Determine speed based on sprint key
        const speed = this.keys['ShiftLeft'] ? this.runSpeed : this.walkSpeed;
        
        // Apply movement in corresponding direction
        if (this.keys['KeyW']) {
            this.velocity.add(direction.multiplyScalar(speed));
        }
        if (this.keys['KeyS']) {
            this.velocity.add(direction.multiplyScalar(-speed));
        }
        if (this.keys['KeyA']) {
            this.velocity.add(sideways.multiplyScalar(-speed));
        }
        if (this.keys['KeyD']) {
            this.velocity.add(sideways.multiplyScalar(speed));
        }
        
        // Handle jumping
        if (this.keys['Space'] && this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
        }
        
        // Flying in creative mode
        if (this.game.gameMode === 'creative') {
            if (this.keys['Space']) {
                this.velocity.y = speed;
            }
            if (this.keys['ShiftLeft']) {
                this.velocity.y = -speed;
            }
            if (!this.keys['Space'] && !this.keys['ShiftLeft']) {
                this.velocity.y = 0;
            }
        }
    }
    
    updatePhysics(deltaTime) {
        // Apply gravity in survival mode
        if (this.game.gameMode === 'survival') {
            this.velocity.y -= this.gravity * deltaTime;
        }
        
        // Move camera
        this.camera.position.x += this.velocity.x * deltaTime;
        this.camera.position.y += this.velocity.y * deltaTime;
        this.camera.position.z += this.velocity.z * deltaTime;
        
        // Prevent falling through the ground
        if (this.camera.position.y < this.height) {
            this.camera.position.y = this.height;
            this.velocity.y = 0;
            this.onGround = true;
        }
    }
    
    checkBlockCollisions() {
        // Simple collision detection with surrounding blocks
        const pos = this.camera.position.clone();
        const checkRadius = 0.6; // Player "width"
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const blockX = Math.floor(pos.x + x * checkRadius);
                    const blockY = Math.floor(pos.y + y * checkRadius);
                    const blockZ = Math.floor(pos.z + z * checkRadius);
                    
                    const blockType = this.world.getBlock(blockX, blockY, blockZ);
                    
                    if (blockType !== 0 && !this.game.blockManager.isTransparent(blockType)) {
                        // Get the block bounds
                        const minX = blockX;
                        const maxX = blockX + 1;
                        const minY = blockY;
                        const maxY = blockY + 1;
                        const minZ = blockZ;
                        const maxZ = blockZ + 1;
                        
                        // Check if player is inside the block
                        if (pos.x + checkRadius > minX && pos.x - checkRadius < maxX &&
                            pos.y + this.height > minY && pos.y - 0.1 < maxY &&
                            pos.z + checkRadius > minZ && pos.z - checkRadius < maxZ) {
                            
                            // Push player out of the block (simplistic approach)
                            const overlapX = Math.min(pos.x + checkRadius - minX, maxX - (pos.x - checkRadius));
                            const overlapY = Math.min(pos.y + this.height - minY, maxY - (pos.y - 0.1));
                            const overlapZ = Math.min(pos.z + checkRadius - minZ, maxZ - (pos.z - checkRadius));
                            
                            // Find smallest overlap to push in that direction
                            if (overlapX <= overlapY && overlapX <= overlapZ) {
                                pos.x += (pos.x < (minX + maxX) / 2) ? -overlapX : overlapX;
                            } else if (overlapY <= overlapX && overlapY <= overlapZ) {
                                pos.y += (pos.y < (minY + maxY) / 2) ? -overlapY : overlapY;
                                if (overlapY === maxY - (pos.y - 0.1) && this.velocity.y < 0) {
                                    this.velocity.y = 0;
                                    this.onGround = true;
                                }
                            } else {
                                pos.z += (pos.z < (minZ + maxZ) / 2) ? -overlapZ : overlapZ;
                            }
                            
                            this.camera.position.copy(pos);
                        }
                    }
                }
            }
        }
    }
    
    getTargetBlock() {
        // Cast ray from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.raycaster.set(this.camera.position, direction);
        
        // Create a collision box for each block in front of the player
        const blocks = [];
        const maxDistance = this.targetDistance;
        
        // Sample points along the ray to find blocks
        for (let dist = 0; dist <= maxDistance; dist += 0.5) {
            const point = this.camera.position.clone().add(direction.clone().multiplyScalar(dist));
            const blockX = Math.floor(point.x);
            const blockY = Math.floor(point.y);
            const blockZ = Math.floor(point.z);
            
            const blockType = this.world.getBlock(blockX, blockY, blockZ);
            
            if (blockType !== 0 && !this.game.blockManager.isTransparent(blockType)) {
                return { x: blockX, y: blockY, z: blockZ, type: blockType };
            }
        }
        
        return null;
    }
    
    getTargetPosition() {
        // Get targeted block
        const targetBlock = this.getTargetBlock();
        if (!targetBlock) return null;
        
        // Cast ray from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.raycaster.set(this.camera.position, direction);
        
        // Create a box for the targeted block
        const box = new THREE.Box3(
            new THREE.Vector3(targetBlock.x, targetBlock.y, targetBlock.z),
            new THREE.Vector3(targetBlock.x + 1, targetBlock.y + 1, targetBlock.z + 1)
        );
        
        // Raycast against box to find hit point
        const intersection = this.raycaster.ray.intersectBox(box, new THREE.Vector3());
        
        if (intersection) {
            // Determine which face was hit
            const eps = 0.001;
            let nx = 0, ny = 0, nz = 0;
            
            if (Math.abs(intersection.x - targetBlock.x) < eps) nx = -1;
            else if (Math.abs(intersection.x - (targetBlock.x + 1)) < eps) nx = 1;
            else if (Math.abs(intersection.y - targetBlock.y) < eps) ny = -1;
            else if (Math.abs(intersection.y - (targetBlock.y + 1)) < eps) ny = 1;
            else if (Math.abs(intersection.z - targetBlock.z) < eps) nz = -1;
            else if (Math.abs(intersection.z - (targetBlock.z + 1)) < eps) nz = 1;
            
            // Place block on adjacent position
            return {
                x: targetBlock.x + nx,
                y: targetBlock.y + ny,
                z: targetBlock.z + nz
            };
        }
        
        return null;
    }
    
    toggleInventory() {
        const inventory = document.getElementById('inventory-screen');
        if (inventory.classList.contains('active')) {
            inventory.classList.remove('active');
            this.controls.lock();
        } else {
            inventory.classList.add('active');
            this.controls.unlock();
        }
    }
    
    updateHotbarSelection() {
        const hotbar = document.getElementById('hotbar');
        const slots = hotbar.querySelectorAll('.hotbar-slot');
        
        slots.forEach((slot, index) => {
            if (index === this.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }
    
    updateStatusBars() {
        // Update health bar
        const healthBar = document.querySelector('#health-bar .bar-fill');
        healthBar.style.width = `${(this.health / 20) * 100}%`;
        
        // Update hunger bar
        const hungerBar = document.querySelector('#hunger-bar .bar-fill');
        hungerBar.style.width = `${(this.hunger / 20) * 100}%`;
    }
}

