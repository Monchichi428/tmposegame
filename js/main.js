/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;
let lastTime = 0;

/**
 * 애플리케이션 초기화
 */
// Canvas Resize Handler
function resizeCanvas() {
  const canvas = document.getElementById("canvas");
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}
window.addEventListener('resize', resizeCanvas);

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 0. Sound Init
    if (window.soundManager) {
      window.soundManager.init();
    }

    // 0. 캔버스 풀스크린 설정
    const canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext("2d");

    // 1. PoseEngine & Stabilizer Skipped (Webcam Removed)
    /*
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({ ... });
    stabilizer = new PredictionStabilizer({ ... });
    */

    // 3. GameEngine 초기화
    gameEngine = new GameEngine();

    // UI 콜백 설정
    gameEngine.setScoreChangeCallback((score, level) => {
      console.log(`Score: ${score}, Level: ${level}`);
    });

    gameEngine.setGameEndCallback((score, level) => {
      alert(`게임 종료! 최종 점수: ${score}`);
      stop();
    });

    // 5. Label Container Skipped
    /*
    labelContainer = document.getElementById("label-container");
    ...
    */

    // 7. Loop Start
    // gameEngine.start(); -> Game logic start
    gameEngine.start();

    // Animation Loop Start independently
    lastTime = Date.now();
    drawGameLoop();

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("오류가 발생했습니다: " + error);
    startBtn.disabled = false;
  }
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (animationId) cancelAnimationFrame(animationId);
  // if (poseEngine) poseEngine.stop();
  if (gameEngine) gameEngine.stop();

  // Clear Canvas
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilize (Optional for game logic, but good for UI text)
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Update UI
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "-";

  // 3. GameEngine에 포즈 전달
  // (키보드 컨트롤로 변경되어 포즈 기반 이동은 비활성화함)
  /*
  if (gameEngine) {
    // A. 포즈 키포인트(코)를 사용하여 부드러운 이동 (Continuous Movement)
    if (pose && pose.keypoints && pose.keypoints.length > 0) {
      const nose = pose.keypoints[0].position; // Nose is usually index 0
      gameEngine.setBasketPosition(nose.x); 
    } 
    // B. 포즈 감지가 안되면 기존 방식(클래스 분류) 사용 (Fallback)
    else if (stabilized.className) {
      gameEngine.setBasketPosition(stabilized.className);
    }
  }
  */
}

// Keyboard State
const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  space: false
};

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
  if (e.key === "ArrowUp") keys.up = true;
  if (e.key === "ArrowDown") keys.down = true;
  if (e.key === " " || e.code === "Space") {
    keys.space = true;
    // Trigger grab action immediately on press? Or continuous?
    // Better to trigger once per press.
    if (gameEngine) gameEngine.handleInput("space");
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
  if (e.key === "ArrowUp") keys.up = false;
  if (e.key === "ArrowDown") keys.down = false;
  if (e.key === " " || e.code === "Space") keys.space = false;
});

// Game Loop Variable
let animationId;

function drawGameLoop() {
  const now = Date.now();
  const deltaTime = now - lastTime;
  lastTime = now;

  // 1. 화면 지우기 (배경색은 CSS로 처리됨, 투명하게 지우면 배경 보임)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameEngine) {
    // 키보드 입력 처리 (이동)
    const moveSpeed = 0.15;
    if (keys.left) gameEngine.moveClaw(-moveSpeed * deltaTime, 0);
    if (keys.right) gameEngine.moveClaw(moveSpeed * deltaTime, 0);
    if (keys.up) gameEngine.moveClaw(0, -moveSpeed * deltaTime);
    if (keys.down) gameEngine.moveClaw(0, moveSpeed * deltaTime);


    // 업데이트
    gameEngine.update(Math.min(deltaTime, 50));

    // 그리기 (GameEngine은 200x200 좌표계 사용 -> 스케일링 필요)
    // 캔버스는 화면 꽉참 (예: 1920x1080)
    // 게임 로직은 0~200 사이.

    ctx.save();

    // 1. 비율 유지하며 화면에 꽉 차게 (Contain)
    const targetRatio = 1; // 200x200 = 1:1
    const screenRatio = canvas.width / canvas.height;

    let scale;
    let offsetX = 0;
    let offsetY = 0;

    // 화면이 더 넓으면 (가로 레터박스) -> 높이 기준
    if (screenRatio > targetRatio) {
      scale = canvas.height / 200;
      offsetX = (canvas.width - (200 * scale)) / 2;
    }
    // 화면이 더 좁으면 (세로 레터박스) -> 너비 기준
    else {
      scale = canvas.width / 200;
      offsetY = (canvas.height - (200 * scale)) / 2;
    }

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 배경 - 게임 영역 표시 (선택사항, 디버깅용 또는 명확한 경계)
    // ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    // ctx.fillRect(0, 0, 200, 200);

    gameEngine.draw(ctx);
    ctx.restore();
  }

  animationId = requestAnimationFrame(drawGameLoop);
}

// 초기화: lastTime 설정
lastTime = Date.now();



