// Extras: novas modalidades (Caça-Pares, Quiz Cósmico, Corrida Relâmpago) e personalização de avatar.
// Carregado depois de app.js; usa as funções e variáveis globais dele.

/* ===================== AVATAR ===================== */
const AV_BASES = [
  { id: "robo", e: "🤖", c: 0 }, { id: "raposa", e: "🦊", c: 0 }, { id: "panda", e: "🐼", c: 0 },
  { id: "tigre", e: "🐯", c: 20 }, { id: "sapo", e: "🐸", c: 20 }, { id: "polvo", e: "🐙", c: 40 },
  { id: "unicornio", e: "🦄", c: 60 }, { id: "dragao", e: "🐲", c: 80 }
];
const AV_ACCS = [
  { id: "nenhum", e: "", c: 0 }, { id: "formatura", e: "🎓", c: 20 }, { id: "bone", e: "🧢", c: 20 },
  { id: "cartola", e: "🎩", c: 30 }, { id: "oculos", e: "🕶️", c: 30 }, { id: "coroa", e: "👑", c: 80 }
];
const AV_COLORS = [
  { id: "ciano", v: "#1f6f86", c: 0 }, { id: "rosa", v: "#a93d78", c: 0 }, { id: "roxo", v: "#5a47b8", c: 0 },
  { id: "dourado", v: "#b8892b", c: 25 }, { id: "verde", v: "#2f8f5b", c: 25 }, { id: "vermelho", v: "#b3414a", c: 25 }
];
const AV_DEFAULT = { base: "robo", acc: "nenhum", color: "ciano" };
const AV_GROUPS = [["base", "Personagem", AV_BASES], ["acc", "Acessório", AV_ACCS], ["color", "Cor do fundo", AV_COLORS]];
const avFind = (list, id) => list.find(i => i.id === id) || list[0];

function avatarHTML(u, size) {
  const a = { ...AV_DEFAULT, ...((u && u.avatar) || {}) };
  const b = avFind(AV_BASES, a.base), ac = avFind(AV_ACCS, a.acc), co = avFind(AV_COLORS, a.color);
  return `<span class="avatar-comp" style="--av-bg:${co.v}${size ? `;--av-size:${size}px` : ""}"><span class="av-acc">${ac.e}</span><span class="av-base">${b.e}</span></span>`;
}
function applyAvatar(user) { $("welcome-user").innerHTML = `${avatarHTML(user, 28)} ${safeText(user.username)}`; }
const avOwned = (u, kind, item) => item.c === 0 || (u.owned || []).includes(`${kind}:${item.id}`);

function avatarAction(kind, id) {
  const group = AV_GROUPS.find(g => g[0] === kind), item = group && group[2].find(i => i.id === id);
  const cur = userFromToken(authToken);
  if (!cur || !item) throw new Error("Sessão inválida ou expirada. Entre novamente.");
  const users = readUsers(), u = users.find(x => x.username === cur.username);
  u.owned = u.owned || [];
  const key = `${kind}:${id}`;
  if (item.c > 0 && !u.owned.includes(key)) {
    if ((u.coins || 0) < item.c) throw new Error(`Faltam ${item.c - (u.coins || 0)} moedas para este item.`);
    u.coins -= item.c; u.owned.push(key);
  }
  u.avatar = { ...AV_DEFAULT, ...(u.avatar || {}), [kind]: id };
  writeUsers(users);
  return publicUser(u);
}
function renderAvatar(msg) {
  const u = currentUser; if (!u) return;
  $("avatar-content").innerHTML = `<div class="avatar-preview">${avatarHTML(u, 120)}<div><strong>${safeText(u.username)}</strong><div class="avatar-coins">🪙 ${u.coins || 0} moedas</div><p class="muted" id="avatar-msg" role="status">${msg || "Toque num item para usar. Itens com 🪙 são comprados com moedas."}</p></div></div>` +
    AV_GROUPS.map(([kind, label, list]) => `<h3 class="avatar-label">${label}</h3><div class="avatar-grid">${list.map(it => {
      const own = avOwned(u, kind, it), on = (u.avatar || AV_DEFAULT)[kind] === it.id || (!u.avatar && AV_DEFAULT[kind] === it.id);
      const face = kind === "color" ? `<i class="swatch" style="background:${it.v}"></i>` : (it.e || "∅");
      return `<button class="avatar-item${on ? " on" : ""}${own ? "" : " locked"}" data-av-kind="${kind}" data-av-id="${it.id}" aria-pressed="${on}">${face}<small>${on ? "em uso" : own ? "tenho" : `🪙 ${it.c}`}</small></button>`;
    }).join("")}</div>`).join("");
}
document.addEventListener("click", event => {
  const btn = event.target.closest("[data-av-kind]"); if (!btn) return;
  try { currentUser = avatarAction(btn.dataset.avKind, btn.dataset.avId); applyAvatar(currentUser); renderAvatar("Visual atualizado! ✨"); refreshDashboard(); }
  catch (error) { renderAvatar(error.message); }
});

/* ===================== NOVAS MODALIDADES ===================== */
const rnd = n => Math.floor(Math.random() * n);
const shuffle = arr => [...arr].sort(() => Math.random() - .5);

// 1) Caça-Pares: 3 tabuleiros (3, 4 e 6 pares)
let pairRound = 0;
function setupPairs() {
  setGameHeader("🃏 SETOR 04 • MEMÓRIA", "Caça-Pares", "Vire as cartas e encontre todos os pares com poucas jogadas.");
  pairRound = 0; renderPairs();
}
function renderPairs() {
  const pairs = [3, 4, 6][pairRound];
  const set = shuffle(["🚀", "🪐", "⭐", "🌙", "☄️", "👽", "🛸", "🌍"]).slice(0, pairs), cards = shuffle([...set, ...set]);
  let first = null, lock = false, moves = 0, found = 0;
  $("round-label").textContent = `Tabuleiro ${pairRound + 1} de 3`;
  $("game-area").innerHTML = `<div class="question-number">JOGADAS: <b id="pair-moves">0</b></div><div class="pair-grid" style="--cols:${pairs === 3 ? 3 : 4}">${cards.map((_, i) => `<button class="pair-card" aria-label="Carta ${i + 1}">?</button>`).join("")}</div>`;
  const btns = [...document.querySelectorAll(".pair-card")];
  btns.forEach((b, i) => b.addEventListener("click", () => {
    if (gameFinished || lock || b.classList.contains("flip") || b.classList.contains("done")) return;
    b.textContent = cards[i]; b.classList.add("flip");
    if (first === null) { first = i; return; }
    const a = first; first = null; moves++; $("pair-moves").textContent = moves;
    if (cards[a] === cards[i]) {
      btns[a].classList.add("done"); b.classList.add("done"); found++;
      if (found === pairs) {
        const pts = Math.max(pairs * 5, pairs * 12 - (moves - pairs) * 3); award(pts);
        mascotSay(`Tabuleiro completo em ${moves} jogadas! +${pts} XP.`); pairRound++;
        if (pairRound >= 3) finishGame("Você encontrou todos os pares!"); else setTimeout(renderPairs, 1100);
      }
    } else {
      lock = true;
      setTimeout(() => { [btns[a], b].forEach(x => { x.classList.remove("flip"); x.textContent = "?"; }); lock = false; }, 700);
    }
  }));
}

// 2) Quiz Cósmico: 5 perguntas sorteadas de um banco de 12
const QUIZ = [
  { t: "🪐 ESPAÇO", q: "Qual planeta é conhecido como “planeta vermelho”?", o: ["Marte", "Vênus", "Júpiter"], a: "Marte", why: "Marte tem poeira avermelhada, rica em ferro." },
  { t: "🪐 ESPAÇO", q: "Qual é a estrela mais próxima da Terra?", o: ["O Sol", "Sirius", "Estrela Polar"], a: "O Sol", why: "O Sol é a estrela do nosso Sistema Solar." },
  { t: "🪐 ESPAÇO", q: "Quantos planetas tem o Sistema Solar?", o: ["7", "8", "9"], a: "8", why: "São oito, de Mercúrio a Netuno." },
  { t: "🪐 ESPAÇO", q: "Em volta de qual astro a Terra gira?", o: ["Sol", "Lua", "Marte"], a: "Sol", why: "A Terra leva um ano para dar a volta no Sol." },
  { t: "🌱 CIÊNCIAS", q: "Qual gás as plantas liberam na fotossíntese?", o: ["Oxigênio", "Gás carbônico", "Fumaça"], a: "Oxigênio", why: "As plantas liberam o oxigênio que respiramos." },
  { t: "🐾 CIÊNCIAS", q: "Qual destes animais é um mamífero?", o: ["Golfinho", "Tubarão", "Sardinha"], a: "Golfinho", why: "O golfinho respira ar e amamenta os filhotes." },
  { t: "🐝 CIÊNCIAS", q: "Qual destes é um inseto?", o: ["Abelha", "Aranha", "Minhoca"], a: "Abelha", why: "Insetos têm seis patas, como a abelha." },
  { t: "🌎 GEOGRAFIA", q: "Qual é a capital do Brasil?", o: ["Brasília", "Rio de Janeiro", "São Paulo"], a: "Brasília", why: "Brasília é a capital federal desde 1960." },
  { t: "🌊 GEOGRAFIA", q: "Qual é o maior oceano do planeta?", o: ["Pacífico", "Atlântico", "Índico"], a: "Pacífico", why: "O Oceano Pacífico cobre mais área que todos os outros." },
  { t: "📖 PORTUGUÊS", q: "Qual palavra está escrita corretamente?", o: ["Passarinho", "Pasarinho", "Passarinio"], a: "Passarinho", why: "Passarinho se escreve com dois S." },
  { t: "📖 PORTUGUÊS", q: "Quantas letras tem o alfabeto?", o: ["26", "23", "29"], a: "26", why: "Com K, W e Y, o alfabeto tem 26 letras." },
  { t: "🔢 NÚMEROS", q: "Quantos dias tem uma semana?", o: ["7", "5", "10"], a: "7", why: "De domingo a sábado são sete dias." }
];
let quizBank = [], quizIdx = 0, quizCorrect = 0, quizLocked = false;
function setupQuiz() {
  setGameHeader("🔭 SETOR 05 • CONHECIMENTO", "Quiz Cósmico", "Teste o que você sabe sobre espaço, natureza e palavras.");
  quizBank = shuffle(QUIZ).slice(0, 5); quizIdx = 0; quizCorrect = 0; quizLocked = false; renderQuiz();
}
function renderQuiz() {
  const q = quizBank[quizIdx];
  $("round-label").textContent = `Pergunta ${quizIdx + 1} de 5`;
  $("game-area").innerHTML = `<div class="question-number">${q.t}</div><div class="math-question quiz-q">${safeText(q.q)}</div><div class="answer-options">${shuffle(q.o).map(v => `<button class="answer-btn" data-quiz="${safeText(v)}">${safeText(v)}</button>`).join("")}</div>`;
  document.querySelectorAll("[data-quiz]").forEach(btn => btn.addEventListener("click", () => {
    if (gameFinished || quizLocked) return; quizLocked = true;
    if (btn.dataset.quiz === q.a) { quizCorrect++; award(10); mascotSay(`Correto! ${q.why} +10 XP.`); }
    else mascotSay(`Quase! ${q.why}`);
    quizIdx++;
    if (quizIdx >= 5) finishGame(`Você acertou ${quizCorrect} de 5 perguntas!`);
    else setTimeout(() => { quizLocked = false; renderQuiz(); }, 1600);
  }));
}

// 3) Corrida Relâmpago: 30 segundos de contas rápidas
let raceTimer = null, raceCorrect = 0, raceTime = 30;
function setupRace() {
  setGameHeader("⚡ SETOR 06 • VELOCIDADE", "Corrida Relâmpago", "Acerte o máximo de contas em 30 segundos!");
  clearInterval(raceTimer); raceCorrect = 0; raceTime = 30; $("round-label").textContent = "Contra o relógio";
  $("game-area").innerHTML = `<div class="race-bar"><span id="race-fill"></span></div><div class="question-number">TEMPO: <b id="race-time">30</b>s • ACERTOS: <b id="race-hits">0</b></div><div id="race-q"></div>`;
  nextRace();
  raceTimer = setInterval(() => {
    const t = $("race-time");
    if (!t || activeGame !== "race" || gameFinished || $("play-view").classList.contains("hidden")) { clearInterval(raceTimer); return; }
    raceTime--; t.textContent = raceTime; $("race-fill").style.width = `${raceTime / 30 * 100}%`;
    if (raceTime <= 0) { clearInterval(raceTimer); finishGame(`Tempo esgotado! Você acertou ${raceCorrect} contas.`); }
  }, 1000);
}
function nextRace() {
  const mul = difficulty >= 3, max = difficulty === 1 ? 10 : difficulty === 2 ? 20 : 12;
  const a = rnd(max) + 1, b = rnd(max) + 1, ans = mul ? a * b : a + b;
  const opts = new Set([ans]); while (opts.size < 4) opts.add(Math.max(0, ans + rnd(11) - 5));
  $("race-q").innerHTML = `<div class="math-question">${a} ${mul ? "×" : "+"} ${b} = ?</div><div class="answer-options">${shuffle([...opts]).map(v => `<button class="answer-btn" data-race="${v}">${v}</button>`).join("")}</div>`;
  document.querySelectorAll("[data-race]").forEach(btn => btn.addEventListener("click", () => {
    if (gameFinished || raceTime <= 0) return;
    const ok = Number(btn.dataset.race) === ans;
    if (ok) { raceCorrect++; award(5 * difficulty); $("race-hits").textContent = raceCorrect; }
    recordAnswer(ok); nextRace();
  }));
}

window.EXTRA_GAMES = { pairs: setupPairs, quiz: setupQuiz, race: setupRace };
