class GameEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60; // seconds
        this.isPlaying = false;
        this.items = []; // Falling items
        this.basketX = 100; // Center (0-200 range)
        this.basketWidth = 40;
        this.basketHeight = 20;
        this.spawnTimer = 0;

        // Callbacks
        this.onScoreChange = null;
        this.onGameEnd = null;
    }

    setScoreChangeCallback(callback) {
        this.onScoreChange = callback;
    }

    setGameEndCallback(callback) {
        this.onGameEnd = callback;
    }

    start() {
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.items = [];
        this.isPlaying = true;

        // Start timer countdown
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isPlaying) {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.endGame();
                }
            }
        }, 1000);
    }

    stop() {
        this.isPlaying = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    endGame() {
        this.stop();
        if (window.soundManager) window.soundManager.playGameOver();
        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.level);
        }
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        // 1. Spawn Items
        this.spawnTimer += deltaTime;
        let spawnInterval = 1000; // Default: 1 second
        if (this.level === 2) spawnInterval = 800;
        if (this.level === 3) spawnInterval = 600;

        if (this.spawnTimer > spawnInterval) {
            this.spawnItem();
            this.spawnTimer = 0;
        }

        // 2. Move Items
        const speed = 0.1 + (this.level * 0.05); // Speed increases with level
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.y += speed * deltaTime;

            // 3. Collision Detection (Basket)
            // Visuals are centered at (item.x, item.y)
            // Basket is centered at (basketX, 190) (Top: 180, Height: 20)

            const xDiff = Math.abs(item.x - this.basketX);
            const xThreshold = (20 / 2) + (this.basketWidth / 2); // Item radius 10 + Basket half-width 20 = 30

            const itemBottom = item.y + 10;
            const basketTop = 180;

            if (
                itemBottom >= basketTop && // Touches top of basket
                item.y - 10 <= 200 &&      // Not fully past screen
                xDiff < xThreshold         // Center-to-center check
            ) {
                this.handleCollection(item);
                this.items.splice(i, 1);
                continue;
            }

            // 4. Remove if out of bounds
            if (item.y - 10 > 200) {
                this.items.splice(i, 1);
            }
        }
    }

    spawnItem() {
        // Types and Probabilities
        // Fruits: strawberry, banana, grape, peach, tomato, apple, tangerine, mango
        const fruits = ["strawberry", "banana", "grape", "peach", "tomato", "apple", "tangerine", "mango"];

        let type;
        const rand = Math.random();

        // Level 1: Mostly fruits, rare bomb
        // Level 2: More bombs
        // Level 3: Many bombs

        // Bonus Chance (Clock): 5% across all levels
        if (Math.random() < 0.05) {
            type = "clock";
        } else {
            // Bomb Chance
            let bombChance = 0.1;
            if (this.level === 2) bombChance = 0.2;
            if (this.level === 3) bombChance = 0.35;

            if (rand < bombChance) {
                type = "bomb";
            } else {
                // Random Fruit
                type = fruits[Math.floor(Math.random() * fruits.length)];
            }
        }

        // Random X position (20 to 180 to keep within bounds)
        const x = 20 + Math.random() * 160;

        this.items.push({ x, y: -20, type });
    }

    handleCollection(item) {
        if (item.type === "bomb") {
            window.soundManager.playBombExplosion();
            this.endGame();
        } else if (item.type === "clock") {
            window.soundManager.playTimeBonus();
            this.timeLeft += 30; // 30 seconds bonus
            // Show floating text? (Optional, skipping for simplicity)
        } else {
            // Fruit
            window.soundManager.playFruitCollect();
            const points = 100; // All fruits 100 for simplicity, or vary if needed
            this.score += points;

            // Update Level
            if (this.score >= 1500) this.level = 3;
            else if (this.score >= 500) this.level = 2;

            if (this.onScoreChange) {
                this.onScoreChange(this.score, this.level);
            }
        }
    }

    moveBasketRelative(dx) {
        this.basketX += dx;

        // Clamp to screen bounds
        const halfWidth = this.basketWidth / 2;
        if (this.basketX < halfWidth) this.basketX = halfWidth;
        if (this.basketX > 200 - halfWidth) this.basketX = 200 - halfWidth;
    }

    setBasketPosition(input) {
        // Handle Continuous Input (Number)
        if (typeof input === "number") {
            // Flip X if needed (Webcam might be mirrored, but usually TM Pose data matches logic)
            // If user moves Left, nose X decreases (0).
            // But if webcam is flipped, moving Left might be X increases (200).
            // main.js sets `flip: true` in PoseEngine.init.
            // Let's assume input matches screen coordinates (0=Left, 200=Right).
            this.basketX = input;
        }
        // Handle Discrete Input (String - Fallback)
        else {
            // Map class names to X coordinates
            // Canvas width is 200. 
            // Left: 40, Center: 100, Right: 160 (Centers of 3 lanes)
            if (input === "LEFT" || input === "Left") {
                this.basketX = 40;
            } else if (input === "RIGHT" || input === "Right") {
                this.basketX = 160;
            } else {
                // Center or others
                this.basketX = 100;
            }
        }

        // Clamp to screen bounds
        const halfWidth = this.basketWidth / 2;
        if (this.basketX < halfWidth) this.basketX = halfWidth;
        if (this.basketX > 200 - halfWidth) this.basketX = 200 - halfWidth;
    }

    draw(ctx) {
        if (!ctx) return;

        // 1. Draw Basket (Emoji)
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Emoji draws at x,y. 
        // We want it at basketX, 190 (same roughly as rect)
        ctx.fillText("🧺", this.basketX, 190);

        // 2. Draw Items
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const item of this.items) {
            let emoji = "❓";
            switch (item.type) {
                case "strawberry": emoji = "🍓"; break;
                case "banana": emoji = "🍌"; break;
                case "grape": emoji = "🍇"; break;
                case "peach": emoji = "🍑"; break;
                case "tomato": emoji = "🍅"; break;
                case "apple": emoji = "🍎"; break;
                case "tangerine": emoji = "🍊"; break;
                case "mango": emoji = "🥭"; break;
                case "clock": emoji = "⏰"; break;
                case "bomb": emoji = "💣"; break;
            }

            ctx.fillText(emoji, item.x, item.y);
        }

        // 3. Draw HUD (Score & Time)
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";

        const scoreText = `Score: ${this.score} (L${this.level})`;
        const timeText = `T:${this.timeLeft}`;

        ctx.strokeText(scoreText, 5, 20); // Adjusted padding
        ctx.fillText(scoreText, 5, 20);

        ctx.textAlign = "right";
        ctx.strokeText(timeText, 195, 20); // Adjusted padding
        ctx.fillText(timeText, 195, 20);

        if (!this.isPlaying && this.timeLeft <= 0) { // Show Game Over only on timeout/death, not initial state? 
            // Logic check: isPlaying is false initially. 
            // But main.js handles "Start" button overlay. 
            // We only show "Game Over" if it was a game end condition.
            // Actually, main.js calls stop() on game end.
            // Let's rely on alert() from main.js for now, OR show overlay.
            // main.js: alert(`게임 종료! 최종 점수: ${score}`);
            // So we don't strictly need a "Game Over" text, but it's nice.
        }
    }
}
