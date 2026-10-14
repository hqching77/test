/* EE-Hackathon 项目模板站 — AI 助手
   两种调用通道：
     A) 本地代理：POST api/chat，由 server.py 代发，Key 在服务端环境变量里
     B) 浏览器直连：直接 POST {base}/chat/completions 或 /responses，Key 存在 localStorage
   进入页面时探测 A，通得过就用 A，否则退回 B。 */

(function () {
  'use strict';

  var STORE = 'ee-hackathon:ai';
  var DEFAULTS = {
    base: 'https://llmapi.paratera.com/v1',
    model: 'Qwen3.6-Flash',
    wire: 'chat',
    system: '你是 EE 黑客松的编程助手，回答简洁、给可直接运行的代码，必要时指出坑在哪里。',
    key: ''
  };

  var cfg = load();
  var history = [];      // [{role, text}]
  var controller = null; // 正在进行的请求
  var mode = 'detecting'; // detecting | proxy | direct

  var el = {
    status: document.getElementById('aiStatus'),
    hint: document.getElementById('aiHint'),
    log: document.getElementById('aiLog'),
    form: document.getElementById('aiForm'),
    input: document.getElementById('aiInput'),
    send: document.getElementById('aiSend'),
    stop: document.getElementById('aiStop'),
    reset: document.getElementById('aiReset'),
    cfgBase: document.getElementById('cfgBase'),
    cfgModel: document.getElementById('cfgModel'),
    cfgWire: document.getElementById('cfgWire'),
    cfgSystem: document.getElementById('cfgSystem'),
    cfgKey: document.getElementById('cfgKey'),
    cfgSave: document.getElementById('cfgSave'),
    cfgTest: document.getElementById('cfgTest'),
    cfgWipe: document.getElementById('cfgWipe')
  };

  if (!el.status) return; // 页面上没有 AI 区块就别跑

  /* ---------- 配置存取 ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULTS);
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {}
  }

  function fillForm() {
    el.cfgBase.value = cfg.base;
    el.cfgModel.value = cfg.model;
    el.cfgWire.value = cfg.wire;
    el.cfgSystem.value = cfg.system;
    el.cfgKey.value = cfg.key;
  }

  function readForm() {
    cfg.base = el.cfgBase.value.trim().replace(/\/+$/, '') || DEFAULTS.base;
    cfg.model = el.cfgModel.value.trim() || DEFAULTS.model;
    cfg.wire = el.cfgWire.value;
    cfg.system = el.cfgSystem.value.trim();
    cfg.key = el.cfgKey.value.trim();
  }

  /* ---------- 状态条 ---------- */

  function paintStatus() {
    if (mode === 'proxy') {
      el.status.textContent = '本地代理模式';
      el.status.className = 'badge ok';
      el.hint.textContent = '请求经 server.py 转发，Key 从环境变量读';
    } else if (mode === 'direct') {
      el.status.textContent = '浏览器直连';
      el.status.className = cfg.key ? 'badge ok' : 'badge warn';
      el.hint.textContent = cfg.key
        ? 'Key 存在浏览器本地，注意别把页面分享出去'
        : '还没填 API Key，展开「接口配置」填一下';
    } else {
      el.status.textContent = '检测中…';
      el.status.className = 'badge wait';
    }
  }

  /* ---------- 消息渲染 ---------- */

  function bubble(role) {
    var box = document.createElement('div');
    box.className = 'msg ' + role;
    var who = document.createElement('div');
    who.className = 'who';
    who.textContent = role === 'user' ? '我' : 'AI';
    var body = document.createElement('div');
    body.className = 'body';
    box.appendChild(who);
    box.appendChild(body);
    el.log.appendChild(box);
    el.log.scrollTop = el.log.scrollHeight;
    return body;
  }

  function note(text, kind) {
    var p = document.createElement('p');
    p.className = 'ai-note' + (kind ? ' ' + kind : '');
    p.textContent = text;
    el.log.appendChild(p);
    el.log.scrollTop = el.log.scrollHeight;
  }

  /* ---------- 请求体 ---------- */

  function buildPayload(text) {
    var msgs = history.map(function (m) { return { role: m.role, text: m.text }; });
    msgs.push({ role: 'user', text: text });

    if (cfg.wire === 'responses') {
      // Responses API：input 数组，文本用 input_text
      var input = msgs.map(function (m) {
        return { role: m.role, content: [{ type: m.role === 'user' ? 'input_text' : 'output_text', text: m.text }] };
      });
      var body = { model: cfg.model, input: input, stream: true };
      if (cfg.system) body.instructions = cfg.system;
      return body;
    }

    var messages = [];
    if (cfg.system) messages.push({ role: 'system', content: cfg.system });
    msgs.forEach(function (m) { messages.push({ role: m.role, content: m.text }); });
    return { model: cfg.model, messages: messages, stream: true };
  }

  /* ---------- SSE 解析 ---------- */

  // 从一帧 SSE 里取出要拼到答案上的增量文本
  function pickDelta(raw) {
    if (!raw || raw === '[DONE]') return '';
    var obj;
    try { obj = JSON.parse(raw); } catch (e) { return ''; }

    if (obj.error) throw new Error(obj.error.message || '接口返回了错误对象');

    // chat/completions
    if (obj.choices && obj.choices[0]) {
      var d = obj.choices[0].delta || {};
      if (typeof d.content === 'string') return d.content;
      return '';
    }

    // responses
    if (typeof obj.type === 'string') {
      if (obj.type === 'response.output_text.delta') return obj.delta || '';
      if (obj.type === 'response.completed') return '';
      if (obj.type === 'error' || obj.type === 'response.failed') {
        throw new Error((obj.error && obj.error.message) || '接口返回了失败事件');
      }
    }
    return '';
  }

  async function readStream(res, body) {
    var reader = res.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buf = '';

    while (true) {
      var step = await reader.read();
      if (step.done) break;
      buf += decoder.decode(step.value, { stream: true });

      // SSE 帧之间用空行分隔
      var frames = buf.split('\n\n');
      buf = frames.pop();

      for (var i = 0; i < frames.length; i++) {
        var lines = frames[i].split('\n');
        for (var j = 0; j < lines.length; j++) {
          var line = lines[j].trim();
          if (!line || line.charAt(0) === ':') continue;
          if (line.indexOf('data:') !== 0) continue;
          var payload = line.slice(5).trim();
          if (payload === '[DONE]') return;
          var piece = pickDelta(payload);
          if (piece) {
            body.textContent += piece;
            el.log.scrollTop = el.log.scrollHeight;
          }
        }
      }
    }
  }

  /* ---------- 发送 ---------- */

  function setBusy(busy) {
    el.send.disabled = busy;
    el.stop.disabled = !busy;
    el.input.disabled = busy;
  }

  async function send(text) {
    bubble('user').textContent = text;
    history.push({ role: 'user', text: text });

    var body = bubble('assistant');
    body.textContent = '';
    var got = '';
    controller = new AbortController();
    setBusy(true);

    try {
      var res;
      if (mode === 'proxy') {
        res = await fetch('api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            base_url: cfg.base,
            wire_api: cfg.wire,
            model: cfg.model,
            payload: buildPayload(text)
          })
        });
      } else {
        if (!cfg.key) throw new Error('浏览器直连模式需要先填 API Key（或改用 python server.py 启动）。');
        var path = cfg.wire === 'responses' ? '/responses' : '/chat/completions';
        res = await fetch(cfg.base + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
          signal: controller.signal,
          body: JSON.stringify(buildPayload(text))
        });
      }

      if (!res.ok) {
        var detail = await res.text();
        throw new Error('HTTP ' + res.status + '：' + detail.slice(0, 400));
      }

      var ctype = res.headers.get('content-type') || '';
      if (ctype.indexOf('text/event-stream') >= 0 && res.body && res.body.getReader) {
        await readStream(res, body);
      } else {
        // 有的网关不认 stream，直接返回整段 JSON
        var data = await res.json();
        var whole = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
          || data.output_text
          || '';
        body.textContent = whole;
      }

      got = body.textContent;
      if (!got) {
        body.textContent = '（接口没有返回文本，检查模型 ID 和接口类型）';
        body.classList.add('empty-reply');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        body.textContent += '\n\n[已停止]';
      } else {
        body.classList.add('err');
        body.textContent = '请求失败：' + err.message;
        if (mode === 'direct') {
          note('直连失败常见原因是浏览器跨域（CORS）被拦。用 python server.py 启动、让请求走本地代理即可绕开。', 'warn');
        }
      }
    } finally {
      controller = null;
      setBusy(false);
      if (got) history.push({ role: 'assistant', text: got });
      el.input.focus();
    }
  }

  /* ---------- 初始化 ---------- */

  fillForm();
  save();

  note('随便问一句试试。默认接 Paratera，模型 ID 可以在「接口配置」里换成你自己有权限的。');

  // 探测本地代理
  (async function detect() {
    try {
      var res = await fetch('api/chat', { method: 'GET' });
      var info = await res.json();
      if (info && info.ok) {
        mode = 'proxy';
        if (!info.has_env_key) {
          el.hint.textContent = '代理在线，但服务端没有 PARATERA_API_KEY 环境变量';
          el.status.className = 'badge warn';
        }
      } else {
        mode = 'direct';
      }
    } catch (e) {
      mode = 'direct';
    }
    paintStatus();
    if (mode === 'direct' && !cfg.key) {
      note('没检测到本地代理，已切到「浏览器直连」。要么展开「接口配置」填 API Key，要么用 python server.py 启动。', 'warn');
    }
  })();

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = el.input.value.trim();
    if (!text || controller) return;
    el.input.value = '';
    el.input.style.height = '';
    send(text);
  });

  el.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.form.requestSubmit ? el.form.requestSubmit() : el.form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  el.stop.addEventListener('click', function () {
    if (controller) controller.abort();
  });

  el.reset.addEventListener('click', function () {
    history = [];
    el.log.innerHTML = '';
    note('会话已清空。');
  });

  el.cfgSave.addEventListener('click', function () {
    readForm();
    save();
    paintStatus();
    note('配置已保存到浏览器本地。');
  });

  el.cfgWipe.addEventListener('click', function () {
    cfg.key = '';
    el.cfgKey.value = '';
    save();
    paintStatus();
    note('已清除浏览器里存的 API Key。');
  });

  el.cfgTest.addEventListener('click', async function () {
    readForm();
    save();
    var box = bubble('assistant');
    box.textContent = '正在测试连通性…';
    try {
      var target = mode === 'proxy'
        ? 'api/chat'
        : cfg.base + (cfg.wire === 'responses' ? '/responses' : '/chat/completions');
      var headers = { 'Content-Type': 'application/json' };
      var payload;
      if (mode === 'proxy') {
        payload = { base_url: cfg.base, wire_api: cfg.wire, model: cfg.model, ping: true };
      } else {
        headers.Authorization = 'Bearer ' + cfg.key;
        payload = { model: cfg.model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 8 };
      }
      var res = await fetch(target, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      var text = await res.text();
      box.textContent = 'HTTP ' + res.status + '\n' + text.slice(0, 800);
      if (!res.ok) box.classList.add('err');
    } catch (err) {
      box.classList.add('err');
      box.textContent = '测试失败：' + err.message;
    }
  });
})();
