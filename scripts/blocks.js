import * as THREE from 'three';

export class BlockManager {
    constructor() {
        this.textureAtlas = null;
        this.blockDefinitions = this.createBlockDefinitions();
        this.initTextures();
    }
    
    createBlockDefinitions() {
        return {
            // 0 is air (not defined)
            1: { // Stone
                name: 'Stone',
                textures: {
                    all: 0
                },
                transparent: false
            },
            2: { // Dirt
                name: 'Dirt',
                textures: {
                    all: 1
                },
                transparent: false
            },
            3: { // Grass
                name: 'Grass',
                textures: {
                    top: 2,
                    bottom: 1,
                    all: 3
                },
                transparent: false
            },
            4: { // Water
                name: 'Water',
                textures: {
                    all: 4
                },
                transparent: true
            },
            5: { // Bedrock
                name: 'Bedrock',
                textures: {
                    all: 5
                },
                transparent: false
            },
            6: { // Wood
                name: 'Wood',
                textures: {
                    top: 6,
                    bottom: 6,
                    all: 7
                },
                transparent: false
            },
            7: { // Leaves
                name: 'Leaves',
                textures: {
                    all: 8
                },
                transparent: true
            },
            8: { // Sand
                name: 'Sand',
                textures: {
                    all: 9
                },
                transparent: false
            },
            9: { // Glass
                name: 'Glass',
                textures: {
                    all: 10
                },
                transparent: true
            },
            10: { // Stone Brick
                name: 'Stone Brick',
                textures: {
                    all: 11
                },
                transparent: false
            }
        };
    }
    
    initTextures() {
        // Create a canvas for texture atlas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions (4x3 grid of 16x16 textures)
        const tileSize = 16;
        const cols = 4;
        const rows = 3;
        canvas.width = cols * tileSize;
        canvas.height = rows * tileSize;
        
        // Fill with default colors for a voxel game
        this.drawTextureAtlas(ctx, tileSize);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        this.textureAtlas = texture;
    }
    
    drawTextureAtlas(ctx, tileSize) {
        // Simple texture atlas for blocks
        const textures = [
            { color: '#7D7D7D', pattern: 'stone' }, // 0 - Stone
            { color: '#8B5A2B', pattern: 'solid' }, // 1 - Dirt
            { color: '#7CFC00', pattern: 'solid' }, // 2 - Grass top
            { color: '#8B5A2B', pattern: 'grass' }, // 3 - Grass side
            { color: '#0000FF', alpha: 0.7, pattern: 'water' }, // 4 - Water
            { color: '#333333', pattern: 'bedrock' }, // 5 - Bedrock
            { color: '#8B4513', pattern: 'woodEnd' }, // 6 - Wood top/bottom
            { color: '#8B4513', pattern: 'woodSide' }, // 7 - Wood side
            { color: '#00A000', pattern: 'leaves', alpha: 0.8 }, // 8 - Leaves
            { color: '#FFFF00', pattern: 'sand' }, // 9 - Sand
            { color: '#FFFFFF', pattern: 'glass', alpha: 0.5 }, // 10 - Glass
            { color: '#999999', pattern: 'stoneBrick' } // 11 - Stone Brick
        ];
        
        textures.forEach((texture, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = col * tileSize;
            const y = row * tileSize;
            
            // Draw base color
            ctx.globalAlpha = texture.alpha || 1.0;
            ctx.fillStyle = texture.color;
            ctx.fillRect(x, y, tileSize, tileSize);
            
            // Add texture pattern
            ctx.globalAlpha = 1.0;
            this.drawTexturePattern(ctx, x, y, tileSize, texture.pattern);
        });
    }
    
    drawTexturePattern(ctx, x, y, size, pattern) {
        switch (pattern) {
            case 'solid':
                // Just solid color
                break;
                
            case 'stone':
                // Stone pattern
                ctx.fillStyle = '#666666';
                ctx.fillRect(x + 2, y + 3, 3, 2);
                ctx.fillRect(x + 10, y + 7, 4, 3);
                ctx.fillRect(x + 5, y + 11, 5, 2);
                break;
                
            case 'grass':
                // Grass side
                ctx.fillStyle = '#7CFC00';
                ctx.fillRect(x, y, size, 3);
                
                // Add some "dirt" patterns
                ctx.fillStyle = '#7D5A20';
                ctx.fillRect(x + 4, y + 7, 3, 2);
                ctx.fillRect(x + 9, y + 5, 2, 2);
                ctx.fillRect(x + 2, y + 12, 4, 3);
                break;
                
            case 'water':
                // Water pattern
                ctx.fillStyle = '#0000AA';
                ctx.fillRect(x + 2, y + 5, size - 4, 1);
                ctx.fillRect(x + 5, y + 10, size - 10, 1);
                ctx.globalAlpha = 0.5;
                ctx.fillRect(x, y, size, 2);
                break;
                
            case 'bedrock':
                // Bedrock pattern
                ctx.fillStyle = '#222222';
                ctx.fillRect(x, y, 4, 4);
                ctx.fillRect(x + 6, y + 6, 6, 6);
                ctx.fillRect(x + 12, y + 2, 4, 4);
                ctx.fillStyle = '#444444';
                ctx.fillRect(x + 4, y + 4, 4, 4);
                ctx.fillRect(x + 12, y + 12, 4, 4);
                break;
                
            case 'woodEnd':
                // Wood top/bottom
                ctx.fillStyle = '#6B3E20';
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI * 2);
                ctx.fill();
                
                // Tree ring
                ctx.fillStyle = '#8B6E4B';
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/5, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'woodSide':
                // Wood side
                ctx.fillStyle = '#6B3E20';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x, y + i * 5, size, 3);
                }
                break;
                
            case 'leaves':
                // Leaves
                ctx.fillStyle = '#005000';
                for (let i = 0; i < 5; i++) {
                    const rx = x + Math.random() * size;
                    const ry = y + Math.random() * size;
                    const rs = 2 + Math.random() * 3;
                    ctx.fillRect(rx, ry, rs, rs);
                }
                break;
                
            case 'sand':
                // Sand
                ctx.fillStyle = '#E6C78B';
                for (let i = 0; i < 8; i++) {
                    const rx = x + Math.random() * size;
                    const ry = y + Math.random() * size;
                    const rs = 1 + Math.random() * 2;
                    ctx.fillRect(rx, ry, rs, rs);
                }
                break;
                
            case 'glass':
                // Glass
                ctx.strokeStyle = '#DDDDDD';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + size, y);
                ctx.lineTo(x + size, y + size);
                ctx.lineTo(x, y + size);
                ctx.lineTo(x, y);
                ctx.stroke();
                
                // Highlight
                ctx.strokeStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(x + 2, y + 2);
                ctx.lineTo(x + size - 4, y + 2);
                ctx.lineTo(x + size - 4, y + size - 4);
                ctx.stroke();
                break;
                
            case 'stoneBrick':
                // Stone brick
                ctx.fillStyle = '#888888';
                ctx.fillRect(x, y, size/2, size/2);
                ctx.fillRect(x + size/2, y + size/2, size/2, size/2);
                
                // Mortar
                ctx.fillStyle = '#555555';
                ctx.fillRect(x + size/2 - 1, y, 2, size);
                ctx.fillRect(x, y + size/2 - 1, size, 2);
                break;
        }
    }
    
    getTextureAtlas() {
        return this.textureAtlas;
    }
    
    getBlockDefinition(blockType) {
        return this.blockDefinitions[blockType] || null;
    }
    
    isTransparent(blockType) {
        const blockDef = this.getBlockDefinition(blockType);
        return blockDef ? blockDef.transparent : true;
    }
    
    getTextureCoordinates(textureIndex) {
        const tileSize = 16;
        const cols = 4;
        
        const col = textureIndex % cols;
        const row = Math.floor(textureIndex / cols);
        
        const atlas = this.textureAtlas.image;
        
        return {
            x: col / cols,
            y: row / 3,
            width: 1 / cols,
            height: 1 / 3
        };
    }
}

