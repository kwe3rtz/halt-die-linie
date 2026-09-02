const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const resourceValue = document.getElementById('resourceValue');
const waveValue = document.getElementById('waveValue');
const lineValue = document.getElementById('lineValue');
const scoreValue = document.getElementById('scoreValue');
const waveButton = document.getElementById('waveButton');
const pauseButton = document.getElementById('pauseButton');

const towerButtons = Array.from(document.querySelectorAll('.tower-button'));

const map = {
  width: canvas.width,
  height: canvas.height,
  trenchY: canvas.height - 90,
  trenchHeight: 80,
  noManLandHeight: 280,
  segmentCount: 6,
};

const state = {
  resources: 180,
  waveNumber: 0,
  score: 0,
  selectedTower: 'mg',
  paused: false,
  gameOver: false,
  nextWaveQueued: false,
  waveQueue: [],
  spawnTimer: 0,
  towers: [],
  enemies: [],
  projectiles: [],
  clouds: [],
  effects: [],
  lastTime: 0,
  pointer: { x: 0, y: 0 },
};

const segments = [
  { x: 90, width: 130, hp: 100, maxHp: 100, broken: false },
  { x: 245, width: 130, hp: 100, maxHp: 100, broken: false },
  { x: 400, width: 130, hp: 100, maxHp: 100, broken: false },
  { x: 555, width: 130, hp: 100, maxHp: 100, broken: false },
  { x: 710, width: 130, hp: 100, maxHp: 100, broken: false },
  { x: 865, width: 130, hp: 100, maxHp: 100, broken: false },
];

const enemyTypes = {
  infantry: { hp: 48, speed: 32, damage: 9, reward: 12, color: '#dfe0d6', priority: 1 },
  cavalry: { hp: 62, speed: 42, damage: 13, reward: 16, color: '#e9d09d', priority: 1.4 },
  flamethrower: { hp: 70, speed: 30, damage: 18, reward: 18, color: '#f08a5d', priority: 1.8 },
  gas: { hp: 54, speed: 28, damage: 12, reward: 18, color: '#8ade8a', priority: 1.3 },
  flyer: { hp: 42, speed: 38, damage: 10, reward: 17, color: '#c7b7ff', priority: 1.3, isAir: true },
  tank: { hp: 220, speed: 18, damage: 24, reward: 42, color: '#6d7177', priority: 2.4 },
};

const towerDefs = {
  mg: { name: 'MG-Nest', cost: 45, range: 150, fireRate: 0.24, damage: 9, color: '#f1f2ec', bulletSpeed: 420 },
  artillery: { name: 'Artillerie', cost: 75, range: 260, fireRate: 1.4, damage: 26, color: '#d9c596', bulletSpeed: 260, minRange: 90, splash: 36 },
  sniper: { name: 'Scharfschütze', cost: 90, range: 240, fireRate: 1.6, damage: 45, color: '#d8d4cf', bulletSpeed: 520 },
  barbed: { name: 'Stacheldraht', cost: 35, range: 80, fireRate: 0, damage: 0, color: '#d0b265' },
  searchlight: { name: 'Scheinwerfer', cost: 60, range: 170, fireRate: 0, damage: 0, color: '#e6d26b' },
  flak: { name: 'Flak', cost: 85, range: 210, fireRate: 0.8, damage: 18, color: '#8fb4ff', bulletSpeed: 340, isAntiAir: true },
};

const waveTemplates = [
  ['infantry', 'infantry', 'infantry', 'cavalry', 'infantry'],
  ['infantry', 'cavalry', 'gas', 'infantry', 'flamethrower'],
  ['infantry', 'infantry', 'gas', 'flyer', 'cavalry', 'infantry'],
  ['flamethrower', 'tank', 'infantry', 'flyer', 'gas', 'cavalry'],
  ['flyer', 'flamethrower', 'tank', 'gas', 'infantry', 'cavalry'],
];

function getSegmentCenter(segment) {
  return { x: segment.x + segment.width / 2, y: map.trenchY + 20 };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pickNearestSegment(x) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  segments.forEach((segment, index) => {
    const center = getSegmentCenter(segment);
    const d = Math.abs(center.x - x);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getLineIntegrity() {
  const total = segments.reduce((sum, seg) => sum + seg.maxHp, 0);
  const current = segments.reduce((sum, seg) => sum + (seg.broken ? 0 : seg.hp), 0);
  return Math.max(0, (current / total) * 100);
}

function formatLineIntegrity() {
  const value = getLineIntegrity();
  return `${Math.round(value)}%`;
}

function setSelectedTower(type) {
  state.selectedTower = type;
  towerButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tower === type);
  });
}

function canAfford(cost) {
  return state.resources >= cost;
}

function addEffect(x, y, color, radius, duration, text = '') {
  state.effects.push({ x, y, color, radius, duration, maxDuration: duration, text });
}

function createEnemy(type, laneX = null) {
  const blueprint = enemyTypes[type];
  const spawnX = laneX ?? 50 + Math.random() * (canvas.width - 100);
  const segmentIndex = pickNearestSegment(spawnX);
  const segmentCenter = getSegmentCenter(segments[segmentIndex]);
  const enemy = {
    type,
    x: spawnX,
    y: -8,
    radius: 10,
    hp: blueprint.hp,
    maxHp: blueprint.hp,
    speed: blueprint.speed,
    damage: blueprint.damage,
    reward: blueprint.reward,
    targetX: segmentCenter.x,
    targetY: segmentCenter.y,
    color: blueprint.color,
    segmentIndex,
    isAir: !!blueprint.isAir,
    priority: blueprint.priority || 1,
    slowed: 0,
    illuminated: 0,
    hitFlash: 0,
    reached: false,
  };

  state.enemies.push(enemy);
}

function spawnWave() {
  if (state.waveQueue.length === 0) {
    if (state.waveNumber >= waveTemplates.length) {
      state.waveNumber = waveTemplates.length;
    }
    const nextWave = waveTemplates[Math.min(state.waveNumber, waveTemplates.length - 1)];
    state.waveNumber += 1;
    state.waveQueue = [...nextWave];
    state.spawnTimer = 0.45;
    waveValue.textContent = state.waveNumber;
    return true;
  }
  return false;
}

function findEnemyTarget(tower) {
  const validTargets = state.enemies.filter((enemy) => {
    const within = distance(enemy, tower) <= tower.range;
    if (tower.type === 'flak') return within && enemy.isAir;
    if (tower.type === 'mg' || tower.type === 'artillery' || tower.type === 'sniper') {
      return within && !enemy.reached;
    }
    return false;
  });

  if (!validTargets.length) return null;

  if (tower.type === 'sniper') {
    validTargets.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  } else {
    validTargets.sort((a, b) => a.hp - b.hp);
  }

  return validTargets[0];
}

function setPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  state.pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
}

function buildTowerAt(x, y) {
  const type = state.selectedTower;
  const def = towerDefs[type];
  if (!canAfford(def.cost)) {
    return;
  }

  const towerX = clamp(x, 40, canvas.width - 40);
  const towerY = clamp(y, 90, map.trenchY - 30);

  const occupied = state.towers.some((tower) => distance(tower, { x: towerX, y: towerY }) < 28);
  if (occupied) {
    return;
  }

  state.resources -= def.cost;
  state.towers.push({
    x: towerX,
    y: towerY,
    type,
    radius: 10,
    range: def.range,
    cooldown: 0,
    level: 1,
    initialCost: def.cost,
  });

  if (type === 'barbed') {
    state.effects.push({ x: towerX, y: towerY, radius: 70, color: 'rgba(214, 175, 80, 0.35)', duration: 6, maxDuration: 6 });
  }
}

function fireProjectile(from, target, towerType) {
  const def = towerDefs[towerType];
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distanceToTarget = Math.hypot(dx, dy) || 1;
  const velocity = def.bulletSpeed || 360;

  state.projectiles.push({
    x: from.x,
    y: from.y,
    target,
    radius: towerType === 'artillery' ? 5 : 3,
    dx: (dx / distanceToTarget) * velocity,
    dy: (dy / distanceToTarget) * velocity,
    damage: def.damage || 0,
    towerType,
    splash: def.splash || 0,
    minRange: def.minRange || 0,
    color: def.color,
    life: 2.2,
  });
}

function applyDamageToEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.hitFlash = 0.09;

  if (enemy.hp <= 0) {
    state.resources += enemy.reward;
    state.score += enemy.reward * 10;
    if (enemy.type === 'gas') {
      state.clouds.push({ x: enemy.x, y: enemy.y, radius: 48, ttl: 5.5, damage: 8 });
    }
    state.enemies = state.enemies.filter((e) => e !== enemy);
  }
}

function applyProjectileHit(projectile) {
  const attackTarget = projectile.target;
  if (!attackTarget || attackTarget.reached) return;

  if (projectile.towerType === 'artillery') {
    state.enemies.forEach((enemy) => {
      if (distance(enemy, attackTarget) <= projectile.splash) {
        applyDamageToEnemy(enemy, projectile.damage);
      }
    });
  } else {
    const enemyIsIlluminated = attackTarget.illuminated > 0;
    const finalDamage = enemyIsIlluminated ? projectile.damage * 1.25 : projectile.damage;
    applyDamageToEnemy(attackTarget, finalDamage);
  }
}

function updateBarbedWire() {
  state.towers.forEach((tower) => {
    if (tower.type !== 'barbed') return;
    state.enemies.forEach((enemy) => {
      if (distance(enemy, tower) <= tower.range + 12) {
        enemy.slowed = 0.66;
      }
    });
  });
}

function updateSearchLights() {
  state.towers.forEach((tower) => {
    if (tower.type !== 'searchlight') return;
    state.enemies.forEach((enemy) => {
      if (distance(enemy, tower) <= tower.range) {
        enemy.illuminated = 1.2;
      }
    });
  });
}

function updateClouds(dt) {
  state.clouds.forEach((cloud) => {
    cloud.ttl -= dt;
    state.enemies.forEach((enemy) => {
      if (distance(enemy, cloud) <= cloud.radius) {
        enemy.hp -= cloud.damage * dt;
        enemy.hitFlash = 0.08;
        if (enemy.hp <= 0) {
          state.resources += enemy.reward;
          state.score += Math.round(enemy.reward * 10);
          state.enemies = state.enemies.filter((candidate) => candidate !== enemy);
        }
      }
    });
  });

  state.clouds = state.clouds.filter((cloud) => cloud.ttl > 0);
}

function updateTowers(dt) {
  state.towers.forEach((tower) => {
    tower.cooldown -= dt;

    if (tower.type === 'barbed') {
      return;
    }

    if (tower.type === 'searchlight') {
      return;
    }

    const target = findEnemyTarget(tower);
    if (!target) return;

    if (tower.cooldown <= 0) {
      const actualRange = tower.type === 'artillery' ? tower.range : tower.range;
      const isInRange = distance(target, tower) <= actualRange;
      if (!isInRange) return;

      if (tower.type === 'artillery') {
        const d = distance(target, tower);
        if (d < towerDefs.artillery.minRange) return;
      }

      fireProjectile(tower, target, tower.type);
      tower.cooldown = towerDefs[tower.type].fireRate;
    }
  });
}

function updateProjectiles(dt) {
  state.projectiles.forEach((projectile) => {
    projectile.life -= dt;
    projectile.x += projectile.dx * dt;
    projectile.y += projectile.dy * dt;

    const target = projectile.target;
    if (target && !target.reached) {
      const hitDistance = distance(projectile, target);
      if (hitDistance < target.radius + 8) {
        applyProjectileHit(projectile);
        projectile.life = 0;
      }
    }
  });

  state.projectiles = state.projectiles.filter((projectile) => projectile.life > 0);
}

function updateEnemies(dt) {
  const activeEnemies = [];

  state.enemies.forEach((enemy) => {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.illuminated = Math.max(0, enemy.illuminated - dt);

    const slowFactor = enemy.slowed > 0 ? enemy.slowed : 1;
    enemy.slowed = Math.max(0, enemy.slowed - dt * 0.4);

    const target = { x: enemy.targetX, y: enemy.targetY };
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist > 1) {
      const move = enemy.speed * slowFactor * dt;
      enemy.x += (dx / dist) * move;
      enemy.y += (dy / dist) * move;
    }

    if (dist <= 2.5) {
      enemy.reached = true;
      const segment = segments[enemy.segmentIndex];
      if (!segment.broken) {
        segment.hp -= enemy.damage;
        addEffect(segment.x + segment.width / 2, map.trenchY + 12, 'rgba(210, 110, 80, 0.65)', 22, 0.5, '-');
      }

      if (segment.hp <= 0) {
        segment.hp = 0;
        segment.broken = true;
      }

      if (segment.broken) {
        state.score = Math.max(0, state.score - 15);
      }

      return;
    }

    activeEnemies.push(enemy);
  });

  state.enemies = activeEnemies;
}

function startWave() {
  if (state.gameOver) return;
  if (state.waveQueue.length === 0) {
    spawnWave();
  }
  if (state.waveQueue.length > 0) {
    state.nextWaveQueued = true;
  }
}

function updateWave(dt) {
  if (state.gameOver) return;

  if (state.waveQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const nextType = state.waveQueue.shift();
      createEnemy(nextType);
      state.spawnTimer = 0.7;
    }
    return;
  }

  if (state.nextWaveQueued && state.enemies.length === 0) {
    state.nextWaveQueued = false;
    state.resources += 35;
    state.score += 150;
    spawnWave();
  }
}

function updateUI() {
  resourceValue.textContent = String(state.resources);
  waveValue.textContent = String(state.waveNumber || 0);
  lineValue.textContent = formatLineIntegrity();
  scoreValue.textContent = String(state.score);
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, map.noManLandHeight + 110);
  sky.addColorStop(0, '#b2a274');
  sky.addColorStop(0.34, '#c2b788');
  sky.addColorStop(0.6, '#6d845d');
  sky.addColorStop(1, '#445946');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#193026';
  ctx.fillRect(0, 320, canvas.width, 22);

  ctx.fillStyle = 'rgba(32, 38, 22, 0.22)';
  for (let y = 0; y < canvas.height; y += 26) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.fillStyle = '#4d5a4f';
  ctx.fillRect(0, map.trenchY, canvas.width, map.trenchHeight);

  ctx.fillStyle = '#534a39';
  ctx.fillRect(0, map.trenchY + 8, canvas.width, 12);

  segments.forEach((segment) => {
    const x = segment.x;
    const width = segment.width;
    const overrun = segment.broken ? '#332c28' : '#c9c0a5';
    ctx.fillStyle = overrun;
    ctx.fillRect(x, map.trenchY, width, map.trenchHeight);

    const healthRatio = segment.hp / segment.maxHp;
    ctx.fillStyle = '#1e261e';
    ctx.fillRect(x + 8, map.trenchY + 14, width - 16, 8);
    ctx.fillStyle = healthRatio > 0.35 ? '#96c68c' : '#d27660';
    ctx.fillRect(x + 8, map.trenchY + 14, (width - 16) * healthRatio, 8);

    const centerX = x + width / 2;
    ctx.strokeStyle = 'rgba(12, 12, 12, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, map.trenchY);
    ctx.lineTo(centerX, map.trenchY + map.trenchHeight);
    ctx.stroke();
  });

  const noManLand = ctx.createLinearGradient(0, 0, 0, map.trenchY);
  noManLand.addColorStop(0, 'rgba(128, 120, 94, 0.2)');
  noManLand.addColorStop(1, 'rgba(106, 100, 79, 0.12)');
  ctx.fillStyle = noManLand;
  ctx.fillRect(0, 0, canvas.width, map.trenchY);

  ctx.strokeStyle = 'rgba(38, 41, 35, 0.55)';
  ctx.lineWidth = 1;
  for (let x = 30; x < canvas.width; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, map.trenchY);
    ctx.stroke();
  }
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    const fill = enemy.hitFlash > 0 ? '#fff' : enemy.color;
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.illuminated > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 219, 112, 0.7)';
      ctx.lineWidth = 2;
      ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#1a231c';
    ctx.fillRect(enemy.x - 14, enemy.y - 19, 28, 5);
    ctx.fillStyle = '#8cc78c';
    ctx.fillRect(enemy.x - 14, enemy.y - 19, (28 * enemy.hp) / enemy.maxHp, 5);
  });
}

function drawTowers() {
  state.towers.forEach((tower) => {
    ctx.beginPath();
    ctx.fillStyle = towerDefs[tower.type].color;
    ctx.arc(tower.x, tower.y, tower.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.35)';
    ctx.arc(tower.x, tower.y, towerDefs[tower.type].range, 0, Math.PI * 2);
    ctx.stroke();

    if (tower.type === 'barbed') {
      ctx.strokeStyle = '#9c6d30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tower.x - 12, tower.y - 8);
      ctx.lineTo(tower.x - 4, tower.y + 8);
      ctx.lineTo(tower.x + 3, tower.y - 8);
      ctx.lineTo(tower.x + 11, tower.y + 8);
      ctx.stroke();
    }

    if (tower.type === 'searchlight') {
      ctx.strokeStyle = 'rgba(255, 208, 66, 0.6)';
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y);
      ctx.lineTo(tower.x, tower.y - 36);
      ctx.stroke();
    }
  });
}

function drawProjectiles() {
  state.projectiles.forEach((projectile) => {
    ctx.beginPath();
    ctx.fillStyle = projectile.color;
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEffects() {
  state.effects.forEach((effect) => {
    ctx.beginPath();
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (effect.text) {
      ctx.fillStyle = '#f5f0df';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(effect.text, effect.x - 6, effect.y + 4);
    }
  });

  state.clouds.forEach((cloud) => {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(130, 205, 135, 0.18)';
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPointerHint() {
  const { x, y } = state.pointer;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(245, 240, 223, 0.92)';
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.stroke();
}

function render() {
  drawBackground();
  drawEffects();
  drawTowers();
  drawProjectiles();
  drawEnemies();
  drawPointerHint();
}

function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000 || 0.016);
  state.lastTime = timestamp;

  if (!state.paused && !state.gameOver) {
    updateWave(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateBarbedWire();
    updateSearchLights();
    updateClouds(dt);
    updateEnemies(dt);
    updateUI();

    if (segments.every((segment) => segment.broken)) {
      state.gameOver = true;
      state.waveQueue = [];
      state.enemies = [];
    }

    state.effects = state.effects.filter((effect) => (effect.duration -= dt) > 0);
  }

  render();
  requestAnimationFrame(loop);
}

canvas.addEventListener('click', (event) => {
  setPointerPosition(event);
  buildTowerAt(state.pointer.x, state.pointer.y);
});

canvas.addEventListener('mousemove', (event) => {
  setPointerPosition(event);
});

towerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setSelectedTower(button.dataset.tower);
  });
});

waveButton.addEventListener('click', () => {
  startWave();
});

pauseButton.addEventListener('click', () => {
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? 'Weiter' : 'Pause';
});

state.pointer.x = canvas.width / 2;
state.pointer.y = canvas.height / 2;

requestAnimationFrame(loop);
updateUI();
spawnWave();
