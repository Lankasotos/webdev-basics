// 01-hello.js —— 你的第一个 Node.js 脚本
// 在浏览器里,JS 要靠 <script> 标签和 HTML 页面才能跑;
// 在 Node 里,一个 .js 文件直接用 node 命令就能运行。

console.log("你好,Node.js!");
console.log("这是 JavaScript,但没有浏览器,没有 HTML。");
console.log("我直接用终端跑起来了。");

// Node 独有能力:读环境信息(浏览器里做不到)
console.log("---");
console.log("当前 Node 版本:", process.version);
console.log("运行平台:", process.platform);
console.log("当前目录:", process.cwd());
