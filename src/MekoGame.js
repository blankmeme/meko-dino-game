// A vertical jumping version of Meko Game with endless platform generation and refined gameplay
import React, { useEffect, useRef, useState } from "react";

const MekoGame = () => {
  const jumpSound = new Audio("https://www.myinstants.com/media/sounds/jump-sound.mp3");
  const canvasRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [firstJump, setFirstJump] = useState(false);
  const keys = useRef({});
  const gameState = useRef({});
  const growthTimer = useRef(null);
  const lastPlatformGenY = useRef(0);

  useEffect(() => {
    if (!started || gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const mekoImg = new Image();
    mekoImg.src = process.env.PUBLIC_URL + "/meko.png";
    const eggImg = new Image();
    eggImg.src = process.env.PUBLIC_URL + "/egg.png";
    const bgImg = new Image();
    bgImg.src = process.env.PUBLIC_URL + "/background.png";

    const gravity = 0.6;

    const generatePlatforms = (startY) => {
      const platforms = [];
      const spacing = 75;
      let y = startY;
      const maxY = startY - 8000;
      const rowWidth = canvas.width - 60;
      while (y > maxY) {
        const width = 100;
        const height = 12;
        const numPlatforms = Math.floor(Math.random() * 2) + 1;
        const row = [];
        for (let i = 0; i < numPlatforms; i++) {
          let x;
          let dx = Math.random() < 0.3 ? 2.8 : 0;
          let tries = 0;
          do {
            x = Math.random() * rowWidth;
            tries++;
          } while (row.some(p => Math.abs(p.x - x) < width + 40) && tries < 10);
          row.push({ x, y, width, height, dx });
        }
        platforms.push(...row);
        y -= spacing;
      }
      lastPlatformGenY.current = y;
      return platforms;
    };

    const resetGameState = () => {
      const meko = {
        x: canvas.width / 2 - 60,
        y: canvas.height - 250,
        width: 130,
        height: 130,
        velocityY: 0,
        jumpForce: 18,
        speed: 4,
        growth: 1,
        originalSize: 130,
        lastPlatformY: null,
      };

      const egg = {
        x: Math.random() * (canvas.width - 50),
        y: canvas.height - 800,
        width: 40,
        height: 50,
        collected: false,
      };

      lastPlatformGenY.current = canvas.height - 100;

      const basePlatform = {
        x: canvas.width / 2 - 75,
        y: canvas.height - 60,
        width: 150,
        height: 15,
        dx: 0,
      };

      gameState.current = {
        meko,
        egg,
        platforms: [basePlatform, ...generatePlatforms(canvas.height - 120)],
        score: 0,
        scrollOffset: 0,
      };
    };

    const respawnEgg = () => {
      const state = gameState.current;
      const verticalStep = 800;
      const newY = state.scrollOffset + verticalStep + Math.random() * 200;
      state.egg.x = Math.random() * (canvas.width - state.egg.width);
      state.egg.y = canvas.height - newY;
      state.egg.collected = false;
    };

    const update = () => {
      if (gameOver) return;
      const state = gameState.current;
      const { meko, egg, platforms } = state;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      if (firstJump) {
        meko.velocityY += gravity;
        meko.y += meko.velocityY;
      }

      if (meko.y < canvas.height * 0.6) {
        const diff = canvas.height * 0.6 - meko.y;
        state.scrollOffset += diff;
        meko.y = canvas.height * 0.6;
        platforms.forEach(p => (p.y += diff));
        egg.y += diff;

        if (state.scrollOffset - lastPlatformGenY.current > 4000) {
          const newPlatforms = generatePlatforms(lastPlatformGenY.current);
          state.platforms.push(...newPlatforms);
        }
      }

      if (meko.y > canvas.height + 100) {
        setGameOver(true);
        setFinalScore(state.score);
        clearTimeout(growthTimer.current);
        return;
      }

      if (keys.current["ArrowLeft"]) meko.x -= meko.speed;
      if (keys.current["ArrowRight"]) meko.x += meko.speed;
      meko.x = Math.max(0, Math.min(canvas.width - meko.width * meko.growth, meko.x));

      ctx.drawImage(mekoImg, meko.x, meko.y, meko.width * meko.growth, meko.height * meko.growth);

      platforms.forEach(p => {
        if (p.dx) {
          p.x += p.dx;
          if (p.x < 0 || p.x + p.width > canvas.width) p.dx *= -1;
        }

        ctx.fillStyle = "#444";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        if (
          firstJump &&
          meko.y + meko.height * meko.growth >= p.y &&
          meko.y + meko.height * meko.growth <= p.y + 15 &&
          meko.x + meko.width * meko.growth > p.x &&
          meko.x < p.x + p.width &&
          meko.velocityY > 0
        ) {
          meko.velocityY = -meko.jumpForce * meko.growth;
          jumpSound.play();
          state.score += 1;
        }
      });

      if (!egg.collected) {
        ctx.drawImage(eggImg, egg.x, egg.y, egg.width, egg.height);
        if (
          meko.x < egg.x + egg.width &&
          meko.x + meko.width * meko.growth > egg.x &&
          meko.y < egg.y + egg.height &&
          meko.y + meko.height * meko.growth > egg.y
        ) {
          egg.collected = true;
          meko.growth += 0.3;
          meko.jumpForce += 1.5;
          state.score += 10;
          respawnEgg();
          clearTimeout(growthTimer.current);
          growthTimer.current = setTimeout(() => {
            meko.growth = 1;
            meko.jumpForce = 18;
          }, 10000);
        }
      }

      ctx.fillStyle = "black";
      ctx.font = "20px Arial";
      ctx.fillText("Score: " + state.score, 20, 30);
      requestAnimationFrame(update);
    };

    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
      if (!firstJump && e.code === "Space") setFirstJump(true);
    };
    const handleKeyUp = (e) => {
      keys.current[e.code] = false;
    };

    let loaded = 0;
    const tryStart = () => {
      loaded++;
      if (loaded === 3) {
        resetGameState();
        Object.keys(keys.current).forEach((k) => (keys.current[k] = false));
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        update();
      }
    };

    mekoImg.onload = tryStart;
    eggImg.onload = tryStart;
    bgImg.onload = tryStart;

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      clearTimeout(growthTimer.current);
    };
  }, [started, gameOver, firstJump]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {!started ? (
        <div style={{ position: "absolute", width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", background: "#fff", zIndex: 10 }}>
          <img src={process.env.PUBLIC_URL + "/meko.png"} alt="Start Meko" style={{ width: 120, height: 120, marginBottom: 20 }} />
          <button onClick={() => setStarted(true)} style={{ padding: "12px 24px", fontSize: "1.2rem", marginBottom: 10 }}>Start Game</button>
        </div>
      ) : gameOver ? (
        <div style={{ position: "absolute", width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", background: "#fff", zIndex: 10 }}>
          <h2>Game Over</h2>
          <p>Final Score: {finalScore}</p>
          <button onClick={() => { setGameOver(false); setFirstJump(false); setStarted(true); }}>Restart</button>
        </div>
      ) : (
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", backgroundColor: "#eef" }} />
      )}
    </div>
  );
};

export default MekoGame;
