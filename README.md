# webdev-basics · 前端三件套练习

「如何开始编程」学习路线的**第一阶段产出物**:一个用纯 HTML + CSS + JavaScript 搭建的
小网站,不依赖任何框架,适合零基础到"会一点语法"的初学者对照学习。

## 页面

| 文件 | 说明 | 演示的知识点 |
| --- | --- | --- |
| `index.html` | 静态个人主页 | 语义化标签、页面结构、列表 |
| `todo.html` | 待办清单 | 表单、DOM 渲染、事件绑定 |
| `style.css` | 全站共享样式 | CSS 变量、盒模型、Flexbox、响应式 |
| `todo.js` | 待办逻辑 | 事件监听、localStorage 持久化、数组增删改 |

## 如何运行

**最简单**:直接双击 `index.html`,用浏览器打开即可(不需要服务器)。

**推荐(更接近真实开发环境)**:在项目目录起一个本地静态服务器,然后访问
`http://localhost:8000`:

```bash
# 方式一:用 Python(本机已装)
python -m http.server 8000

# 方式二:用 Node.js(本机已装)
npx serve .
```

> **想让服务器后台常驻、不占住终端?** 见 [SERVER_GUIDE.md](SERVER_GUIDE.md) ——
> 含后台启动、验证、日志查看与停止的完整速查。

> 提示:打开 `todo.html` 后添加几条待办,刷新页面——数据还在,因为存到了浏览器的
> localStorage 里。在浏览器按 `F12` → Application → Local Storage 可以看到原始数据。

## 从代码里能学到什么

- **HTML 语义化**:`header` / `nav` / `main` / `section` / `footer` 比一堆
  `<div>` 更清晰,也利于 SEO 和辅助工具。
- **CSS 变量**:`:root` 里定义一次颜色,全站复用,改主题只改一处。
- **盒模型**:`box-sizing: border-box` 让 padding 不再撑破布局。
- **Flexbox**:一行 `display: flex` 解决水平排列、居中、自动换行。
- **响应式**:`@media (max-width: 600px)` 在小屏上调整导航布局。
- **事件与 DOM**:`addEventListener`、`document.createElement`、`appendChild`。
- **数据持久化**:`localStorage` 只能存字符串,所以用 `JSON.stringify` /
  `JSON.parse` 在数组和字符串之间转换。
- **安全习惯**:插入用户输入用 `textContent` 而不是 `innerHTML`,避免 XSS。
- **防呆**:空内容不添加、`trim()` 去空格、数据损坏时兜底返回空数组。

## 下一步(后续阶段)

1. 用 Node.js 练基础语法与算法(数组/对象/字符串、循环、排序)。
2. 用 Vite + React 把这个待办清单重写成组件化版本。
3. 用 Express 给它加一个真实的增删改查后端 API 与数据库。
4. 全栈联调并部署上线。

## 练习建议

不要只看,动手改:

- 给主页加一张图片或一个联系表单;
- 给待办加上"编辑"功能或截止日期;
- 把样式换成你喜欢的配色,体会 CSS 变量改一处全站变的效果;
- 每完成一个小改动,用 Git 提交一次,养成版本管理习惯。
