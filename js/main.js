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
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 200,
      flip: true
    });

    // 2. Stabilizer 초기화 (떨림 방지)
    stabilizer = new PredictionStabilizer({
      threshold: 0.6,
      smoothingFrames: 3
    });

    // 3. GameEngine 초기화
    gameEngine = new GameEngine();

    // UI 콜백 설정
    gameEngine.setScoreChangeCallback((score, level) => {
      // 필요시 HTML UI 업데이트
      console.log(`Score: ${score}, Level: ${level}`);
    });

    gameEngine.setGameEndCallback((score, level) => {
      alert(`게임 종료! 최종 점수: ${score}`);
      stop();
    });

    // 4. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 200;
    canvas.height = 200;
    ctx = canvas.getContext("2d");

    // 5. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawGameLoop); // 렌더링 루프를 PoseEngine의 draw 콜백에 위임

    // 7. PoseEngine 시작
    poseEngine.start();

    // 8. Game 시작
    gameEngine.start();

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.\\n(모델 파일이 없거나 카메라 권한이 필요합니다)");
    startBtn.disabled = false;
  }
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) poseEngine.stop();
  if (gameEngine) gameEngine.stop();
  if (stabilizer) stabilizer.reset();

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilize
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
  if (gameEngine && stabilized.className) {
    gameEngine.setBasketPosition(stabilized.className);
  }
}

/**
 * 게임 & 포즈 렌더링 루프 (PoseEngine의 requestAnimationFrame에서 호출됨)
 */
function drawGameLoop(pose) {
  // 1. 웹캠 화면 그리기 (배경)
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0);
  }

  // 2. 키포인트 그리기 (선택사항 - 디버깅용)
  // if (pose) {
  //   tmPose.drawKeypoints(pose.keypoints, 0.5, ctx);
  //   tmPose.drawSkeleton(pose.keypoints, 0.5, ctx);
  // }

  // 3. 게임 로직 업데이트 (시간차 이용)
  const now = Date.now();
  const deltaTime = now - lastTime;
  lastTime = now;

  if (gameEngine) {
    // 프레임이 튀는 것을 방지하기 위해 최대 델타타임 제한
    gameEngine.update(Math.min(deltaTime, 50));

    // 4. 게임 화면 오버레이 그리기
    gameEngine.draw(ctx);
  }
}

// 초기화: lastTime 설정
lastTime = Date.now();

// 시작 버튼 이벤트 리스너는 HTML에서 onclick으로 연결됨 (init() 호출)

