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

  // ---- 太阳时光轴 ----
  sunCycle: 40000,     // 太阳从左到右走完一圈的毫秒数(越大越慢)
  sunXMin: 150,        // 太阳轨迹最左(viewBox x)
  sunXMax: 1290,       // 太阳轨迹最右(viewBox x)
  sunBaseY: 640,       // 弧线基准 y(贴近地平线)
  sunArc: 200,         // 弧线拱起高度:中间高、两端低(像日行轨迹)
  sunFade: 0.07,       // 首尾淡入淡出:两端各占一圈的 7%,太阳落山后从左边重新"日出"
  lineFade: 1.0,       // 每行诗淡化窗口(行距倍数;1.0 = 窗口与行距等宽,相邻行交叉淡化无缝)
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
let chars = []; // 每个字:{ el, homeX, homeY, x, y, vx, vy, row }

/* ---- 时光轴状态 ---- */
let progress = 0;      // 太阳进度 0→1(0=最左/日升,1=最右/日落)
let holding = false;   // 鼠标是否按住(接管太阳)
let linesAlpha = [];   // 每行诗的当前透明度(随太阳位置变化)

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
  linesAlpha = LINES.map(() => 0); // 每行从透明开始

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
        row: i,                                // 属于第几行(用于随太阳显隐)
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

/* ---------- 6. 时光轴:太阳运动 + 诗句显隐 ---------- */
// 太阳在 SVG 里的"家"位置(viewBox 坐标):transform 以它为基准
const SUN_HOME = { x: 1080, y: 430 };
const SUN_SMOOTH = 0.05; // 平滑系数(0~1,越小越"拖尾")

const sun = document.getElementById("sun");
const sunPos = { ...SUN_HOME };    // 太阳当前实际位置(viewBox 坐标)
const sunTarget = { ...SUN_HOME }; // 太阳想去的位置(viewBox 坐标)

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

// 根据进度(0~1)算出太阳的目标位置:沿"左低→中高→右低"的弧线走
function sunTargetByProgress(p) {
  return {
    x: SETTINGS.sunXMin + p * (SETTINGS.sunXMax - SETTINGS.sunXMin),
    y: SETTINGS.sunBaseY - Math.sin(p * Math.PI) * SETTINGS.sunArc,
  };
}

// 每行诗的透明度:在它自己的时间窗内"渐入→保持→渐出"
// 第 i 行的中心在 p = (i+0.5)/行数;离中心越远越透明;相邻行窗口重叠 → 交叉淡化
function updateLinesOpacity() {
  const n = LINES.length;
  for (let i = 0; i < n; i++) {
    const center = (i + 0.5) / n;
    const dist = Math.abs(progress - center); // 太阳进度离该行中心有多远
    const windowSize = SETTINGS.lineFade / n; // 该行完全可见的进度范围
    // 距离超过窗口就完全透明;在窗口内按距离线性渐变到 1
    linesAlpha[i] = Math.max(0, 1 - dist / windowSize);
  }
}

function updateSun(now) {
  if (holding) {
    // ① 鼠标按住:接管太阳 —— 太阳中心对齐鼠标指针
    const v = cssToViewBox(mouse.x, mouse.y);
    sunTarget.x = v.x;
    sunTarget.y = v.y;
    // 同步进度:松开鼠标后,太阳从当前位置继续自动走(无缝衔接)
    progress = (v.x - SETTINGS.sunXMin) / (SETTINGS.sunXMax - SETTINGS.sunXMin);
  } else {
    // ② 自动模式:按当前进度算出弧线上的目标位置
    const t = sunTargetByProgress(progress);
    sunTarget.x = t.x;
    sunTarget.y = t.y;
  }
  // 平滑插值:每帧向目标靠近一小步,产生"缓缓跟随"而不是瞬间跳变
  sunPos.x += (sunTarget.x - sunPos.x) * SUN_SMOOTH;
  sunPos.y += (sunTarget.y - sunPos.y) * SUN_SMOOTH;
  // 把位置写回 SVG 的 transform(平移量 = 当前位置 - 家的位置)
  sun.setAttribute(
    "transform",
    `translate(${sunPos.x - SUN_HOME.x}, ${sunPos.y - SUN_HOME.y})`
  );

  // 首尾淡入淡出:进度接近 0(日出)或 1(日落)时太阳渐隐,
  // 这样"圈末瞬移回起点"的跳变藏在暗处,衔接自然
  const fade = SETTINGS.sunFade;
  let sunOpacity = 1;
  if (progress < fade) {
    sunOpacity = progress / fade;          // 日出:从透明渐显
  } else if (progress > 1 - fade) {
    sunOpacity = (1 - progress) / fade;    // 日落:渐隐至透明
  }
  sun.setAttribute("opacity", sunOpacity);

  // 诗句透明度跟随太阳进度
  updateLinesOpacity();
}

/* ---------- 7. 动画主循环 ---------- */
let startTime = null; // 自动模式的起点时间(用于计算进度)

function tick(now) {
  if (startTime === null) startTime = now;
  if (!holding) {
    // 只有自动模式才用真实时间推进进度(接管时进度由鼠标位置决定)
    const elapsed = now - startTime;
    progress = (elapsed / SETTINGS.sunCycle) % 1;
  }
  update();
  updateSun(now);

  // 把每行的透明度应用到它的每一个字上
  for (const ch of chars) {
    ch.el.style.opacity = linesAlpha[ch.row];
  }

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
window.addEventListener("mousedown", () => {
  holding = true; // 按住鼠标:接管太阳
});
window.addEventListener("mouseup", () => {
  if (holding) {
    holding = false;
    // 关键:把计时起点倒推到"当前进度对应的时刻",而不是清零
    // 这样松开后 elapsed 从当前进度接着算,太阳不跳变
    startTime = performance.now() - progress * SETTINGS.sunCycle;
  }
});
window.addEventListener("mouseleave", () => {
  mouse.active = false; // 鼠标离开窗口:排斥力消失,字回家
  if (holding) {
    holding = false;
    // 离开时若正接管,同样续接进度,避免太阳跳回起点
    startTime = performance.now() - progress * SETTINGS.sunCycle;
  }
});

/* ---------- 10. 启动 ---------- */
build();
// 用 requestAnimationFrame 首次调用 tick,让第一帧就拿到有效时间戳(now)
// 若直接调 tick() 不带参数,now 为 undefined → 进度变 NaN → 太阳不动
requestAnimationFrame(tick);
