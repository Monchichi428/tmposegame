/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.isGameActive = false;
    this.gameTimer = null;
    
    // Game State
    this.basketPosition = "CENTER"; // LEFT, CENTER, RIGHT
    this.items = []; // Current falling items
    this.lastSpawnTime = 0;
    this.spawnInterval = 1500; // Initial spawn rate (ms)
    
    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;

    // Assets (Using Emojis for simplicity)
    this.assets = {
      basket: "🧺",
      apple: "🍎",
      banana: "🍌",
      bomb: "💣"
    };
  }

  /**
   * Start Game
   */
  start(config = {}) {
    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.items = [];
    this.basketPosition = "CENTER";
    this.spawnInterval = 1500;

    if (this.gameTimer) clearInterval(this.gameTimer);
    this.gameTimer = setInterval(() => {
      this.timeLimit--;
      if (this.timeLimit <= 0) {
        this.gameOver();
      }
    }, 1000);
  }

  /**
   * Stop Game
   */
  stop() {
    this.isGameActive = false;
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  /**
   * Game Over
   */
  gameOver() {
    this.stop();
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * Update Game State (Call this every frame)
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    if (!this.isGameActive) return;

    // 1. Spawn Items
    this.lastSpawnTime += deltaTime;
    if (this.lastSpawnTime > this.spawnInterval) {
      this.spawnItem();
      this.lastSpawnTime = 0;
    }

    // 2. Move Items & Check Collision
    const catchY = 160; // Y position of basket line (canvas height is 200)
    
    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];
      item.y += item.speed;

      // Check Collision with Basket
      // Match Basket Position: LEFT(0-66), CENTER(66-133), RIGHT(133-200)
      let itemZone = "";
      if (item.x < 66) itemZone = "LEFT";
      else if (item.x < 133) itemZone = "CENTER";
      else itemZone = "RIGHT";

      // Collision Detected?
      if (item.y > catchY - 15 && item.y < catchY + 15 && itemZone === this.basketPosition) {
        this.handleItemCollection(item);
        this.items.splice(i, 1);
        continue;
      }

      // Missed Item (Off screen)
      if (item.y > 220) {
        this.items.splice(i, 1);
      }
    }
  }

  /**
   * Spawn a new random item
   */
  spawnItem() {
    const zones = [33, 100, 166]; // Center X of LEFT, CENTER, RIGHT
    const x = zones[Math.floor(Math.random() * zones.length)];
    
    // Random Type
    const rand = Math.random();
    let type = "apple";
    let speed = 1.5 + (this.level * 0.2); // Speed increases with level

    // Level 1: Mostly Apple
    // Level 2: Apple + Banana + Bomb
    // Level 3: More Bombs
    
    if (this.level === 1) {
      // 100% Apple
    } else if (this.level === 2) {
      if (rand < 0.2) type = "bomb";
      else if (rand < 0.5) type = "banana";
    } else {
      if (rand < 0.4) type = "bomb";
      else if (rand < 0.7) type = "banana";
      speed *= 1.2;
    }

    this.items.push({ x, y: -20, type, speed });
  }

  /**
   * Handle Item Collection
   */
  handleItemCollection(item) {
    if (item.type === "bomb") {
      this.gameOver();
    } else if (item.type === "apple") {
      this.addScore(100);
    } else if (item.type === "banana") {
      this.addScore(200);
    }
  }

  addScore(points) {
    this.score += points;
    
    // Level Up every 500 points
    const newLevel = Math.floor(this.score / 500) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.spawnInterval = Math.max(500, 1500 - (this.level * 200)); 
    }

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  /**
   * Update Basket Position based on Pose
   * @param {string} poseLabel 
   */
  setBasketPosition(poseLabel) {
    // Map Korean/English labels to Zone
    if (poseLabel === "왼쪽" || poseLabel === "LEFT") this.basketPosition = "LEFT";
    else if (poseLabel === "오른쪽" || poseLabel === "RIGHT") this.basketPosition = "RIGHT";
    else if (poseLabel === "정면" || poseLabel === "CENTER") this.basketPosition = "CENTER";
  }

  /**
   * Draw Game on Canvas
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!this.isGameActive && this.timeLimit === 60) {
        // Start Screen Overlay
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Ready?", 100, 100);
        return;
    }
    
    // Draw Basket
    let basketX = 100;
    if (this.basketPosition === "LEFT") basketX = 33;
    else if (this.basketPosition === "RIGHT") basketX = 166;
    
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.assets.basket, basketX, 180);

    // Draw Items
    for (let item of this.items) {
      let icon = this.assets.apple;
      if (item.type === "banana") icon = this.assets.banana;
      if (item.type === "bomb") icon = this.assets.bomb;
      
      ctx.fillText(icon, item.x, item.y);
    }

    // Draw HUD (Score/Time)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 200, 25);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 5, 17);
    ctx.textAlign = "right";
    ctx.fillText(`Time: ${this.timeLimit}`, 195, 17);
    
    if (!this.isGameActive && this.timeLimit <= 0) {
         ctx.fillStyle = "rgba(0,0,0,0.7)";
         ctx.fillRect(0, 0, 200, 200);
         ctx.fillStyle = "red";
         ctx.font = "25px Arial";
         ctx.textAlign = "center";
         ctx.fillText("GAME OVER", 100, 100);
         ctx.fillStyle = "white";
         ctx.font = "15px Arial";
         ctx.fillText(`Final Score: ${this.score}`, 100, 130);
    }
  }

  // Setters for callbacks
  setScoreChangeCallback(cb) { this.onScoreChange = cb; }
  setGameEndCallback(cb) { this.onGameEnd = cb; }
}

window.GameEngine = GameEngine;
