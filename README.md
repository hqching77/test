# ClassReplay · 课堂重现

ClassReplay 将 PDF、PPTX、DOCX、Markdown 或纯文本课堂材料转换为一条可学习、可提问、可检测的知识路径。

上传后，系统会提取文档正文，通过服务端 AI 生成课程概览、前置知识、知识网络、逐点讲解和练习题，并提供基于当前课程内容的 AI 助教。

## 功能

- PDF、PPTX、DOCX、TXT、Markdown 文件上传
- 自动提取课程主题、学习目标和核心概念
- 可点击的知识关系网络
- 前置知识与逐知识点讲解
- 基于课程上下文的 AI 问答
- 自动生成单选题、答案解析和掌握度
- Markdown 学习笔记导出
- 浏览器本地学习历史
- 深色模式与移动端适配
- AI 不可用时自动切换本地演示模式

## 快速开始

### 1. 安装依赖

```powershell
python -m pip install -r requirements.txt
```

### 2. 配置 AI

复制 `.env.example` 为 `.env`，然后填写 API Key：

```dotenv
PARATERA_API_KEY=your-api-key
AI_BASE_URL=https://llmapi.paratera.com/v1
AI_MODEL=Qwen3.6-Flash
```

`.env` 已被 Git 忽略，请勿提交真实密钥。

### 3. 启动后端

```powershell
python main.py
```

默认地址为 `http://127.0.0.1:8000`。

### 4. 打开前端

可以直接访问 `http://127.0.0.1:8000`，也可以直接打开 `index.html` 或使用 VS Code Live Server。后两种方式会跨域调用本机 8000 端口，因此 Python 后端必须保持运行。

## 使用流程

1. 上传课程文件。
2. 等待正文提取和 AI 课程重建。
3. 浏览课程概览和前置知识。
4. 点击知识网络中的节点查看关系。
5. 逐个学习知识点，随时向 AI 助教提问。
6. 完成练习并查看答案解析与掌握度。

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/status` | 查看 AI 配置状态 |
| `POST` | `/api/extract` | 提取 PDF、PPTX、DOCX 或文本内容 |
| `POST` | `/api/analyze` | 将正文转换成结构化课程 |
| `POST` | `/api/chat` | 根据当前课程回答问题 |

AI 请求使用 Responses API，并优先要求 JSON Schema 结构化输出。对于不完整支持结构化输出的兼容模型，服务端包含自动降级、JSON 规范化和格式修复流程。

## 项目结构

```text
.
├── index.html          # 页面结构
├── styles.css         # 完整视觉与响应式样式
├── app.js             # 前端交互、图谱、练习与 API 调用
├── main.py            # 静态服务器、文档提取与 AI 网关
├── sample-course.txt  # 示例课堂材料
├── requirements.txt   # Python 依赖
├── .env.example       # 环境变量模板
└── .gitignore         # 密钥与缓存忽略规则
```

## 当前限制

- 扫描版 PDF 暂不支持 OCR，需要先转换为可选择文字的 PDF。
- 旧版 `.ppt` 不受支持，请另存为 `.pptx`。
- 音频转写尚未加入，可以后续接入 Whisper。
- 浏览器历史保存在 Local Storage，不会跨设备同步。

## 本地检查

```powershell
python -m py_compile main.py
node --check app.js
```

## 安全说明

API Key 仅由 Python 服务端从 `.env` 读取，不会发送到浏览器。服务默认只监听 `127.0.0.1`，适合本地开发和黑客松演示；公开部署前应增加身份认证、请求频率限制和严格的 CORS 白名单。
