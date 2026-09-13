const subjects = ["공통수학1", "공통수학2", "대수", "미적분Ⅰ", "확률과 통계", "기하"];
const courses = ["수학 종합", ...subjects];

function levelName(level) {
  return ({ basic: "기본", standard: "보통", advanced: "심화" })[level] || "보통";
}

function make(subject, n, level) {
  const hard = level === "advanced";
  const standard = level !== "basic";
  switch (subject) {
    case "공통수학1": {
      const a = n + (standard ? 2 : 1);
      return hard
        ? { topic: "방정식과 부등식", prompt: "두 근 α, β를 갖는 이차방정식이다.", formula: `x²−${a + 2}x+${a * 2}=0`, ask: "α²+β²의 값을 구하시오.", answer: a * a + 4, hint: "(α+β)²−2αβ를 이용하세요.", explanation: [`α+β=${a + 2}, αβ=${a * 2}이다.`, `따라서 (${a + 2})²−${a * 4}=${a * a + 4}이다.`] }
        : { topic: "다항식", prompt: "다항식을 전개하려고 한다.", formula: `(x+${a})(x+2)`, ask: "x의 계수를 구하시오.", answer: a + 2, hint: "x항이 되는 곱을 모으세요.", explanation: [`전개하면 x²+${a + 2}x+${a * 2}이다.`, `따라서 x의 계수는 ${a + 2}이다.`] };
    }
    case "공통수학2": {
      const x = n + 1;
      return hard
        ? { topic: "함수", prompt: "일차함수 f를 두 번 합성한다.", formula: `f(x)=2x+${n}`, ask: `f(f(${x}))의 값을 구하시오.`, answer: 4 * x + 3 * n, hint: "먼저 안쪽 함수의 값을 구하세요.", explanation: [`f(${x})=${2 * x + n}이다.`, `f(${2 * x + n})=${4 * x + 3 * n}이다.`] }
        : { topic: "도형의 방정식", prompt: "두 점 사이의 거리를 생각한다.", formula: `A(0,0), B(${3 * n},${4 * n})`, ask: "선분 AB의 길이를 구하시오.", answer: 5 * n, hint: "거리 공식과 3-4-5 직각삼각형을 이용하세요.", explanation: [`AB=√((${3 * n})²+(${4 * n})²)이다.`, `따라서 AB=${5 * n}이다.`] };
    }
    case "대수": {
      const base = standard ? 3 : 2;
      return hard
        ? { topic: "수열", prompt: "등비수열의 첫째항과 공비가 주어졌다.", formula: `a₁=${n}, r=2`, ask: "첫째항부터 제4항까지의 합을 구하시오.", answer: n * 15, hint: "네 항은 a, 2a, 4a, 8a입니다.", explanation: [`합은 ${n}(1+2+4+8)이다.`, `따라서 ${n * 15}이다.`] }
        : { topic: "지수와 로그", prompt: "로그방정식을 푼다.", formula: `log${base}(x−1)=${n}`, ask: "x의 값을 구하시오.", answer: base ** n + 1, hint: "로그를 지수식으로 바꾸세요.", explanation: [`x−1=${base}^${n}=${base ** n}이다.`, `따라서 x=${base ** n + 1}이다.`] };
    }
    case "미적분Ⅰ": {
      const a = n + 1;
      return hard
        ? { topic: "적분", prompt: "함수의 정적분을 계산한다.", formula: `∫₀² (${a}x+1) dx`, ask: "정적분의 값을 구하시오.", answer: 2 * a + 2, hint: "각 항을 적분한 뒤 0과 2를 대입하세요.", explanation: [`부정적분은 ${a}x²/2+x이다.`, `0부터 2까지의 값은 ${2 * a + 2}이다.`] }
        : { topic: "미분", prompt: "다항함수를 미분한다.", formula: `f(x)=${a}x²+2x`, ask: "f′(2)의 값을 구하시오.", answer: 4 * a + 2, hint: "x²의 미분은 2x입니다.", explanation: [`f′(x)=${2 * a}x+2이다.`, `따라서 f′(2)=${4 * a + 2}이다.`] };
    }
    case "확률과 통계": {
      const total = n + 4;
      return hard
        ? { topic: "경우의 수", prompt: `서로 다른 학생 ${total}명 중 회장과 부회장을 한 명씩 뽑는다.`, ask: "가능한 경우의 수를 구하시오.", answer: total * (total - 1), hint: "두 역할은 서로 다르므로 순서를 구별합니다.", explanation: [`회장은 ${total}가지, 부회장은 ${total - 1}가지이다.`, `따라서 ${total * (total - 1)}가지이다.`] }
        : { topic: "확률", prompt: `주머니에 빨간 공 ${n}개와 파란 공 ${n}개가 있다. 공 한 개를 꺼낸다.`, ask: "빨간 공이 나올 확률을 백분율로 나타내시오.", answer: 50, hint: "빨간 공의 수를 전체 공의 수로 나누세요.", explanation: [`확률은 ${n}/${2 * n}=1/2이다.`, "백분율로는 50이다."] };
    }
    case "기하": {
      return hard
        ? { topic: "벡터", prompt: "두 벡터의 내적을 계산한다.", formula: `a=(${n},2), b=(3,−1)`, ask: "a·b의 값을 구하시오.", answer: 3 * n - 2, hint: "대응하는 성분의 곱을 더하세요.", explanation: [`a·b=${n}×3+2×(−1)이다.`, `따라서 ${3 * n - 2}이다.`] }
        : { topic: "이차곡선", prompt: "포물선 위의 점을 생각한다.", formula: `y²=${4 * n}x`, ask: "초점의 x좌표를 구하시오.", answer: n, hint: "y²=4px인 포물선의 초점은 (p,0)입니다.", explanation: [`4p=${4 * n}이므로 p=${n}이다.`, `초점은 (${n},0)이다.`] };
    }
    default: throw new Error("출제 과목을 확인하세요.");
  }
}

function choices(answer, seed, id) {
  const correct = Math.abs(seed * 3 + id) % 5;
  return Array.from({ length: 5 }, (_, i) => ({ id: `option-${i + 1}`, label: String(answer + i - correct) }));
}

function questions(course, difficulty = "standard", seed = 0) {
  if (!courses.includes(course)) throw new Error("출제 과목을 확인하세요.");
  if (!["basic", "standard", "advanced"].includes(difficulty)) throw new Error("난이도를 확인하세요.");
  const offset = Math.abs(Math.trunc(seed)) % subjects.length;
  return Array.from({ length: 6 }, (_, id) => {
    const subject = course === "수학 종합" ? subjects[(id + offset) % subjects.length] : course;
    const base = make(subject, 2 + (Math.abs(seed) % 3) + id, difficulty);
    const format = [0, 3, 4].includes(id) ? "short" : "choice";
    const opts = format === "choice" ? choices(base.answer, seed, id) : undefined;
    const correctChoice = opts?.find(option => Number(option.label) === base.answer)?.id;
    return { id, subject, difficulty, difficultyLabel: levelName(difficulty), points: id % 2 ? 200 : 100, format, choices: opts, correctChoice, ...base };
  });
}

function visible(question, solved = false, done = false, hinted = false) {
  const { answer, correctChoice, explanation, hint, ...safe } = question;
  return { ...safe, hint: done || solved || hinted ? hint : undefined, answer: done || solved ? answer : undefined, explanation: done || solved ? explanation : undefined };
}

function correct(question, input) {
  if (question.format === "choice") return input === question.correctChoice;
  const text = String(input ?? "").trim().replaceAll("−", "-").replaceAll("／", "/").replace(/\s/g, "");
  const parts = text.split("/");
  if (parts.length > 2 || parts.some(value => !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))) return null;
  const a = Number(parts[0]), b = parts.length === 2 ? Number(parts[1]) : 1;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return Math.abs(a / b - question.answer) <= 1e-9;
}

module.exports = { subjects, courses, questions, visible, correct };
