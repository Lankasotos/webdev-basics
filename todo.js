// ============================================================
// 待办清单逻辑
// 学习要点:DOM 操作、事件监听、localStorage 持久化
// ============================================================

// ---- 数据层:以数组保存待办,结构 { id, text, done } ----
const STORAGE_KEY = "webdev-basics.todos";

// 读取数据:localStorage 存的是字符串,需要 JSON.parse 还原成数组
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // 数据损坏时兜底,不让页面崩溃
    return [];
  }
}

// 保存数据:数组序列化成 JSON 字符串再存入 localStorage
function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// ---- 渲染层:把数据数组画到页面上 ----
const listEl = document.getElementById("todo-list");
const emptyTipEl = document.getElementById("empty-tip");

function render(todos) {
  listEl.innerHTML = ""; // 先清空再重建,最简单直观(小项目够用)

  // 空状态提示
  emptyTipEl.style.display = todos.length === 0 ? "block" : "none";

  for (const todo of todos) {
    // 创建 <li>,填充内容后追加到列表
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " done" : "");

    // 勾选框
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    // 文本
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text; // 用 textContent 而不是 innerHTML,避免注入

    // 删除按钮
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, span, delBtn);
    listEl.appendChild(li);
  }
}

// ---- 交互层:增 / 改 / 删,每次变更都保存并重绘 ----
let todos = loadTodos();
render(todos);

// 添加:监听表单提交(回车或点按钮都会触发)
document.getElementById("todo-form").addEventListener("submit", (event) => {
  event.preventDefault(); // 阻止表单默认的整页刷新行为
  const input = document.getElementById("todo-input");
  const text = input.value.trim(); // 去掉首尾空格
  if (!text) return; // 空内容不添加

  todos.push({ id: Date.now(), text, done: false }); // Date.now() 当临时 id
  input.value = ""; // 清空输入框
  saveTodos(todos);
  render(todos);
  input.focus(); // 焦点回到输入框,方便连续添加
});

// 切换完成状态
function toggleTodo(id) {
  todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  saveTodos(todos);
  render(todos);
}

// 删除
function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos(todos);
  render(todos);
}
