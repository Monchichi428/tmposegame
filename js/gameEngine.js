class GameEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isPlaying = false;

        // Claw Properties
        this.clawX = 100;
        this.clawY = 50;
        this.clawWidth = 40;
        this.heldItem = null; // Item currently grabbed

        // Game Objects
        this.items = [];
        this.exitZone = { x: 160, y: 150, w: 40, h: 50 }; // Bottom Right Exit

        // Callbacks
        this.onScoreChange = null;
        this.onGameEnd = null;
    }

    setScoreChangeCallback(callback) { this.onScoreChange = callback; }
    setGameEndCallback(callback) { this.onGameEnd = callback; }

    start() {
        this.score = 0;
        this.level = 1;
        this.isPlaying = true;
        this.items = [];
        this.heldItem = null;
        this.clawX = 100;
        this.clawY = 30;

        // Spawn Dolls
        this.spawnDolls();
    }

    stop() { this.isPlaying = false; }

    spawnDolls() {
        const types = ["🧸", "🤖", "🐶", "🐱", "🦄", "🐸", "👽"];
        // Create a pile at the bottom left area
        for (let i = 0; i < 15; i++) {
            this.items.push({
                x: 20 + Math.random() * 100, // Left side
                y: 180 - Math.random() * 40, // Bottom area
                emoji: types[Math.floor(Math.random() * types.length)],
                isCaught: false
            });
        }
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        // Gravity for items? (Optional, simple for now)
        // If holding item, update its position
        if (this.heldItem) {
            this.heldItem.x = this.clawX;
            this.heldItem.y = this.clawY + 20; // Hang below claw
        }
    }

    moveClaw(dx, dy) {
        this.clawX += dx;
        this.clawY += dy;

        // Clamp Claw
        if (this.clawX < 0) this.clawX = 0;
        if (this.clawX > 200) this.clawX = 200;
        if (this.clawY < 0) this.clawY = 0;
        if (this.clawY > 160) this.clawY = 160; // Don't go too low
    }

    handleInput(action) {
        if (action === "space") {
            if (this.heldItem) {
                this.dropItem();
            } else {
                this.tryGrab();
            }
        }
    }

    tryGrab() {
        // Find closest item
        let closest = null;
        let minDist = 30; // Grab range

        for (const item of this.items) {
            if (item.isCaught) continue; // Should not happen if logic is correct

            const dist = Math.sqrt(
                Math.pow(this.clawX - item.x, 2) +
                Math.pow((this.clawY + 20) - item.y, 2)
            );

            if (dist < minDist) {
                closest = item;
                minDist = dist;
            }
        }

        if (closest) {
            this.heldItem = closest;
            closest.isCaught = true;
            if (window.soundManager) window.soundManager.playFruitCollect(); // sound "Ding"
        }
    }

    dropItem() {
        if (!this.heldItem) return;

        const item = this.heldItem;
        this.heldItem = null;
        item.isCaught = false;

        // Check Exit Zone
        if (
            item.x >= this.exitZone.x &&
            item.x <= this.exitZone.x + this.exitZone.w &&
            item.y >= this.exitZone.y
        ) {
            // Success!
            this.score += 100;
            if (window.soundManager) window.soundManager.playTimeBonus(); // "Chime"

            // Remove item from list
            const index = this.items.indexOf(item);
            if (index > -1) this.items.splice(index, 1);

            if (this.onScoreChange) this.onScoreChange(this.score, this.level);

            // Check win? or endless? Keep playing until empty.
            if (this.items.length === 0) {
                alert("All Dolls Collected! You Win!");
                this.spawnDolls(); // Restart
            }
        } else {
            // Drop to floor
            item.y = 180 - Math.random() * 10; // Simple physics landing
        }
    }

    draw(ctx) {
        if (!ctx) return;

        // 1. Draw Exit Zone
        ctx.fillStyle = "#444";
        ctx.fillRect(this.exitZone.x, this.exitZone.y, this.exitZone.w, this.exitZone.h);
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText("EXIT", this.exitZone.x + 20, this.exitZone.y + 25);

        // 2. Draw Items
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const item of this.items) {
            ctx.fillText(item.emoji, item.x, item.y);
        }

        // 3. Draw Claw
        // Wire/Rope
        ctx.beginPath();
        ctx.moveTo(this.clawX, 0);
        ctx.lineTo(this.clawX, this.clawY);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Claw Body
        ctx.font = "40px Arial";
        ctx.fillText("🏗️", this.clawX, this.clawY);

        // 4. Score
        ctx.fillStyle = "black"; // Dark text for contrast on sky
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${this.score}`, 10, 20);
    }
}
