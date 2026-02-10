class GameEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isPlaying = false;

        // Player (Rice)
        this.rice = {
            x: 100,
            y: 180, // Bottom
            width: 30,
            height: 30,
            emoji: "🍚"
        };

        // Falling Items (Sashimi)
        this.items = [];
        this.spawnTimer = 0;
        this.spawnInterval = 60; // Frames

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
        this.rice.x = 100;
        this.spawnTimer = 0;
    }

    stop() { this.isPlaying = false; }

    spawnSashimi() {
        const types = ["🐟", "🐠", "🐡", "🐙", "🦐"];
        const randomType = types[Math.floor(Math.random() * types.length)];

        this.items.push({
            x: Math.random() * 180 + 10,
            y: -20,
            emoji: randomType,
            speed: 1 + Math.random() * 2 + (this.level * 0.2), // Speed increases with level
            type: "sashimi"
        });
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        // Spawning
        this.spawnTimer++;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnSashimi();
            this.spawnTimer = 0;
            // Decrease interval slightly as level goes up?
            if (this.spawnInterval > 20) this.spawnInterval -= 0.1;
        }

        // Move Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.y += item.speed;

            // Check Collision with Rice
            if (this.checkCollision(this.rice, item)) {
                // Catch!
                this.handleCatch(item);
                this.items.splice(i, 1);
                continue;
            }

            // Remove if off screen
            if (item.y > 220) {
                this.items.splice(i, 1);
                // Optional: Penalize for missing?
            }
        }
    }

    movePlayer(dx) {
        if (!this.isPlaying) return;
        this.rice.x += dx;
        // Clamp
        if (this.rice.x < 10) this.rice.x = 10;
        if (this.rice.x > 190) this.rice.x = 190;
    }

    checkCollision(rice, item) {
        const dist = Math.sqrt(
            Math.pow(rice.x - item.x, 2) +
            Math.pow(rice.y - item.y, 2)
        );
        return dist < 20; // Hit radius
    }

    handleCatch(item) {
        this.score += 100;
        if (window.soundManager) window.soundManager.playFruitCollect();

        // Level up every 500 points
        this.level = Math.floor(this.score / 500) + 1;

        if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    }

    draw(ctx) {
        if (!ctx) return;

        // 1. Draw Rice
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.rice.emoji, this.rice.x, this.rice.y);

        // 2. Draw Items
        for (const item of this.items) {
            ctx.fillText(item.emoji, item.x, item.y);
        }

        // 3. Score
        ctx.fillStyle = "black";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${this.score}`, 10, 20);
        ctx.fillText(`Level: ${this.level}`, 10, 40);
    }
}
