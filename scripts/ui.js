export class UI {
    constructor(game) {
        this.game = game;
        this.initialize();
    }
    
    initialize() {
        // Create hotbar slots
        const hotbar = document.getElementById('hotbar');
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            if (i === 0) slot.classList.add('selected');
            hotbar.appendChild(slot);
        }
        
        // Initialize inventory slots
        const inventoryGrid = document.getElementById('inventory-grid');
        for (let i = 0; i < 36; i++) {
            const slot = document.createElement('div');
            slot.className = 'grid-slot';
            inventoryGrid.appendChild(slot);
        }
        
        // Initialize crafting slots
        const craftingGrid = document.getElementById('crafting-grid');
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'grid-slot';
            craftingGrid.appendChild(slot);
        }
        
        // Close inventory button
        document.getElementById('close-inventory').addEventListener('click', () => {
            document.getElementById('inventory-screen').classList.remove('active');
            this.game.controls.lock();
        });
        
        // Show the game menu at start
        document.getElementById('game-menu').classList.add('active');
    }
    
    updateInventoryDisplay() {
        // Update hotbar appearance based on inventory
        const hotbarSlots = document.querySelectorAll('#hotbar .hotbar-slot');
        
        for (let i = 0; i < hotbarSlots.length; i++) {
            const slot = hotbarSlots[i];
            const item = this.game.player.inventory[i];
            
            if (item) {
                // If there's an item, style the slot to represent it
                const blockDef = this.game.blockManager.getBlockDefinition(item.id);
                
                if (blockDef) {
                    slot.style.backgroundColor = this.getBlockColor(blockDef.name);
                    slot.innerHTML = `<span>${blockDef.name}</span>`;
                }
            } else {
                // Empty slot
                slot.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                slot.innerHTML = '';
            }
        }
    }
    
    getBlockColor(blockName) {
        // Simple color mapping for inventory representation
        const colorMap = {
            'Stone': '#7D7D7D',
            'Dirt': '#8B5A2B',
            'Grass': '#5D9E36',
            'Water': '#0000FF',
            'Bedrock': '#333333',
            'Wood': '#8B4513',
            'Leaves': '#00A000',
            'Sand': '#FFFF00',
            'Glass': '#FFFFFF',
            'Stone Brick': '#999999'
        };
        
        return colorMap[blockName] || '#FFFFFF';
    }
}

