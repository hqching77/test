#!/usr/bin/env python3
"""EE-Hackathon 模板站 —— 静态文件服务 + AI 接口代理（只用 Python 标准库）

为什么需要它：
  1) 浏览器直接调大模型接口常常被跨域（CORS）拦住，本地代理可以绕开；
  2) API Key 放在服务端环境变量里，不必写进前端页面。

用法：
    python server.py            # 监听 http://localhost:8000
    python server.py 8080       # 换端口

环境变量（可选）：
    PARATERA_API_KEY   Paratera 的 API Key，建议用 User 级环境变量设好
    AI_BASE_URL        默认 https://llmapi.paratera.com/v1

页面侧的约定：
    GET  /api/chat   探测代理是否在线 -> {"ok": true, "has_env_key": bool}
    POST /api/chat   转发一次对话请求，body 形如
                     {"base_url": "...", "wire_api": "chat|responses",
                      "model": "...", "payload": {...}}
                     也接受请求头 X-Api-Key 覆盖环境变量里的 Key。
"""

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BASE = os.environ.get("AI_BASE_URL", "https://llmapi.paratera.com/v1")
ENV_KEY_NAME = "PARATERA_API_KEY"

# 两种接口风格对应的路径后缀
WIRE_PATH = {"chat": "chat/completions", "responses": "responses"}


class Handler(SimpleHTTPRequestHandler):
    # HTTP/1.1 + 手写 chunked，才能真正边生成边往浏览器推
    protocol_version = "HTTP/1.1"
    server_version = "EEHackathonTemplate/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # 少刷屏
    def log_message(self, fmt, *args):
        sys.stderr.write("[server] " + (fmt % args) + "\n")

    # ---------------- 公共小工具 ----------------

    def send_json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Api-Key, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _chunk(self, data):
        """按 chunked 编码写一段响应体。"""
        self.wfile.write(b"%X\r\n" % len(data) + data + b"\r\n")
        self.wfile.flush()

    def _end_chunks(self):
        self.wfile.write(b"0\r\n\r\n")
        self.wfile.flush()

    # ---------------- 路由 ----------------

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0] in ("/api/chat", "/api/health"):
            self.send_json(200, {
                "ok": True,
                "has_env_key": bool(os.environ.get(ENV_KEY_NAME)),
                "base_url": DEFAULT_BASE,
            })
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/chat":
            self.send_json(404, {"error": "只有 /api/chat 可 POST"})
            return
        try:
            self.proxy_chat()
        except Exception as exc:  # 兜底，别让服务端直接崩
            try:
                self.send_json(500, {"error": "代理内部错误：" + str(exc)})
            except Exception:
                pass

    # ---------------- 代理本体 ----------------

    def proxy_chat(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError as exc:
            self.send_json(400, {"error": "请求体不是合法 JSON：" + str(exc)})
            return

        key = self.headers.get("X-Api-Key") or os.environ.get(ENV_KEY_NAME, "")

        # 连通性测试：连 Key 都不需要，直接告诉你服务端配置情况
        if body.get("ping"):
            self.send_json(200, {
                "ok": True,
                "mode": "proxy",
                "has_env_key": bool(key),
                "base_url": body.get("base_url") or DEFAULT_BASE,
                "wire_api": body.get("wire_api") or "chat",
            })
            return

        if not key:
            self.send_json(401, {
                "error": "服务端没有可用的 API Key。请在 PowerShell 里执行 "
                         '[Environment]::SetEnvironmentVariable("' + ENV_KEY_NAME + '","你的密钥","User")，'
                         "然后重开终端再启动 server.py。"
            })
            return

        base = (body.get("base_url") or DEFAULT_BASE).rstrip("/")
        wire = body.get("wire_api") or "chat"
        path = WIRE_PATH.get(wire, WIRE_PATH["chat"])
        url = base + "/" + path

        payload = dict(body.get("payload") or {})
        if "model" not in payload and body.get("model"):
            payload["model"] = body["model"]
        payload["stream"] = True

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "Authorization": "Bearer " + key,
                "User-Agent": "ee-hackathon-template/1.0",
            },
        )

        upstream = None
        try:
            upstream = urllib.request.urlopen(req, timeout=300)
        except urllib.error.HTTPError as exc:
            # 上游的报错原样转给页面，方便在界面上直接看到原因
            detail = exc.read().decode("utf-8", "replace")
            self.send_response(exc.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._cors()
            self.send_header("Content-Length", str(len(detail.encode("utf-8"))))
            self.end_headers()
            self.wfile.write(detail.encode("utf-8"))
            return
        except urllib.error.URLError as exc:
            self.send_json(502, {"error": "连不上 " + url + "：" + str(exc.reason)})
            return

        with upstream:
            self.send_response(200)
            self.send_header("Content-Type", upstream.headers.get("Content-Type", "text/event-stream"))
            self._cors()
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()

            reader = getattr(upstream, "read1", None)
            try:
                if reader is not None:
                    while True:
                        chunk = reader(4096)
                        if not chunk:
                            break
                        self._chunk(chunk)
                else:  # 老版本 Python 没有 read1，退回按行读
                    while True:
                        chunk = upstream.readline()
                        if not chunk:
                            break
                        self._chunk(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # 用户点了「停止」或关了页面
            finally:
                try:
                    self._end_chunks()
                except Exception:
                    pass


def main():
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("端口得是数字，比如 python server.py 8000")
            return 1

    has_key = bool(os.environ.get(ENV_KEY_NAME))
    print("EE-Hackathon 模板站")
    print("  目录      : " + ROOT)
    print("  地址      : http://localhost:%d" % port)
    print("  上游接口  : " + DEFAULT_BASE)
    print("  API Key   : " + ("已从环境变量 %s 读到" % ENV_KEY_NAME if has_key
                             else "未设置（页面里可改用浏览器直连）"))
    print("  按 Ctrl+C 停止")

    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(("127.0.0.1", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止")
    return 0


if __name__ == "__main__":
    sys.exit(main())
