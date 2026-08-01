# 本地服务器后台常驻指南

适用环境:**Windows + Git Bash**(其他 Linux/macOS 终端写法大同小异)。
示例项目:`webdev-basics`。

## 1. 前台启动(现状,会占住终端)

```bash
cd webdev-basics
python -m http.server 8000
```

启动后终端就被这个进程占住了:能看到访问日志,但无法继续输入命令。
按 `Ctrl + C` 可以停止并恢复终端。这是最直观的方式,适合临时看效果。

## 2. 后台常驻(核心操作)

```bash
cd webdev-basics
nohup python -m http.server 8000 > server.log 2>&1 &
```

拆开看三个关键点:

| 片段 | 作用 |
| --- | --- |
| `nohup` | 终端窗口关闭时进程也不会被杀(no hang up) |
| `> server.log 2>&1` | 把标准输出和错误都写进 `server.log`,而不是刷在终端 |
| `&` | 放到后台执行,命令立即返回,终端继续可用 |

执行后终端立刻回到提示符,服务器已在后台运行,访问日志会持续写入 `server.log`。

## 3. 验证与管理

```bash
# 验证服务器真的在跑(应输出 HTTP 200)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/

# 查看后台任务列表(刚启动的服务器会显示为 %1)
jobs

# 查看访问日志
tail -f server.log        # 实时滚动;Ctrl + C 退出查看,不影响服务器

# 把后台任务拉回前台(终端又会被占用,按 Ctrl + C 即停止)
fg %1
```

## 4. 停止服务器

**同一终端内停止**(最常用):

```bash
jobs                 # 确认任务号
kill %1              # 按任务号停
```

**跨终端 / 不知道任务号时**,按 PID 停:

```bash
# 找到占用 8000 端口的进程 PID
netstat -ano | grep 8000

# 用 PID 强杀(注意 Git Bash 里斜杠要写成双斜杠)
taskkill //F //PID 12345
```

验证是否停止成功:再访问一次,连接被拒绝即说明已停止:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/   # 失败/超时
```

## 5. 注意事项

- **重启电脑后进程就没了**:后台进程只活到下次关机,重新开机后需要再执行一次第 2 步。
- **端口被占用**:换端口(如 `8001`)或先停掉旧进程。
- **开机自启 / 常驻服务**:临时学习阶段不需要;以后想长期跑服务时再了解
  pm2(Node 生态)或 nssm(Windows 服务)即可,现在不用学。
- **Node 替代方案**:如果更想用 Node,等效命令是
  `nohup npx serve . > server.log 2>&1 &`(效果相同,日志同样落在 `server.log`)。

## 速查表

| 需求 | 命令 |
| --- | --- |
| 前台启动 | `python -m http.server 8000` |
| 后台常驻 | `nohup python -m http.server 8000 > server.log 2>&1 &` |
| 验证存活 | `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/` |
| 看日志 | `tail -f server.log` |
| 停止(同终端) | `kill %1` |
| 停止(按 PID) | `netstat -ano \| grep 8000` 然后 `taskkill //F //PID <pid>` |
