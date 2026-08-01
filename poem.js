/* ============================================================
   粒子诗 · 李贺《苦昼短》
   效果:文字由大量小粒子组成;鼠标靠近,粒子被"吹散";
        鼠标移开,粒子重新聚回诗句形状。

   学习要点(按出现顺序):
   ① Canvas 基本用法(getContext、fillText、getImageData)
   ② 像素级操作:getImageData 返回 RGBA 数组,每 4 个数一个像素
   ③ 粒子系统:每个粒子有"家"坐标 + 当前坐标 + 速度
   ④ 物理模拟:弹簧力(拉回家) + 排斥力(被鼠标推开) + 阻尼
   ⑤ 动画循环:requestAnimationFrame 每帧更新并重绘
   ============================================================ */

/* ---------- 1. 配置区:想调效果,只改这里 ---------- */
const SETTINGS = {
  fontSize: 48,        // 字号(px)
  lineHeight: 1.7,     // 行高倍数
  step: 5,             // 采样步长(越小粒子越密,越大越稀)
  maxParticles: 9000,  // 粒子数量上限,防止太卡
  spring: 0.09,        // 弹簧力系数:拉粒子回"家"的力度(越大回得越快)
  repelRadius: 90,     // 鼠标影响半径(px):鼠标多近才会推开粒子
  repelStrength: 3.5,  // 排斥力强度(越大散得越开)
  friction: 0.86,      // 阻尼:速度衰减系数(0~1,越小停得越快)
  color: "#f5d76e",    // 粒子颜色(金黄色)
  dotSize: 1.8,        // 粒子直径(px)
};

/* ---------- 2. 诗句 ---------- */
// 注意:这里用反引号字符串数组,每行一句
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

/* ---------- 3. 拿到画布和画笔 ---------- */
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

// 粒子们(全局)
let particles = [];

// 鼠标状态(全局)
const mouse = { x: -9999, y: -9999, active: false };

/* ---------- 4. 第一步:把诗句"画"到一块隐藏画布 ---------- */
// 思路:先在内存里把文字画出来,再扫像素,找到"哪些像素属于文字"
function createTextCanvas(lines) {
  const off = document.createElement("canvas"); // 离屏画布(不在页面上显示)
  const octx = off.getContext("2d");

  // 先设字体,才能测量每行文字的实际宽度
  const font = `${SETTINGS.fontSize}px "STKaiti","KaiTi","Microsoft YaHei",serif`;
  octx.font = font;
  const lineHeightPx = SETTINGS.fontSize * SETTINGS.lineHeight;

  // 画布宽度 = 最长的一行;高度 = 行数 × 行高;四周留 20px 边距
  const maxWidth = Math.max(...lines.map((l) => octx.measureText(l).width));
  off.width = Math.ceil(maxWidth) + 40;
  off.height = Math.ceil(lines.length * lineHeightPx) + 40;

  // 注意:设置 width/height 会重置画布上下文,所以字体要重新设一遍
  octx.font = font;
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.fillStyle = "#ffffff"; // 白色文字,方便后面按透明度采样

  lines.forEach((line, i) => {
    const y = 20 + i * lineHeightPx + SETTINGS.fontSize / 2;
    octx.fillText(line, off.width / 2, y);
  });

  return off;
}

/* ---------- 5. 第二步:扫描像素,收集每个粒子的"家" ---------- */
function sampleHomes(off) {
  // getImageData 返回 { data } —— 一个巨大的数组
  // 每个像素占 4 个数:红、绿、蓝、透明度(0~255)
  const data = off.getContext("2d").getImageData(0, 0, off.width, off.height).data;

  // 自适应:step 越大粒子越稀。若粒子超上限,自动加大 step 重新扫
  let step = SETTINGS.step;
  let homes;
  while (true) {
    homes = [];
    // 按 step 步长扫描:不是每个像素都采样,隔几步取一个,控制粒子总数
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        // data 索引:像素在 (x,y) 时,透明度在 (y*width + x)*4 + 3
        const alpha = data[(y * off.width + x) * 4 + 3];
        if (alpha > 128) {
          homes.push({ x, y }); // 有文字的地方,存一个"家"坐标
        }
      }
    }
    if (homes.length <= SETTINGS.maxParticles || step >= 12) break;
    step += 2; // 粒子太多,加大步长再试
  }
  return homes;
}

/* ---------- 6. 第三步:让诗句居中于屏幕,生成粒子 ---------- */
function createParticles() {
  const off = createTextCanvas(LINES);
  const homes = sampleHomes(off);

  // 把离屏画布居中放到屏幕上
  // 注意:用 window.innerWidth(逻辑像素),因为画布坐标系已被 setTransform 缩放到 CSS 像素
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const offsetX = (vw - off.width) / 2;
  const offsetY = (vh - off.height) / 2;

  particles = homes.map((h) => ({
    // "家":文字形状上的目标坐标(屏幕坐标)
    homeX: h.x + offsetX,
    homeY: h.y + offsetY,
    // 当前坐标:开始时随机散落在屏幕上(所以打开页面是"散"的,然后慢慢聚拢)
    x: Math.random() * vw,
    y: Math.random() * vh,
    vx: 0, // 速度分量
    vy: 0,
  }));
}

/* ---------- 7. 更新所有粒子(核心物理) ---------- */
function updateParticles() {
  for (const p of particles) {
    // ① 弹簧力:指向"家"的力,距离越远拉得越狠 —— 这是"聚"
    p.vx += (p.homeX - p.x) * SETTINGS.spring;
    p.vy += (p.homeY - p.y) * SETTINGS.spring;

    // ② 排斥力:鼠标靠近时,把粒子沿"鼠标→粒子"方向推开 —— 这是"散"
    if (mouse.active) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SETTINGS.repelRadius && dist > 0.001) {
        // 距离越近,力度越大;边缘力度衰减为 0
        const force = SETTINGS.repelStrength * (1 - dist / SETTINGS.repelRadius);
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }

    // ③ 阻尼:每次让速度缩一点,否则粒子会越甩越猛、停不下来
    p.vx *= SETTINGS.friction;
    p.vy *= SETTINGS.friction;

    // ④ 用速度更新位置
    p.x += p.vx;
    p.y += p.vy;
  }
}

/* ---------- 8. 绘制所有粒子 ---------- */
function drawParticles() {
  // 清空画布,填背景色
  ctx.fillStyle = "#10141f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = SETTINGS.color;
  for (const p of particles) {
    // 每个粒子画一个小实心方块(比 arc 圆更快)
    ctx.fillRect(p.x, p.y, SETTINGS.dotSize, SETTINGS.dotSize);
  }
}

/* ---------- 9. 动画主循环 ---------- */
function tick() {
  updateParticles();
  drawParticles();
  // 告诉浏览器"下一帧再调用我"—— 约 60 次/秒
  requestAnimationFrame(tick);
}

/* ---------- 10. 窗口大小适配 ---------- */
function resize() {
  // 用窗口实际大小,并乘设备像素比(dpr)保证高清屏不模糊
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  // 缩放坐标系:之后所有坐标都按 CSS 像素写,不用管 dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 重新铺开粒子,诗句保持居中
  createParticles();
}
window.addEventListener("resize", resize);

/* ---------- 11. 鼠标监听 ---------- */
canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
canvas.addEventListener("mouseleave", () => {
  mouse.active = false; // 鼠标离开画布:排斥力消失,粒子回家
});

/* ---------- 12. 启动 ---------- */
resize();
tick();
