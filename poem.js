/* ============================================================
   文字聚散 · 李贺《苦昼短》
   效果:每个汉字是一个完整元素,平时排成诗句;
        鼠标靠近时,字被推开(散);鼠标移开,字回到原位(聚)。

   学习要点(按出现顺序):
   ① 用 JS 创建 DOM 元素(createElement / appendChild)
   ② 用 [...str] 把字符串拆成单个字符
   ③ CSS transform 做位移动画(比改 left/top 性能好)
   ④ 物理模拟:弹簧力(拉回家) + 排斥力(被鼠标推开) + 阻尼
   ⑤ 动画循环:requestAnimationFrame 每帧更新
   ============================================================ */

/* ---------- 1. 配置区:想调效果,只改这里 ---------- */
const SETTINGS = {
  lineHeight: 1.8,     // 行高倍数
  spring: 0.08,        // 弹簧力系数:拉字回"家"的力度(越大回得越快)
  repelRadius: 140,    // 鼠标影响半径(px)
  repelStrength: 6,    // 排斥力强度(越大散得越开)
  friction: 0.82,      // 阻尼:速度衰减系数(0~1,越小停得越快)
  minFontSize: 16,     // 字号下限(窗口再小也不能小于它,保证可读)
  maxFontSize: 64,     // 字号上限(窗口很大时也不用更大)
  padX: 40,            // 左右留白(px)
  padTop: 80,          // 上方留白:给顶部提示文字
  padBottom: 70,       // 下方留白:给底部返回链接
};

/* ---------- 2. 诗句 ---------- */
const LINES = [
  "飞光飞光,劝尔一杯酒。",
  "吾不识青天高,黄地厚。",
  "唯见月寒日暖,来煎人寿。",
  "食熊则肥,食蛙则瘦。",
  "神君何在?太一安有?",
  "天东有若木,下置衔烛龙。",
  "吾将斩龙足,嚼龙肉,使之朝不得回,夜不得伏。",
  "自然老者不死,少者不哭。",
  "何为服黄金、吞白玉?",
  "谁似任公子,云中骑碧驴?",
  "刘彻茂陵多滞骨,嬴政梓棺费鲍鱼。",
];

/* ---------- 3. 舞台和鼠标状态 ---------- */
const stage = document.getElementById("stage");
const mouse = { x: -9999, y: -9999, active: false };
let chars = []; // 每个字:{ el, homeX, homeY, x, y, vx, vy }

/* ---------- 4. 第一步:算出装得下的字号 ---------- */
// 思路:分别按"宽"和"高"算出一个最大字号,取较小者,保证两个方向都不溢出
function fitFontSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 最长一行有几个字(含标点)
  const maxLineChars = Math.max(...LINES.map((line) => [...line].length));

  // 水平约束:宽度减去左右留白后,每字能分到多少 px
  const sizeByWidth = (vw - SETTINGS.padX * 2) / maxLineChars;
  // 垂直约束:高度减去上下留白后,每行(含行距)能分到多少 px
  const sizeByHeight =
    (vh - SETTINGS.padTop - SETTINGS.padBottom) /
    (LINES.length * SETTINGS.lineHeight);

  // 取两者较小值,再夹在上下限之间
  return Math.max(
    SETTINGS.minFontSize,
    Math.min(SETTINGS.maxFontSize, Math.min(sizeByWidth, sizeByHeight))
  );
}

/* ---------- 5. 第二步:把每行诗拆成单个字,摆到屏幕中央 ---------- */
function build() {
  stage.innerHTML = ""; // 清空舞台(窗口大小变化时重建)
  chars = [];

  const fontSize = fitFontSize(); // 字号随窗口自适应
  const lineHeightPx = fontSize * SETTINGS.lineHeight;
  const totalHeight = LINES.length * lineHeightPx;

  // 垂直居中:在"上下留白之间"的可用区域里居中,诗文不会顶到提示文字/返回链接
  const availHeight = window.innerHeight - SETTINGS.padTop - SETTINGS.padBottom;
  const startY = SETTINGS.padTop + (availHeight - totalHeight) / 2;

  LINES.forEach((line, i) => {
    const c = [...line]; // 把一行字符串拆成单个字符数组(包括标点)
    // 水平居中:该行宽度 = 字数 × 字号(中文/全角标点都是等宽的)
    const lineWidth = c.length * fontSize;
    const startX = (window.innerWidth - lineWidth) / 2;

    c.forEach((ch, j) => {
      const el = document.createElement("span"); // 一个完整的字
      el.className = "char";
      el.textContent = ch;                       // 注意:用 textContent,不是 innerHTML
      el.style.fontSize = fontSize + "px";       // 字号也随窗口变化
      stage.appendChild(el);

      chars.push({
        el,
        homeX: startX + j * fontSize,            // "家"的 x
        homeY: startY + i * lineHeightPx,        // "家"的 y
        x: startX + j * fontSize,                // 当前 x(初始就在家)
        y: startY + i * lineHeightPx,            // 当前 y
        vx: 0,                                   // 速度
        vy: 0,
      });
    });
  });
}

/* ---------- 6. 更新所有字(核心物理:弹簧 + 排斥 + 阻尼) ---------- */
function update() {
  for (const ch of chars) {
    // ① 弹簧力:指向"家"的力,距离越远拉得越狠 —— 这是"聚"
    ch.vx += (ch.homeX - ch.x) * SETTINGS.spring;
    ch.vy += (ch.homeY - ch.y) * SETTINGS.spring;

    // ② 排斥力:鼠标靠近时,把字沿"鼠标→字"方向推开 —— 这是"散"
    if (mouse.active) {
      const dx = ch.x - mouse.x;
      const dy = ch.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SETTINGS.repelRadius && dist > 0.001) {
        // 距离越近力度越大,边缘衰减为 0
        const force = SETTINGS.repelStrength * (1 - dist / SETTINGS.repelRadius);
        ch.vx += (dx / dist) * force;
        ch.vy += (dy / dist) * force;
      }
    }

    // ③ 阻尼:速度逐渐衰减,防止越甩越猛
    ch.vx *= SETTINGS.friction;
    ch.vy *= SETTINGS.friction;

    // ④ 用速度更新位置
    ch.x += ch.vx;
    ch.y += ch.vy;

    // ⑤ 把新位置写回 DOM —— 用 transform 而不是 left/top(性能好很多)
    ch.el.style.transform = `translate(${ch.x}px, ${ch.y}px)`;
  }
}

/* ---------- 6. 夕阳跟随鼠标 ---------- */
// 夕阳在 SVG 里的"家"位置(viewBox 坐标)
const SUN_HOME = { x: 1080, y: 430 };
const SUN_SMOOTH = 0.05; // 平滑系数(0~1,越小越"拖尾")

const sun = document.getElementById("sun");
const sunPos = { ...SUN_HOME };    // 夕阳当前实际位置(viewBox 坐标)
const sunTarget = { ...SUN_HOME }; // 夕阳想去的位置(viewBox 坐标)

// 坐标系换算:鼠标坐标是 CSS 像素,夕阳在 SVG 的 viewBox 坐标系里
// SVG 用 preserveAspectRatio="xMidYMid slice" 铺满屏幕:
// 内容按比例放大(scale),多出的部分左右/上下裁掉,内容居中
function cssToViewBox(mx, my) {
  const VB_W = 1440;
  const VB_H = 900;
  const scale = Math.max(window.innerWidth / VB_W, window.innerHeight / VB_H);
  const offsetX = (window.innerWidth - VB_W * scale) / 2;
  const offsetY = (window.innerHeight - VB_H * scale) / 2;
  return {
    x: (mx - offsetX) / scale,
    y: (my - offsetY) / scale,
  };
}

function updateSun() {
  if (mouse.active) {
    // 目标 = 鼠标指针所在的 viewBox 坐标 → 夕阳中心对齐指针
    const v = cssToViewBox(mouse.x, mouse.y);
    sunTarget.x = v.x;
    sunTarget.y = v.y;
  } else {
    // 鼠标不在窗口内:夕阳缓缓回到"家"
    sunTarget.x = SUN_HOME.x;
    sunTarget.y = SUN_HOME.y;
  }
  // 平滑插值:每帧向目标靠近一小步,产生"缓缓跟随"而不是瞬间跳变
  sunPos.x += (sunTarget.x - sunPos.x) * SUN_SMOOTH;
  sunPos.y += (sunTarget.y - sunPos.y) * SUN_SMOOTH;
  // 把位置写回 SVG 的 transform(平移量 = 当前位置 - 家的位置)
  sun.setAttribute(
    "transform",
    `translate(${sunPos.x - SUN_HOME.x}, ${sunPos.y - SUN_HOME.y})`
  );
}

/* ---------- 7. 动画主循环 ---------- */
function tick() {
  update();
  updateSun();
  requestAnimationFrame(tick); // 下一帧再调用我,约 60 次/秒
}

/* ---------- 8. 窗口大小变化时重新排版 ---------- */
window.addEventListener("resize", () => build());

/* ---------- 9. 鼠标监听 ---------- */
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => {
  mouse.active = false; // 鼠标离开窗口:排斥力消失,字回家
});

/* ---------- 10. 启动 ---------- */
build();
tick();
