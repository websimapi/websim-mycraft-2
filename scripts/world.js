import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.chunkSize = 16;
        this.chunkHeight = 128;
        this.renderDistance = 4;
        this.chunks = new Map(); // Map of loaded chunks
        this.blockManager = game.blockManager;
        
        // For terrain generation
        this.noise = createNoise2D();
    }
    
    initialize() {
        // Clear existing chunks
        this.chunks.forEach(chunk => {
            this.scene.remove(chunk.mesh);
        });
        this.chunks.clear();
        
        // Generate initial chunks around player
        this.updateChunks();
    }
    
    updateChunks() {
        const playerPos = this.game.camera.position;
        const playerChunkX = Math.floor(playerPos.x / this.chunkSize);
        const playerChunkZ = Math.floor(playerPos.z / this.chunkSize);
        
        // Load chunks within render distance
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const chunkX = playerChunkX + x;
                const chunkZ = playerChunkZ + z;
                const chunkKey = `${chunkX},${chunkZ}`;
                
                if (!this.chunks.has(chunkKey)) {
                    this.generateChunk(chunkX, chunkZ);
                }
            }
        }
        
        // Unload chunks outside render distance
        this.chunks.forEach((chunk, key) => {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - playerChunkX) > this.renderDistance || 
                Math.abs(z - playerChunkZ) > this.renderDistance) {
                this.scene.remove(chunk.mesh);
                this.chunks.delete(key);
            }
        });
    }
    
    generateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const blocks = new Array(this.chunkSize * this.chunkHeight * this.chunkSize).fill(0);
        
        // Generate terrain
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = chunkX * this.chunkSize + x;
                const worldZ = chunkZ * this.chunkSize + z;
                
                // Generate height using noise
                const scale1 = 0.01;
                const scale2 = 0.05;
                const heightNoise = 
                    this.noise(worldX * scale1, worldZ * scale1) * 0.7 +
                    this.noise(worldX * scale2, worldZ * scale2) * 0.3;
                
                const height = Math.floor((heightNoise + 1) * 20) + 40;
                
                // Fill blocks from bottom to height
                for (let y = 0; y < this.chunkHeight; y++) {
                    const index = this.getBlockIndex(x, y, z);
                    
                    if (y === 0) {
                        blocks[index] = 5; // Bedrock
                    } else if (y < height - 4) {
                        blocks[index] = 1; // Stone
                    } else if (y < height) {
                        blocks[index] = 2; // Dirt
                    } else if (y === height) {
                        blocks[index] = 3; // Grass
                    } else if (y < 12) {
                        blocks[index] = 4; // Water
                    }
                    
                    // Generate caves (simple random approach)
                    if (y > 5 && y < height && blocks[index] !== 0 && blocks[index] !== 4) {
                        const caveNoise = this.noise((worldX * 0.1), (worldZ * 0.1) + (y * 0.1));
                        if (caveNoise > 0.7) {
                            blocks[index] = 0; // Air (cave)
                        }
                    }
                }
            }
        }
        
        // Create mesh from blocks
        const chunk = {
            x: chunkX,
            z: chunkZ,
            blocks: blocks,
            mesh: this.createChunkMesh(blocks, chunkX, chunkZ)
        };
        
        this.scene.add(chunk.mesh);
        this.chunks.set(chunkKey, chunk);
    }
    
    createChunkMesh(blocks, chunkX, chunkZ) {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const uvs = [];
        const indices = [];
        
        for (let x = 0; x < this.chunkSize; x++) {
            for (let y = 0; y < this.chunkHeight; y++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const index = this.getBlockIndex(x, y, z);
                    const blockType = blocks[index];
                    
                    if (blockType === 0) continue; // Skip air blocks
                    
                    const wx = chunkX * this.chunkSize + x;
                    const wy = y;
                    const wz = chunkZ * this.chunkSize + z;
                    
                    // Add faces only if adjacent block is air or transparent
                    this.addBlockFaces(blocks, x, y, z, blockType, wx, wy, wz, positions, uvs, indices);
                }
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshLambertMaterial({ 
            map: this.blockManager.getTextureAtlas(),
            vertexColors: false,
            transparent: true
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    addBlockFaces(blocks, x, y, z, blockType, wx, wy, wz, positions, uvs, indices) {
        const blockDef = this.blockManager.getBlockDefinition(blockType);
        const vertexStart = positions.length / 3;
        
        // Check each face and add if visible
        // Top face (+Y)
        if (this.isTransparent(x, y + 1, z, blocks)) {
            this.addFace('top', wx, wy, wz, blockDef, positions, uvs, indices, vertexStart);
        }
        
        // Bottom face (-Y)
        if (this.isTransparent(x, y - 1, z, blocks)) {
            this.addFace('bottom', wx, wy, wz, blockDef, positions, uvs, indices, vertexStart + 4);
        }
        
        // Front face (+Z)
        if (this.isTransparent(x, y, z + 1, blocks)) {
            this.addFace('front', wx, wy, wz, blockDef, positions, uvs, indices, vertexStart + 8);
        }
        
        // Back face (-Z)
        if (this.isTransparent(x, y, z - 1, blocks)) {
            this.addFace('back', wx, wy, wz, blockDef, positions, uvs, indices, vertexStart + 12);
        }
        
        // Right face (+X)
        if (this.isTransparent(x + 1, y, z, blocks)) {
            this.addFace('right', wx, wy, wz, blockDef, positions, uvs, indices, vertexStart + 16);
        }
        
        // Left face (-X)
        if (this.isTransparent(x - 1, y, z, blocks)) {
            this.addFace('left', wx, wy, wz, blockDef, positions, uvs, indices, vertexStart + 20);
        }
    }
    
    isTransparent(x, y, z, blocks) {
        if (x < 0 || x >= this.chunkSize || y < 0 || y >= this.chunkHeight || z < 0 || z >= this.chunkSize) {
            return true; // Consider out-of-bounds as transparent
        }
        
        const blockType = blocks[this.getBlockIndex(x, y, z)];
        return blockType === 0 || this.blockManager.isTransparent(blockType);
    }
    
    addFace(face, x, y, z, blockDef, positions, uvs, indices, vertexIndex) {
        const vertices = {
            top: [
                [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]
            ],
            bottom: [
                [x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z]
            ],
            front: [
                [x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]
            ],
            back: [
                [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z], [x, y, z]
            ],
            right: [
                [x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]
            ],
            left: [
                [x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]
            ]
        };
        
        // Add vertices
        for (const [x, y, z] of vertices[face]) {
            positions.push(x, y, z);
        }
        
        // Add texture coordinates
        const texture = blockDef.textures[face] || blockDef.textures.all;
        const textureUVs = this.blockManager.getTextureCoordinates(texture);
        
        uvs.push(
            textureUVs.x, textureUVs.y + textureUVs.height,
            textureUVs.x + textureUVs.width, textureUVs.y + textureUVs.height,
            textureUVs.x + textureUVs.width, textureUVs.y,
            textureUVs.x, textureUVs.y
        );
        
        // Add indices for triangles
        indices.push(
            vertexIndex, vertexIndex + 1, vertexIndex + 2,
            vertexIndex, vertexIndex + 2, vertexIndex + 3
        );
    }
    
    getBlockIndex(x, y, z) {
        return (y * this.chunkSize * this.chunkSize) + (z * this.chunkSize) + x;
    }
    
    getBlock(worldX, worldY, worldZ) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkZ = Math.floor(worldZ / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (!this.chunks.has(chunkKey)) return 0; // Air if chunk not loaded
        
        const localX = (worldX % this.chunkSize + this.chunkSize) % this.chunkSize;
        const localZ = (worldZ % this.chunkSize + this.chunkSize) % this.chunkSize;
        
        if (worldY < 0 || worldY >= this.chunkHeight) return 0;
        
        const blockIndex = this.getBlockIndex(localX, worldY, localZ);
        return this.chunks.get(chunkKey).blocks[blockIndex] || 0;
    }
    
    removeBlock(position) {
        if (!position) return;
        
        const { x, y, z } = position;
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (!this.chunks.has(chunkKey)) return;
        
        const localX = (x % this.chunkSize + this.chunkSize) % this.chunkSize;
        const localZ = (z % this.chunkSize + this.chunkSize) % this.chunkSize;
        
        if (y < 0 || y >= this.chunkHeight) return;
        
        const blockIndex = this.getBlockIndex(localX, y, localZ);
        const chunk = this.chunks.get(chunkKey);
        
        // Don't remove bedrock in any mode
        if (chunk.blocks[blockIndex] === 5) return;
        
        chunk.blocks[blockIndex] = 0;
        
        // Rebuild chunk mesh
        this.scene.remove(chunk.mesh);
        chunk.mesh = this.createChunkMesh(chunk.blocks, chunkX, chunkZ);
        this.scene.add(chunk.mesh);
    }
    
    placeBlock(position, blockType) {
        if (!position) return;
        
        const { x, y, z } = position;
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Create chunk if it doesn't exist
        if (!this.chunks.has(chunkKey)) {
            this.generateChunk(chunkX, chunkZ);
        }
        
        const localX = (x % this.chunkSize + this.chunkSize) % this.chunkSize;
        const localZ = (z % this.chunkSize + this.chunkSize) % this.chunkSize;
        
        if (y < 0 || y >= this.chunkHeight) return;
        
        const blockIndex = this.getBlockIndex(localX, y, localZ);
        const chunk = this.chunks.get(chunkKey);
        
        // Don't place blocks in same position as player
        const playerPos = this.game.camera.position;
        const playerX = Math.floor(playerPos.x);
        const playerY = Math.floor(playerPos.y);
        const playerZ = Math.floor(playerPos.z);
        
        if (x === playerX && (y === playerY || y === playerY - 1) && z === playerZ) {
            return;
        }
        
        chunk.blocks[blockIndex] = blockType;
        
        // Rebuild chunk mesh
        this.scene.remove(chunk.mesh);
        chunk.mesh = this.createChunkMesh(chunk.blocks, chunkX, chunkZ);
        this.scene.add(chunk.mesh);
    }
    
    update(deltaTime) {
        // Update chunks around player
        if (this.updateTimer === undefined) {
            this.updateTimer = 0;
        }
        
        this.updateTimer += deltaTime;
        if (this.updateTimer > 0.5) { // Update chunks every half second
            this.updateChunks();
            this.updateTimer = 0;
        }
    }
}

