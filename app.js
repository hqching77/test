/* EE-Hackathon 项目模板站 — 交互
   1) 任务板：增 / 改 / 删 / 过滤，数据存在 localStorage
   2) 进度条与统计
   3) 深浅色主题切换（记住选择）
   4) 页脚时间戳 */

(function () {
  'use strict';

  var STORE_TASKS = 'ee-hackathon:tasks';
  var STORE_THEME = 'ee-hackathon:theme';

  var SEED = [
    { text: '跑通 Git 前置检验：clone / 建分支 / push', done: true },
    { text: '给 Codex 插件接上 Paratera 算力（config.toml + 环境变量）', done: false },
    { text: '组队并确定选题，写进本页「团队」卡片', done: false },
    { text: '搭出最小可运行版本，能演示就行', done: false },
    { text: '整理一页答辩材料：问题 → 方法 → 结果', done: false }
  ];

  var tasks = load();
  var filter = 'all';

  var el = {
    form: document.getElementById('taskForm'),
    input: document.getElementById('taskInput'),
    list: document.getElementById('taskList'),
    empty: document.getElementById('emptyHint'),
    bar: document.getElementById('bar'),
    statTotal: document.getElementById('statTotal'),
    statDone: document.getElementById('statDone'),
    statLeft: document.getElementById('statLeft'),
    statPct: document.getElementById('statPct'),
    clearDone: document.getElementById('clearDone'),
    themeBtn: document.getElementById('themeBtn'),
    stamp: document.getElementById('stamp')
  };

  /* ---------- 存取 ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORE_TASKS);
      if (!raw) return SEED.slice();
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(function (t) { return t && typeof t.text === 'string'; })
          .map(function (t) { return { text: t.text, done: !!t.done }; });
      }
    } catch (e) {
      /* 数据坏了就当空的，不影响页面 */
    }
    return SEED.slice();
  }

  function save() {
    try {
      localStorage.setItem(STORE_TASKS, JSON.stringify(tasks));
    } catch (e) {
      /* 隐私模式等场景写不进去，忽略 */
    }
  }

  /* ---------- 渲染 ---------- */

  function render() {
    var done = tasks.filter(function (t) { return t.done; }).length;
    var total = tasks.length;
    var left = total - done;
    var pct = total ? Math.round((done / total) * 100) : 0;

    el.statTotal.textContent = total;
    el.statDone.textContent = done;
    el.statLeft.textContent = left;
    el.statPct.textContent = pct + '%';
    el.bar.style.width = pct + '%';

    el.list.innerHTML = '';

    var visible = tasks.filter(function (t) {
      if (filter === 'todo') return !t.done;
      if (filter === 'done') return t.done;
      return true;
    });

    visible.forEach(function (task) {
      var index = tasks.indexOf(task);

      var li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = task.done;
      box.setAttribute('aria-label', '标记完成');
      box.addEventListener('change', function () {
        tasks[index].done = box.checked;
        save();
        render();
      });

      var text = document.createElement('span');
      text.className = 'text';
      text.textContent = task.text;

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.textContent = '×';
      del.title = '删除';
      del.addEventListener('click', function () {
        tasks.splice(index, 1);
        save();
        render();
      });

      li.appendChild(box);
      li.appendChild(text);
      li.appendChild(del);
      el.list.appendChild(li);
    });

    el.empty.style.display = visible.length ? 'none' : 'block';
    el.empty.textContent = total
      ? '这个筛选下没有任务。'
      : '还没有任务，上面加一条试试。';
  }

  /* ---------- 事件 ---------- */

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = el.input.value.trim();
    if (!value) return;
    tasks.push({ text: value, done: false });
    el.input.value = '';
    save();
    render();
  });

  el.clearDone.addEventListener('click', function () {
    tasks = tasks.filter(function (t) { return !t.done; });
    save();
    render();
  });

  Array.prototype.forEach.call(document.querySelectorAll('.chip[data-filter]'), function (chip) {
    chip.addEventListener('click', function () {
      filter = chip.getAttribute('data-filter');
      Array.prototype.forEach.call(document.querySelectorAll('.chip[data-filter]'), function (c) {
        c.classList.toggle('active', c === chip);
      });
      render();
    });
  });

  /* ---------- 主题 ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(STORE_THEME); } catch (e) {}
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  el.themeBtn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(STORE_THEME, next); } catch (e) {}
  });

  /* ---------- 页脚时间 ---------- */

  el.stamp.textContent = new Date().toLocaleString('zh-CN', { hour12: false });

  render();
})();
