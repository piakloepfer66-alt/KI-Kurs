(() => {
  "use strict";

  // --- Canvas Setup -------------------------------------------------------
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // --- Core Game Constants ------------------------------------------------
  const SHIP_RADIUS = 14;
  const SHIP_ROT_SPEED = 4.2;
  const SHIP_THRUST = 260;
  const SHIP_FRICTION = 0.992;

  const BULLET_SPEED = 460;
  const BULLET_LIFE = 1.1;
  const BULLET_COOLDOWN = 0.17;

  const START_LIVES = 3;
  const INVULN_AFTER_HIT = 1.8;

  const ASTEROID_SIZES = {
    3: { radius: 52, score: 20 },
    2: { radius: 30, score: 50 },
    1: { radius: 16, score: 100 },
  };

  // --- Input State --------------------------------------------------------
  const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false,
  };

  // --- Dynamic Game State -------------------------------------------------
  let ship;
  let bullets;
  let asteroids;
  let particles;
  let score;
  let lives;
  let gameOver;
  let paused;
  let lastTime;

  function init() {
    ship = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      cooldown: 0,
      invulnerable: 0,
      thrusting: false,
      muzzleFlash: 0,
    };

    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    lives = START_LIVES;
    gameOver = false;
    paused = false;

    spawnWave(5);
  }

  // --- Entity Creation ----------------------------------------------------
  function spawnWave(count) {
    for (let i = 0; i < count; i += 1) {
      asteroids.push(createAsteroid(3));
    }
  }

  function createAsteroid(size, x, y) {
    const radius = ASTEROID_SIZES[size].radius;
    const speed = (1.1 + Math.random() * 1.4) * (4 - size) * 40;
    const dir = Math.random() * Math.PI * 2;

    const spawnNearShip = x === undefined || y === undefined;
    let px = x;
    let py = y;

    if (spawnNearShip) {
      do {
        px = Math.random() * WIDTH;
        py = Math.random() * HEIGHT;
      } while (distance(px, py, ship.x, ship.y) < 160);
    }

    return {
      x: px,
      y: py,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      size,
      radius,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() * 2 - 1) * 0.7,
      shape: generateRockShape(radius),
    };
  }

  function generateRockShape(radius) {
    const points = [];
    const vertices = 10;
    for (let i = 0; i < vertices; i += 1) {
      const angle = (i / vertices) * Math.PI * 2;
      const noise = 0.72 + Math.random() * 0.5;
      points.push({
        x: Math.cos(angle) * radius * noise,
        y: Math.sin(angle) * radius * noise,
      });
    }
    return points;
  }

  function fireBullet() {
    if (ship.cooldown > 0 || gameOver) return;

    bullets.push({
      x: ship.x + Math.cos(ship.angle) * SHIP_RADIUS,
      y: ship.y + Math.sin(ship.angle) * SHIP_RADIUS,
      vx: ship.vx + Math.cos(ship.angle) * BULLET_SPEED,
      vy: ship.vy + Math.sin(ship.angle) * BULLET_SPEED,
      life: BULLET_LIFE,
      radius: 2.5,
    });

    ship.cooldown = BULLET_COOLDOWN;
    ship.muzzleFlash = 0.06;
  }

  // --- Main Loop ----------------------------------------------------------
  function frame(timestamp) {
    const now = timestamp * 0.001;
    const dt = Math.min((now - lastTime) || 0, 0.034);
    lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (!gameOver && !paused) {
      updateShip(dt);
      updateBullets(dt);
      updateAsteroids(dt);
      handleCollisions();

      if (asteroids.length === 0) {
        spawnWave(5 + Math.floor(score / 800));
      }
    }

    updateParticles(dt);
  }

  // --- Update Logic -------------------------------------------------------
  function updateShip(dt) {
    if (keys.ArrowLeft) ship.angle -= SHIP_ROT_SPEED * dt;
    if (keys.ArrowRight) ship.angle += SHIP_ROT_SPEED * dt;

    ship.thrusting = keys.ArrowUp;
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
      ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;

      if (Math.random() < 0.45) {
        createThrusterSpark();
      }
    }

    ship.vx *= SHIP_FRICTION;
    ship.vy *= SHIP_FRICTION;

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship);

    ship.cooldown = Math.max(0, ship.cooldown - dt);
    ship.invulnerable = Math.max(0, ship.invulnerable - dt);
    ship.muzzleFlash = Math.max(0, ship.muzzleFlash - dt);
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);

      if (b.life <= 0) bullets.splice(i, 1);
    }
  }

  function updateAsteroids(dt) {
    for (const a of asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation += a.rotSpeed * dt;
      wrap(a);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.985;
      p.vy *= 0.985;

      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // --- Collision Detection ------------------------------------------------
  function handleCollisions() {
    // Bullets vs. asteroids
    for (let bi = bullets.length - 1; bi >= 0; bi -= 1) {
      const bullet = bullets[bi];

      for (let ai = asteroids.length - 1; ai >= 0; ai -= 1) {
        const asteroid = asteroids[ai];
        if (distance(bullet.x, bullet.y, asteroid.x, asteroid.y) > asteroid.radius + bullet.radius) {
          continue;
        }

        bullets.splice(bi, 1);
        destroyAsteroid(ai);
        break;
      }
    }

    // Ship vs. asteroids
    if (ship.invulnerable > 0) return;

    for (const asteroid of asteroids) {
      if (distance(ship.x, ship.y, asteroid.x, asteroid.y) <= asteroid.radius + SHIP_RADIUS * 0.72) {
        shipHit();
        break;
      }
    }
  }

  function destroyAsteroid(index) {
    const asteroid = asteroids[index];
    score += ASTEROID_SIZES[asteroid.size].score;

    createExplosion(asteroid.x, asteroid.y, asteroid.radius, "#c8ecff");

    if (asteroid.size > 1) {
      // Große Asteroiden zerbrechen in zwei kleinere.
      for (let i = 0; i < 2; i += 1) {
        const child = createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y);
        child.vx += asteroid.vx * 0.25;
        child.vy += asteroid.vy * 0.25;
        asteroids.push(child);
      }
    }

    asteroids.splice(index, 1);
  }

  function shipHit() {
    lives -= 1;
    createExplosion(ship.x, ship.y, SHIP_RADIUS * 1.4, "#ffb8a6");

    ship.x = WIDTH / 2;
    ship.y = HEIGHT / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.invulnerable = INVULN_AFTER_HIT;

    if (lives <= 0) {
      gameOver = true;
    }
  }

  // --- Particle / FX Helpers ---------------------------------------------
  function createExplosion(x, y, spread, color) {
    const count = 14;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.45,
        size: 1 + Math.random() * 2.8,
        color,
      });
    }

    for (let i = 0; i < 6; i += 1) {
      particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        life: 0.2,
        size: 1.7,
        color: "#ffffff",
      });
    }
  }

  function createThrusterSpark() {
    const backX = ship.x - Math.cos(ship.angle) * SHIP_RADIUS;
    const backY = ship.y - Math.sin(ship.angle) * SHIP_RADIUS;
    const angle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 40 + Math.random() * 70;

    particles.push({
      x: backX,
      y: backY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.14,
      size: 1.8,
      color: "#8bd6ff",
    });
  }

  // --- Rendering ----------------------------------------------------------
  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawStars();
    drawAsteroids();
    drawBullets();
    drawParticles();
    drawShip();
    drawHUD();

    if (gameOver) drawGameOver();
    if (paused && !gameOver) drawPauseOverlay();
  }

  function drawStars() {
    // Schlichter Arcade-Hintergrund.
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 113.97) % WIDTH;
      const y = (i * 67.21) % HEIGHT;
      const twinkle = (Math.sin((performance.now() * 0.001 + i) * 2.5) + 1) * 0.35;
      ctx.fillStyle = `rgba(153, 192, 226, ${0.15 + twinkle})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawShip() {
    if (gameOver) return;

    const blink = ship.invulnerable > 0 && Math.floor(ship.invulnerable * 10) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = "#d2efff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(SHIP_RADIUS, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.85, -SHIP_RADIUS * 0.7);
    ctx.lineTo(-SHIP_RADIUS * 0.45, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.85, SHIP_RADIUS * 0.7);
    ctx.closePath();
    ctx.stroke();

    if (ship.thrusting) {
      ctx.beginPath();
      ctx.moveTo(-SHIP_RADIUS * 0.9, -4);
      ctx.lineTo(-SHIP_RADIUS - 8 - Math.random() * 6, 0);
      ctx.lineTo(-SHIP_RADIUS * 0.9, 4);
      ctx.strokeStyle = "#7dd5ff";
      ctx.stroke();
    }

    if (ship.muzzleFlash > 0) {
      ctx.beginPath();
      ctx.moveTo(SHIP_RADIUS + 1, 0);
      ctx.lineTo(SHIP_RADIUS + 8, 0);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBullets() {
    ctx.fillStyle = "#f8fdff";
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAsteroids() {
    ctx.strokeStyle = "#b3cae0";
    ctx.lineWidth = 2;

    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      ctx.beginPath();
      a.shape.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life * 2.6);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    ctx.fillStyle = "#9fd9ff";
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score.toString().padStart(5, "0")}`, 22, 34);
    ctx.fillText(`LIVES: ${Math.max(lives, 0)}`, 22, 62);

    if (!gameOver && ship.invulnerable > 0) {
      ctx.fillStyle = "#ffb0a0";
      ctx.fillText("SCHILD AKTIV", WIDTH - 190, 34);
    }

    if (paused && !gameOver) {
      ctx.fillStyle = "#ffdcae";
      ctx.fillText("STATUS: ⏸ PAUSE", WIDTH - 220, 62);
    }
  }

  function drawPauseOverlay() {
    ctx.fillStyle = "rgba(5, 10, 18, 0.5)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffe0b8";
    ctx.textAlign = "center";
    ctx.font = '44px "Courier New", monospace';
    ctx.fillText("⏸", WIDTH / 2, HEIGHT / 2 - 24);
    ctx.font = '26px "Courier New", monospace';
    ctx.fillText("PAUSE", WIDTH / 2, HEIGHT / 2 + 20);
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText("Drücke P zum Fortsetzen", WIDTH / 2, HEIGHT / 2 + 56);
    ctx.textAlign = "start";
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(5, 10, 18, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffd6cc";
    ctx.textAlign = "center";
    ctx.font = '52px "Courier New", monospace';
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 22);

    ctx.fillStyle = "#d4ebff";
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText(`FINAL SCORE: ${score}`, WIDTH / 2, HEIGHT / 2 + 22);
    ctx.fillText("Drücke ENTER zum Neustart", WIDTH / 2, HEIGHT / 2 + 66);
    ctx.textAlign = "start";
  }

  // --- Utility ------------------------------------------------------------
  function wrap(entity) {
    if (entity.x < 0) entity.x += WIDTH;
    if (entity.x > WIDTH) entity.x -= WIDTH;
    if (entity.y < 0) entity.y += HEIGHT;
    if (entity.y > HEIGHT) entity.y -= HEIGHT;
  }

  function distance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.hypot(dx, dy);
  }

  // --- Input Handling -----------------------------------------------------
  window.addEventListener("keydown", (event) => {
    if (event.code in keys) {
      keys[event.code] = true;
      event.preventDefault();
    }

    if (event.code === "Space") {
      fireBullet();
      event.preventDefault();
    }

    if (event.code === "Enter" && gameOver) {
      init();
    }

    if (event.code === "KeyP" && !gameOver) {
      paused = !paused;
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code in keys) {
      keys[event.code] = false;
      event.preventDefault();
    }
  });

  // --- Boot ---------------------------------------------------------------
  init();
  lastTime = performance.now() * 0.001;
  requestAnimationFrame(frame);
})();
