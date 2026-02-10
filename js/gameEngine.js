class GameEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.isPlaying = false;

        // Claw Properties
        this.clawX = 100;
        this.clawY = 30; // Start height
        this.baseY = 30; // Resting height
        this.clawOpen = true;
        this.heldItem = null;

        // Automation State
        // States: IDLE, DESCEND, GRAB, ASCEND, MOVE_EXIT, DROP, RESET
        this.state = "IDLE";
        this.stateTimer = 0;

        // Game Objects
        this.items = [];
        this.exitZone = { x: 170, y: 30 }; // Top Right Exit logic (or keep bottom?)
        // Let's keep specific drop zone behavior: 
        // Move to X=170, Y=30 (Top Right Area), then drop?
        // Or "Exit" might be a hole at the bottom. 
        // Standard machines drop into a chute ~left/right corner.
        // Let's say Chute is at Bottom Left (20, 180)? 
        // Or Bottom Right (180, 180).
        // Let's use Bottom Right.

        this.targetX = 0;
        this.targetY = 0;

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
        this.clawY = this.baseY;
        this.state = "IDLE";

        // Spawn Dolls
        this.spawnDolls();
    }

    stop() { this.isPlaying = false; }

    spawnDolls() {
        const types = ["🐵"]; // Monchichi
        for (let i = 0; i < 15; i++) {
            this.items.push({
                x: 20 + Math.random() * 140, // Spread across middle
                y: 190 - Math.random() * 30, // Bottom pile
                emoji: "🐵", // Only Monchichi
                isCaught: false
            });
        }
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        // Auto Sequence Logic
        const moveSpeed = 0.1 * deltaTime;
        const descendSpeed = 0.15 * deltaTime;

        switch (this.state) {
            case "IDLE":
                // Wait for input
                break;

            case "DESCEND":
                this.clawY += descendSpeed;
                if (this.clawY >= 180) { // Reached bottom
                    this.playState("GRAB");
                }
                break;

            case "GRAB":
                this.tryGrab();
                this.clawOpen = false;
                this.stateTimer = 500; // Wait 0.5s
                this.state = "GRAB_WAIT";
                break;

            case "GRAB_WAIT":
                this.stateTimer -= deltaTime;
                if (this.stateTimer <= 0) {
                    this.playState("ASCEND");
                }
                break;

            case "ASCEND":
                this.clawY -= descendSpeed;
                if (this.clawY <= this.baseY) {
                    this.clawY = this.baseY;
                    this.playState("MOVE_EXIT");
                }
                break;

            case "MOVE_EXIT":
                // Target: Exit Zone (Bottom Right: X ~ 170)
                // Actually usually carry to Top Left/Right then Drop.
                // Let's carry to X = 180 (Right edge) at Top Height.
                if (this.clawX < 180) {
                    this.clawX += moveSpeed;
                    if (this.clawX >= 180) this.clawX = 180;
                } else {
                    this.playState("DROP");
                }
                break;

            case "DROP":
                this.clawOpen = true;
                if (this.heldItem) {
                    // Drop it!
                    this.heldItem.isCaught = false; // Detach
                    // Check if it lands in "Exit" (Assuming Right side is exit chute)
                    // If we drop at X=180, it falls down.
                    // Let's simulate 'falling' in next frames or instant handling.
                    this.processDrop(this.heldItem);
                    this.heldItem = null;
                }
                this.stateTimer = 500;
                this.state = "RESET";
                break;

            case "RESET":
                this.stateTimer -= deltaTime;
                if (this.stateTimer <= 0) {
                    this.state = "IDLE";
                }
                break;
        }

        // Sync Held Item
        if (this.heldItem) {
            this.heldItem.x = this.clawX;
            this.heldItem.y = this.clawY + 25;
        }
    }

    playState(newState) {
        this.state = newState;
    }

    moveClaw(dx, dy) {
        if (this.state !== "IDLE") return; // Lock controls
        this.clawX += dx;
        // Restrict movement if needed (e.g. only X axis or limited Y)
        // User asked to determine location (X/Y?). Let's allow X/Y but mainly X is useful.
        if (this.clawX < 10) this.clawX = 10;
        if (this.clawX > 190) this.clawX = 190;
        // If Y is movable in IDLE? Usually Claw machine allows adjusting position.
        // Let's allow X only for simplicity to match "Descend" logic which assumes starting from top.
        // If user lowers it manually, Descend might break.
        // FORCE Y to be baseY in IDLE.
        this.clawY = this.baseY;
    }

    handleInput(action) {
        if (this.state !== "IDLE") return;

        if (action === "space") {
            this.playState("DESCEND");
        }
    }

    tryGrab() {
        let closest = null;
        let minDist = 25;

        for (const item of this.items) {
            if (item.isCaught) continue;
            // Distance Check
            const dist = Math.sqrt(
                Math.pow(this.clawX - item.x, 2) +
                Math.pow((this.clawY + 25) - item.y, 2)
            );
            if (dist < minDist) {
                closest = item;
                minDist = dist;
            }
        }

        if (closest) {
            this.heldItem = closest;
            closest.isCaught = true;
            if (window.soundManager) window.soundManager.playFruitCollect();
        }
    }

    processDrop(item) {
        // Did it drop in Exit Area? (Right Side > 160)
        if (item.x >= 160) {
            this.score += 100;
            if (window.soundManager) window.soundManager.playTimeBonus();

            // Remove
            const idx = this.items.indexOf(item);
            if (idx > -1) this.items.splice(idx, 1);

            if (this.onScoreChange) this.onScoreChange(this.score, this.level);

            if (this.items.length === 0) {
                alert("You Win!");
                this.spawnDolls();
            }
        } else {
            // Missed! Falls back to pile
            item.y = 190 - Math.random() * 30;
        }
    }

    draw(ctx) {
        if (!ctx) return;

        // 1. Draw Exit Chute
        ctx.fillStyle = "#333";
        ctx.fillRect(160, 150, 40, 50);
        ctx.fillStyle = "#FFF";
        ctx.font = "10px Arial";
        ctx.fillText("EXIT", 180, 175);

        // 2. Draw Items
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const item of this.items) {
            ctx.fillText(item.emoji, item.x, item.y);
        }

        // 3. Draw Claw (Vector)
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 3;

        // Rope
        ctx.beginPath();
        ctx.moveTo(this.clawX, 0); // From Ceiling
        ctx.lineTo(this.clawX, this.clawY);
        ctx.stroke();

        // Claw Body
        // Simple 3-finger claw 
        const cy = this.clawY;
        const cx = this.clawX;
        const size = 15;

        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "red";

        ctx.beginPath();
        // Hub
        ctx.moveTo(cx - 5, cy);
        ctx.lineTo(cx + 5, cy);

        // Fingers
        const openAmt = this.clawOpen ? 15 : 5;

        // Left Finger
        ctx.moveTo(cx - 5, cy);
        ctx.quadraticCurveTo(cx - 15, cy + 10, cx - openAmt, cy + 25);

        // Right Finger
        ctx.moveTo(cx + 5, cy);
        ctx.quadraticCurveTo(cx + 15, cy + 10, cx + openAmt, cy + 25);

        ctx.stroke();

        // 4. Score
        ctx.fillStyle = "black";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${this.score}`, 10, 20);
        ctx.fillText(`Status: ${this.state}`, 10, 40); // Debug State
    }
}
