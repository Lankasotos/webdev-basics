/* ============================================================
   文字聚散 · 李贺《苦昼短》
   效果:每个汉字是一个完整元素,平时排成诗句;
        鼠标靠近时,字被推开(散);鼠标移开,字回到原位(聚)。

   与粒子版(particle-poem.js)的区别:
   - 粒子版:把字"打碎"成上千个像素点,点做物理运动
   - 本版:每个字是完整个体,只有 138 个字,字本身做物理运动

   学习要点(按出现顺序):
   ① 用 JS 创建 DOM 元素(createElement / appendChild)
   ② 用 [...str] 把字符串拆成单个字符
   ③ CSS transform 做位移动画(比改 left/top 性能好)
   ④ 物理模拟:弹簧力(拉回家) + 排斥力(被鼠标推开) + 阻尼
   ⑤ 动画循环:requestAnimationFrame 每帧更新
   ============================================================ */

/* ---------- 1. 配置区:想调效果,只改这里 ---------- */
const SETTINGS = {
  fontSize: 40,        // 字号(px)
  lineHeight: 1.8,     // 行高倍数
  spring: 0.08,        // 弹簧力系数:拉字回"家"的力度(越大回得越快)
  repelRadius: 140,    // 鼠标影响半径(px)
  repelStrength: 6,    // 排斥力强度(越大散得越开)
  friction: 0.82,      // 阻尼:速度衰减系数(0~1,越小停得越快)
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

/* ---------- 4. 第一步:把每行诗拆成单个字,摆到屏幕中央 ---------- */
function build() {
  stage.innerHTML = ""; // 清空舞台(窗口大小变化时重建)
  chars = [];

  const lineHeightPx = SETTINGS.fontSize * SETTINGS.lineHeight;
  const totalHeight = LINES.length * lineHeightPx;

  // 垂直居中:算出第一行的起始 y
  const startY = (window.innerHeight - totalHeight) / 2;

  LINES.forEach((line, i) => {
    const c = [...line]; // 把一行字符串拆成单个字符数组(包括标点)
    // 水平居中:该行宽度 = 字数 × 字号(中文/全角标点都是等宽的)
    const lineWidth = c.length * SETTINGS.fontSize;
    const startX = (window.innerWidth - lineWidth) / 2;

    c.forEach((ch, j) => {
      const el = document.createElement("span"); // 一个完整的字
      el.className = "char";
      el.textContent = ch;                       // 注意:用 textContent,不是 innerHTML
      stage.appendChild(el);

      chars.push({
        el,
        homeX: startX + j * SETTINGS.fontSize,       // "家"的 x
        homeY: startY + i * lineHeightPx,            // "家"的 y
        x: startX + j * SETTINGS.fontSize,           // 当前 x(初始就在家)
        y: startY + i * lineHeightPx,                // 当前 y
        vx: 0,                                       // 速度
        vy: 0,
      });
    });
  });
}

/* ---------- 5. 更新所有字(核心物理,和粒子版思路一样) ---------- */
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

/* ---------- 6. 动画主循环 ---------- */
function tick() {
  update();
  requestAnimationFrame(tick); // 下一帧再调用我,约 60 次/秒
}

/* ---------- 7. 窗口大小变化时重新排版 ---------- */
window.addEventListener("resize", () => build());

/* ---------- 8. 鼠标监听 ---------- */
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => {
  mouse.active = false; // 鼠标离开窗口:排斥力消失,字回家
});

/* ---------- 9. 启动 ---------- */
build();
tick();
