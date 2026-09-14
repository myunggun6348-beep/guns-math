// Add a game here to place another clickable card in the library.
const games = [
  {
    title: "마지막 종이 울리기 전에",
    category: "방탈출 게임",
    description: "교실 속 단서를 풀고 세 개의 열쇠를 찾으세요.",
    detail: "15분 · 교실 3개",
    image: "assets/escape-classroom.png",
    url: "https://last-bell-math-escape.gun777.chatgpt.site/",
    note: "새 탭에서 실행 · ChatGPT 로그인 필요"
  }
];

const grid = document.getElementById("gameGrid");
for (const game of games) {
  const card = document.createElement("a");
  card.className = "game-card";
  card.href = game.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  const image = document.createElement("img");
  image.src = game.image; image.alt = ""; image.loading = "lazy";
  const content = document.createElement("div"); content.className = "game-card-content";
  for (const [tag, className, text] of [
    ["span", "game-category", game.category],
    ["h2", "game-title", game.title],
    ["p", "game-description", game.description],
    ["p", "game-detail", game.detail],
    ["span", "game-launch", "게임 시작 ↗"],
    ["small", "game-note", game.note]
  ]) {
    const element = document.createElement(tag);
    element.className = className; element.textContent = text; content.append(element);
  }
  card.append(image, content); grid.append(card);
}
