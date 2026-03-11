const BACKEND_URL = "http://localhost:3000"; 
// когда зальёшь сервер, поменяй сюда адрес бэкенда

const HEROES = {
  Ranger: {
    desc: "Дальний бой, стабильный урон и хорошая дистанция.",
    colorA: "#56dfff",
    colorB: "#4d8dff",
    hp: 1800,
    speed: 3.8,
    damage: 210,
    range: 330,
    superName: "Triple Shot",
  },
  Tank: {
    desc: "Медленнее, но очень живучий. Хорош вблизи.",
    colorA: "#ffbf52",
    colorB: "#ff7048",
    hp: 3000,
    speed: 2.9,
    damage: 300,
    range: 210,
    superName: "Shockwave",
  },
  Assassin: {
    desc: "Быстрый герой для агрессии и рывков.",
    colorA: "#b36cff",
    colorB: "#6a5cff",
    hp: 1500,
    speed: 4.7,
    damage: 160,
    range: 220,
    superName: "Dash Burst",
  },
};

const SHOP_ITEMS = [
  {
    id: "ranger-neon",
    hero: "Ranger",
    title: "Neon Ranger",
    price: 250,
    colors: ["#88f7ff", "#2bb5ff"],
  },
  {
    id: "tank-inferno",
    hero: "Tank",
    title: "Inferno Tank",
    price: 250,
    colors: ["#ffd05a", "#ff5c43"],
  },
  {
    id: "assassin-shadow",
    hero: "Assassin",
    title: "Shadow Assassin",
    price: 250,
    colors: ["#d297ff", "#6a35ff"],
  },
];

const ui = {
  menuScreen: document.getElementById("menuScreen"),
  gameScreen: document.getElementById("gameScreen"),
  heroCards: document.getElementById("heroCards"),
  shopItems: document.getElementById("shopItems"),
  shopModalItems: document.getElementById("shopModalItems"),
  selectedHeroTitle: document.getElementById("selectedHeroTitle"),
  selectedHeroDesc: document.getElementById("selectedHeroDesc"),
  heroStats: document.getElementById("heroStats"),
  heroAvatar: document.getElementById("heroAvatar"),
  coinsValue: document.getElementById("coinsValue"),
  gemsValue: document.getElementById("gemsValue"),
  netStatus: document.getElementById("netStatus"),
  playBtn: document.getElementById("playBtn"),
  openShopBtn: document.getElementById("openShopBtn"),
  closeShopBtn: document.getElementById("closeShopBtn"),
  shopModal: document.getElementById("shopModal"),
  gameCanvas: document.getElementById("gameCanvas"),
  blueScore: document.getElementById("blueScore"),
  redScore: document.getElementById("redScore"),
  timeValue: document.getElementById("timeValue"),
  hudHeroName: document.getElementById("hudHeroName"),
  hpFill: document.getElementById("hpFill"),
  hpText: document.getElementById("hpText"),
  superFill: document.getElementById("superFill"),
  superText: document.getElementById("superText"),
  leaveBtn: document.getElementById("leaveBtn"),
};

const canvas = ui.gameCanvas;
const ctx = canvas.getContext("2d");

let socket = null;
let selfId = null;
let worldState = null;

let selectedHero = "Ranger";
let selectedSkinId = "default";

let wallet = JSON.parse(
  localStorage.getItem("arena-stars-wallet") ||
    JSON.stringify({
      coins: 1500,
      gems: 90,
      ownedSkins: ["default"],
    })
);

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  super: false,
  aimX: 640,
  aimY: 360,
};

function saveWallet() {
  localStorage.setItem("arena-stars-wallet", JSON.stringify(wallet));
}

function setNetStatus(text, online = false) {
  ui.netStatus.textContent = text;
  ui.netStatus.classList.toggle("online", online);
  ui.netStatus.classList.toggle("offline", !online);
}

function getSelectedSkinColors() {
  const item = SHOP_ITEMS.find((x) => x.id === selectedSkinId && x.hero === selectedHero);
  if (item) return item.colors;
  const h = HEROES[selectedHero];
  return [h.colorA, h.colorB];
}

function updateSelectedHeroPanel() {
  const hero = HEROES[selectedHero];
  const colors = getSelectedSkinColors();

  ui.selectedHeroTitle.textContent = selectedHero;
  ui.selectedHeroDesc.textContent = hero.desc;
  ui.hudHeroName.textContent = selectedHero;

  ui.heroStats.innerHTML = `
    <div class="stat-chip">HP: ${hero.hp}</div>
    <div class="stat-chip">DMG: ${hero.damage}</div>
    <div class="stat-chip">SPD: ${hero.speed}</div>
    <div class="stat-chip">RNG: ${hero.range}</div>
    <div class="stat-chip">SUPER: ${hero.superName}</div>
  `;

  ui.heroAvatar.style.background = `
    radial-gradient(circle at 30% 28%, rgba(255,255,255,.28), transparent 18%),
    linear-gradient(135deg, ${colors[0]}, ${colors[1]})
  `;
}

function renderWallet() {
  ui.coinsValue.textContent = wallet.coins;
  ui.gemsValue.textContent = wallet.gems;
}

function renderHeroCards() {
  ui.heroCards.innerHTML = "";

  Object.entries(HEROES).forEach(([name, hero]) => {
    const active = name === selectedHero;
    const card = document.createElement("div");
    card.className = `hero-card ${active ? "active" : ""}`;
    card.innerHTML = `
      <div class="badge">${hero.superName}</div>
      <div class="portrait" style="
        background:
          radial-gradient(circle at 30% 25%, rgba(255,255,255,.28), transparent 18%),
          linear-gradient(135deg, ${hero.colorA}, ${hero.colorB});
      "></div>
      <h3>${name}</h3>
      <p>${hero.desc}</p>
      <div class="hero-mini-stats">
        <div>HP: ${hero.hp}</div>
        <div>Урон: ${hero.damage}</div>
        <div>Скорость: ${hero.speed}</div>
      </div>
    `;
    card.onclick = () => {
      selectedHero = name;
      if (!wallet.ownedSkins.includes(selectedSkinId)) selectedSkinId = "default";
      updateSelectedHeroPanel();
      renderHeroCards();
      renderShop();
    };
    ui.heroCards.appendChild(card);
  });
}

function buySkin(item) {
  if (wallet.ownedSkins.includes(item.id)) {
    selectedSkinId = item.id;
    updateSelectedHeroPanel();
    renderShop();
    return;
  }

  if (wallet.coins < item.price) {
    alert("Не хватает монет");
    return;
  }

  wallet.coins -= item.price;
  wallet.ownedSkins.push(item.id);
  selectedSkinId = item.id;
  saveWallet();
  renderWallet();
  updateSelectedHeroPanel();
  renderShop();
}

function renderShopList(target) {
  target.innerHTML = "";

  SHOP_ITEMS.forEach((item) => {
    const owned = wallet.ownedSkins.includes(item.id);
    const equipped = selectedSkinId === item.id;
    const disabledHero = item.hero !== selectedHero;

    const card = document.createElement("div");
    card.className = "shop-card";
    card.innerHTML = `
      <div class="skin-preview" style="
        background:
          radial-gradient(circle at 30% 25%, rgba(255,255,255,.28), transparent 18%),
          linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]});
      "></div>
      <div class="shop-row">
        <div>
          <div class="shop-name">${item.title}</div>
          <div class="shop-meta">${item.hero}</div>
        </div>
        <div class="price">${item.price} coins</div>
      </div>
      <button class="btn ${equipped ? "btn-secondary" : "btn-primary"}">
        ${
          disabledHero
            ? "Выбери этого героя"
            : equipped
            ? "Надето"
            : owned
            ? "Надеть"
            : "Купить"
        }
      </button>
    `;

    const button = card.querySelector("button");
    button.disabled = disabledHero || equipped;
    button.onclick = () => {
      if (!disabledHero) buySkin(item);
    };

    target.appendChild(card);
  });
}

function renderShop() {
  renderShopList(ui.shopItems);
  renderShopList(ui.shopModalItems);
}

function openShop() {
  ui.shopModal.classList.remove("hidden");
}

function closeShop() {
  ui.shopModal.classList.add("hidden");
}

function showGame() {
  ui.menuScreen.classList.add("hidden");
  ui.gameScreen.classList.remove("hidden");
}

function showMenu() {
  ui.gameScreen.classList.add("hidden");
  ui.menuScreen.classList.remove("hidden");
}

function currentPlayer() {
  if (!worldState || !selfId) return null;
  return worldState.players.find((p) => p.id === selfId) || null;
}

function connectGame() {
  if (socket) socket.disconnect();

  setNetStatus("Подключение...", false);

  socket = io(BACKEND_URL, {
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    selfId = socket.id;
    setNetStatus("Подключено", true);
    showGame();

    socket.emit("join", {
      hero: selectedHero,
      skinId: selectedSkinId,
      name: "Player",
    });
  });

  socket.on("disconnect", () => {
    setNetStatus("Отключено", false);
    worldState = null;
  });

  socket.on("state", (state) => {
    worldState = state;

    ui.blueScore.textContent = state.score.blue;
    ui.redScore.textContent = state.score.red;
    ui.timeValue.textContent = Math.max(0, Math.floor(state.timeLeft));

    const me = currentPlayer();
    if (me) {
      ui.hpFill.style.width = `${(me.hp / me.maxHp) * 100}%`;
      ui.hpText.textContent = `${Math.max(0, Math.ceil(me.hp))} / ${me.maxHp}`;
      const superPct = Math.floor((me.superCharge / me.superNeed) * 100);
      ui.superFill.style.width = `${superPct}%`;
      ui.superText.textContent = `${superPct}%`;
    }
  });
}

function leaveGame() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  selfId = null;
  worldState = null;
  showMenu();
  setNetStatus("Не подключено", false);
}

ui.playBtn.onclick = connectGame;
ui.leaveBtn.onclick = leaveGame;
ui.openShopBtn.onclick = openShop;
ui.closeShopBtn.onclick = closeShop;
ui.shopModal.querySelector(".modal-backdrop").onclick = closeShop;

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") input.up = true;
  if (e.code === "KeyS") input.down = true;
  if (e.code === "KeyA") input.left = true;
  if (e.code === "KeyD") input.right = true;
  if (e.code === "Space") {
    input.super = true;
    e.preventDefault();
  }
  if (e.code === "Escape" && !ui.gameScreen.classList.contains("hidden")) {
    leaveGame();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") input.up = false;
  if (e.code === "KeyS") input.down = false;
  if (e.code === "KeyA") input.left = false;
  if (e.code === "KeyD") input.right = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  input.aimX = ((e.clientX - rect.left) / rect.width) * canvas.width;
  input.aimY = ((e.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener("mousedown", () => {
  input.shoot = true;
});

window.addEventListener("mouseup", () => {
  input.shoot = false;
});

setInterval(() => {
  if (socket && socket.connected) {
    socket.emit("input", { ...input });
    input.super = false;
  }
}, 33);

function drawRoundedRect(x, y, w, h, r, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawArena() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#1c2b4c");
  grad.addColorStop(1, "#121b33");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 20; y < canvas.height; y += 40) {
    ctx.strokeStyle = "rgba(255,255,255,.04)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let x = 20; x < canvas.width; x += 40) {
    ctx.strokeStyle = "rgba(255,255,255,.04)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
}

function drawObstacles(obstacles) {
  obstacles.forEach((o) => {
    drawRoundedRect(o.x, o.y, o.w, o.h, 16, "#2f426d");
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  });
}

function drawPlayers(players) {
  players.forEach((p) => {
    if (p.dead) return;

    ctx.save();

    if (p.id === selfId) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = p.team === "blue" ? "#4da3ff" : "#ff5f66";
    ctx.fill();

    const g = ctx.createLinearGradient(
      p.x - p.radius,
      p.y - p.radius,
      p.x + p.radius,
      p.y + p.radius
    );
    g.addColorStop(0, p.skinColors[0]);
    g.addColorStop(1, p.skinColors[1]);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    const gunLen = p.radius + 12;
    const gx = p.x + Math.cos(p.angle) * gunLen;
    const gy = p.y + Math.sin(p.angle) * gunLen;

    ctx.strokeStyle = "#11131a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(gx, gy);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x, p.y + p.radius + 22);

    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(p.x - 28, p.y - p.radius - 18, 56, 7);

    ctx.fillStyle = "#54df87";
    ctx.fillRect(p.x - 28, p.y - p.radius - 18, 56 * (p.hp / p.maxHp), 7);

    ctx.restore();
  });
}

function drawBullets(bullets) {
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.team === "blue" ? "#8fd3ff" : "#ffb1b5";
    ctx.fill();
  });
}

function drawWaiting() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawArena();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Подключение к серверу...", canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.fillText("Открой вторую вкладку, чтобы проверить мультиплеер", canvas.width / 2, canvas.height / 2 + 28);
}

function loop() {
  requestAnimationFrame(loop);

  if (ui.gameScreen.classList.contains("hidden")) return;

  if (!worldState) {
    drawWaiting();
    return;
  }

  drawArena();
  drawObstacles(worldState.obstacles);
  drawBullets(worldState.bullets);
  drawPlayers(worldState.players);
}

renderWallet();
renderHeroCards();
renderShop();
updateSelectedHeroPanel();
setNetStatus("Не подключено", false);
loop();
