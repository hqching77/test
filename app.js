const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const API_BASE = location.port === "8000" ? "" : "http://127.0.0.1:8000";
const apiFetch = (path, options) => fetch(`${API_BASE}${path}`, options);

async function readApiResponse(response){
  const raw=await response.text();
  if(response.status===405)throw new Error(`API 不接受此请求（${API_BASE||location.origin}）。请确认 python main.py 正在运行。`);
  if(!raw.trim())throw new Error(`服务器返回了空响应（HTTP ${response.status}）。请确认 Python 服务仍在运行，并重启后重试。`);
  try{return JSON.parse(raw)}catch(_){throw new Error(`服务器响应不是有效 JSON（HTTP ${response.status}）：${raw.slice(0,120)}`)}
}

const demoCourse = {
  id: "neural-network-basics",
  title: "神经网络基础",
  subject: "计算机科学",
  summary: "这节课从人工神经元出发，解释信息如何向前流动、误差如何反向传递，以及模型如何通过不断调整参数完成学习。核心主线是：预测 → 衡量误差 → 计算梯度 → 更新参数。",
  duration: "约 35 分钟",
  objectives: ["说清神经元、权重与偏置各自的作用", "理解激活函数为何让网络获得非线性表达能力", "沿着前向传播到反向传播描述一次训练", "判断学习率过大或过小时会发生什么"],
  keywords: ["神经元", "激活函数", "前向传播", "损失函数", "反向传播", "梯度下降"],
  prerequisites: [
    {name:"函数与复合函数", reason:"神经网络本质上是多层函数的复合。", detail:"函数描述输入如何映射为输出；复合函数把前一层的输出作为后一层的输入。"},
    {name:"导数与斜率", reason:"梯度依赖导数来判断参数调整方向。", detail:"导数表示输出相对输入的瞬时变化率，它告诉我们微小改变会带来多大影响。"},
    {name:"向量与矩阵", reason:"一层神经元通常以矩阵运算同时处理数据。", detail:"向量承载一组特征，矩阵乘法可以批量完成加权求和。"},
    {name:"链式法则", reason:"反向传播用它拆解多层函数的导数。", detail:"复合函数求导时，各环节的局部导数按传播路径相乘。"}
  ],
  points: [
    {id:"neuron", name:"人工神经元", definition:"接收输入，完成加权求和并通过激活函数产生输出的基础计算单元。", importance:"它是神经网络的最小构件；理解它就理解了单层网络如何计算。", example:"判断一封邮件是否为垃圾邮件时，不同关键词是输入，权重代表它们的重要程度。", misconception:"神经元不是对生物神经元的完整复制，而是一种受其启发的数学模型。"},
    {id:"activation", name:"激活函数", definition:"作用于加权结果的非线性函数，决定神经元最终输出。", importance:"没有非线性激活函数，再深的网络也只能等价于一次线性变换。", example:"ReLU 像一道门：负数被挡住变成 0，正数保持通过。", misconception:"激活函数不只是把结果限制在固定范围；ReLU 的正区间并没有上界。"},
    {id:"forward", name:"前向传播", definition:"输入从第一层开始逐层计算，最终得到模型预测的过程。", importance:"它产生预测，也是计算损失与后续训练的前提。", example:"像流水线：原料经过每一道工序，最后变成产品；每层都在变换上一层的结果。", misconception:"前向传播只负责计算预测，本身并不会更新任何参数。"},
    {id:"loss", name:"损失函数", definition:"用一个数衡量模型预测与真实答案之间差异的函数。", importance:"训练需要一个明确目标，损失值就是模型需要努力降低的指标。", example:"射箭时，箭落点与靶心之间的距离相当于损失。", misconception:"损失低不一定代表真实场景表现好，也可能是模型对训练数据过拟合。"},
    {id:"backprop", name:"反向传播", definition:"从损失出发，利用链式法则逐层计算每个参数梯度的算法。", importance:"它高效回答了“哪个参数应该改、改多少、往哪边改”。", example:"产品出错后沿流水线倒查，计算每道工序对最终误差承担多少责任。", misconception:"反向传播负责计算梯度；真正改变参数的是优化器。"},
    {id:"gradient", name:"梯度下降", definition:"沿损失增长最快方向的反方向，小步更新参数的优化方法。", importance:"它把反向传播算出的梯度转化成实际的参数更新。", example:"蒙眼下山时，用脚感受最陡的下坡方向，然后迈一小步。", misconception:"每一步最陡不保证直接到达全局最低点，学习率也会影响结果。"}
  ],
  relations: [
    {from:"neuron",to:"activation",label:"使用"},{from:"activation",to:"forward",label:"组成"},{from:"forward",to:"loss",label:"产生预测"},{from:"loss",to:"backprop",label:"提供目标"},{from:"backprop",to:"gradient",label:"输出梯度"},{from:"gradient",to:"neuron",label:"更新参数"}
  ],
  questions: [
    {q:"为什么多层神经网络通常需要非线性激活函数？", options:["加快文件读取","避免多层网络退化为线性变换","减少训练数据","自动选择学习率"], answer:1, explain:"多个线性变换复合后仍然是线性变换。激活函数引入非线性，使网络能够表达复杂关系。",point:"激活函数"},
    {q:"在一次训练中，哪一个顺序是正确的？", options:["更新参数 → 前向传播 → 计算损失","前向传播 → 计算损失 → 反向传播 → 更新参数","反向传播 → 前向传播 → 更新参数","计算损失 → 更新参数 → 前向传播"], answer:1, explain:"模型先产生预测，再衡量误差；随后计算梯度，并由优化器更新参数。",point:"前向传播"},
    {q:"反向传播最核心依赖哪个数学工具？", options:["勾股定理","贝叶斯公式","链式法则","傅里叶变换"], answer:2, explain:"网络是多层复合函数，链式法则可以把最终损失对参数的影响逐层拆开。",point:"反向传播"},
    {q:"学习率设置得过大，最可能出现什么情况？", options:["更新过猛，在最优值附近震荡甚至发散","模型一定训练更快","所有梯度变成零","训练集自动增大"], answer:0, explain:"学习率决定步长。步长过大可能跨过低点，在两侧来回震荡。",point:"梯度下降"}
  ]
};

let course = structuredClone(demoCourse), currentStep = "overview", currentPoint = 0, visited = new Set(["overview"]);
const stepInfo = {overview:["课程概览","先看清这节课的全貌"],prerequisites:["前置知识","先补好理解这节课的地基"],network:["知识网络","看见知识是怎样连接的"],learn:["知识点学习","把每一个关键概念真正弄懂"],quiz:["练习检测","用问题确认你是否真的掌握"]};

function showView(id){ $$(".view").forEach(v=>v.classList.remove("active")); $("#"+id).classList.add("active"); window.scrollTo(0,0); }
function esc(s=""){ return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function toast(text){ const t=$("#toast"); t.textContent=text;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200); }

function analyzeText(text, filename){
  if(!text || text.trim().length < 40) return structuredClone(demoCourse);
  const result=structuredClone(demoCourse); const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const title=(lines[0]||filename.replace(/\.[^.]+$/,"")).slice(0,32);
  const sentences=text.replace(/\s+/g," ").split(/[。！？.!?]/).filter(x=>x.trim().length>10);
  result.id=`local-${Date.now()}`; result.title=title; result.subject="上传课程";
  result.summary=(sentences.slice(0,3).join("。")+"。").slice(0,260);
  result.objectives=[`概括《${title}》的核心主线`,"识别材料中的关键概念及其关系","用自己的语言解释主要内容","通过练习检查理解是否完整"];
  result.points=result.points.map((p,i)=>i<Math.min(6,lines.length-1)&&lines[i+1]?.length<35?{...p,name:lines[i+1]}:p);
  result.keywords=result.points.map(p=>p.name);
  return result;
}

async function handleFile(file){
  const ext=file.name.split(".").pop().toLowerCase(); let text="";
  showView("loadingView");
  setLoadingState(8,0,`正在读取 ${file.name}`,"文件已离开首页，正在安全地发送给本地解析服务。");
  try{
    if(["txt","md"].includes(ext)) text=await file.text();
    else{
      setLoadingState(18,0,`正在提取 ${ext.toUpperCase()} 正文`,"页数越多，文字提取所需的时间越长。");
      const bytes=new Uint8Array(await file.arrayBuffer());let binary="";const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
      const extracted=await apiFetch("/api/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({extension:ext,content:btoa(binary)})});
      const result=await readApiResponse(extracted);if(!extracted.ok)throw new Error(result.error||"文档解析失败");text=result.text;
      setLoadingState(35,1,`已读取 ${result.characters} 个字符`,"AI 正在识别课程主题和关键知识点。");
    }
    if(text){
      setLoadingState(48,1,"正在分析课程结构","模型正在把材料重建成可学习的知识路径，请稍候。");
      const response=await apiFetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,filename:file.name})});
      const data=await readApiResponse(response);
      if(!response.ok) throw new Error(data.error||"AI 分析失败");
      course=data.course;
      setLoadingState(100,3,"课堂重建完成",`已使用 ${data.model} 生成学习路径。`);
    }else throw new Error("没有读取到文档内容");
  }catch(err){
    if(text){course=analyzeText(text,file.name);toast(`AI 不可用，已使用本地文本分析：${err.message}`);setLoadingState(100,3,"已完成本地分析","AI 服务暂不可用，已使用离线结果。")}
    else{toast(err.message);showView("homeView");return}
  }
  await new Promise(resolve=>setTimeout(resolve,500));
  openCourse();saveHistory(file.name);
}

function setLoadingState(percent,stage,title,hint){
  $("#loadingPercent").textContent=`${percent}%`;$("#loadingTitle").textContent=title;$("#loadingHint").textContent=hint;
  $$('#processSteps>div').forEach((el,i)=>{el.classList.toggle("active",i===stage);el.classList.toggle("done",i<stage)});
}

function runLoading(name="示例课堂"){
  showView("loadingView"); let pct=0; const titles=["正在读取课堂材料","正在识别关键知识点","正在连接概念之间的关系","正在为你生成练习"];
  return new Promise(resolve=>{const timer=setInterval(()=>{pct+=4; $("#loadingPercent").textContent=`${Math.min(pct,100)}%`;const stage=Math.min(3,Math.floor(pct/26));$("#loadingTitle").textContent=titles[stage];$$('#processSteps>div').forEach((el,i)=>{el.classList.toggle("active",i===stage);el.classList.toggle("done",i<stage)});if(pct>=100){clearInterval(timer);setTimeout(()=>{openCourse();saveHistory(name);resolve()},250)}},55)});
}

function openCourse(){ visited=new Set(["overview"]); $("#sideTitle").textContent=course.title;$("#courseTag").textContent=course.subject;$("#sideMeta").textContent=`${course.points.length} 个知识点 · ${course.questions.length} 道练习`; resetChat(); showView("workspaceView"); renderStep("overview"); }
function renderStep(step){currentStep=step;visited.add(step);$$('#stepNav button').forEach(b=>b.classList.toggle("active",b.dataset.step===step));$("#currentCrumb").textContent=stepInfo[step][0];$("#workspaceTitle").textContent=stepInfo[step][1];const progress=Math.round(visited.size/5*100);$("#progressText").textContent=progress+"%";$("#progressBar").style.width=progress+"%";({overview:renderOverview,prerequisites:renderPrereqs,network:renderNetwork,learn:renderLearn,quiz:renderQuiz}[step])();}

function renderOverview(){
  $("#contentArea").innerHTML=`<section class="hero-summary"><span class="kicker">COURSE COMPASS · 课程罗盘</span><h2>${esc(course.title)}</h2><p>${esc(course.summary)}</p></section><section class="content-section"><h3>学完这一课，你应该能够</h3><div class="objective-grid">${course.objectives.map((x,i)=>`<div class="objective"><b>0${i+1}</b><span>${esc(x)}</span></div>`).join("")}</div></section><section class="content-section"><h3>核心概念</h3><div class="keyline">${course.keywords.map(x=>`<span>${esc(x)}</span>`).join("")}</div></section>`;
}
function renderPrereqs(){
  $("#contentArea").innerHTML=`<section class="hero-summary"><span class="kicker">BEFORE WE BEGIN</span><h2>把陌生知识放在熟悉的地基上</h2><p>这些不是额外负担，而是理解本课时会反复用到的工具。点击知识点学习时也可以随时询问助教。</p></section><section class="content-section prereq-grid">${course.prerequisites.map((x,i)=>`<article class="prereq-card"><span class="num">0${i+1}</span><h3>${esc(x.name)}</h3><p><b>为什么需要：</b>${esc(x.reason)}</p><p>${esc(x.detail)}</p></article>`).join("")}</section>`;
}
function renderNetwork(){
  const positions=[[110,210],[250,95],[430,85],[600,200],[445,345],[245,350]], map=Object.fromEntries(course.points.map((p,i)=>[p.id,{...p,x:positions[i%6][0],y:positions[i%6][1]}]));
  const edges=course.relations.map(r=>{const a=map[r.from],b=map[r.to];return a&&b?`<line class="edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="edge-label" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-6}">${esc(r.label)}</text>`:""}).join("");
  const nodes=course.points.map((p,i)=>{const q=map[p.id];return `<g class="node ${i===0?'root':''}" data-index="${i}"><circle cx="${q.x}" cy="${q.y}" r="46"/><text x="${q.x}" y="${q.y+4}" text-anchor="middle">${esc(p.name.slice(0,7))}</text></g>`}).join("");
  $("#contentArea").innerHTML=`<div class="network-wrap"><svg viewBox="0 0 710 440" role="img" aria-label="课程知识网络"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa39c"/></marker></defs><g style="marker-end:url(#arrow)">${edges}</g>${nodes}</svg><div class="network-detail" id="networkDetail"><b>${esc(course.points[0].name)}</b><br>${esc(course.points[0].definition)}</div></div>`;
  $$(".node").forEach(n=>n.addEventListener("click",()=>{const p=course.points[+n.dataset.index];$$(".node").forEach(x=>x.classList.remove("selected"));n.classList.add("selected");$("#networkDetail").innerHTML=`<b>${esc(p.name)}</b><br>${esc(p.definition)} <button class="text-btn" id="learnThis">深入学习 →</button>`;$("#learnThis").onclick=()=>{currentPoint=+n.dataset.index;renderStep("learn")}}));
}
function renderLearn(){
  const p=course.points[currentPoint];$("#contentArea").innerHTML=`<div class="learn-layout"><div class="topic-list">${course.points.map((x,i)=>`<button class="${i===currentPoint?'active':''}" data-i="${i}">0${i+1} · ${esc(x.name)}</button>`).join("")}</div><article class="detail-card"><span class="eyebrow">KNOWLEDGE POINT 0${currentPoint+1}</span><h2>${esc(p.name)}</h2><p>${esc(p.definition)}</p><div class="detail-block"><h4>为什么重要</h4><p>${esc(p.importance)}</p></div><div class="detail-block"><h4>用一个例子理解</h4><div class="example-box">${esc(p.example)}</div></div><div class="detail-block"><h4>常见误区</h4><div class="misconception">${esc(p.misconception)}</div></div></article></div>`;
  $$(".topic-list button").forEach(b=>b.onclick=()=>{currentPoint=+b.dataset.i;renderLearn()});
}
function renderQuiz(){
  $("#contentArea").innerHTML=`<div id="scoreArea"></div><form id="quizForm">${course.questions.map((q,i)=>`<article class="quiz-card" data-q="${i}"><h3>${i+1}. ${esc(q.q)}</h3>${q.options.map((o,j)=>`<label class="option"><input type="radio" name="q${i}" value="${j}"><span>${String.fromCharCode(65+j)}. ${esc(o)}</span></label>`).join("")}<div class="explanation"><b>解析 · ${esc(q.point)}</b><br>${esc(q.explain)}</div></article>`).join("")}<button class="submit-quiz" type="submit">提交答案并查看解析</button></form>`;
  $("#quizForm").onsubmit=e=>{e.preventDefault();let score=0;course.questions.forEach((q,i)=>{const card=$(`.quiz-card[data-q="${i}"]`);card.classList.add("graded");const pick=$(`input[name="q${i}"]:checked`);$$('.option',card).forEach((op,j)=>{if(j===q.answer)op.classList.add("correct");else if(pick&&+pick.value===j)op.classList.add("wrong")});if(pick&&+pick.value===q.answer)score++});const pct=Math.round(score/course.questions.length*100);$("#scoreArea").innerHTML=`<div class="score-card"><span>本次掌握度</span><br><strong>${pct}%</strong><p>${pct>=80?'很棒！你已经抓住了这节课的主线。':'别急，查看解析后再回到对应知识点巩固一下。'}</p></div>`;visited.add("quiz");updateHistoryScore(pct);$("#scoreArea").scrollIntoView({behavior:"smooth"})};
}

function resetChat(){ $("#messages").innerHTML=`<div class="message bot">你好！我是这节课的 AI 助教。你可以让我解释概念、举例子，或出一道题检查理解。</div>`; }
function replyFor(text){const p=course.points.find(x=>text.includes(x.name))||course.points[currentPoint];if(/简单|白话|不懂/.test(text))return `把“${p.name}”想成这样：${p.example} 核心只有一句话——${p.definition}`;if(/例子|生活/.test(text))return `当然。${p.example} 这个例子对应的关键点是：${p.importance}`;if(/题|考/.test(text)){const q=course.questions.find(q=>q.point===p.name)||course.questions[0];return `试试看：${q.q}\n${q.options.map((x,i)=>`${String.fromCharCode(65+i)}. ${x}`).join("　")}`}if(/关系|联系/.test(text))return `“${p.name}”位于学习链条中的一个关键位置。${p.importance} 你可以回到知识网络，点击相邻节点查看前后关系。`;return `围绕“${p.name}”来回答：${p.definition} ${p.importance} 如果你愿意，我还可以换成更简单的说法或马上出题检查。`}
async function sendChat(text){
  if(!text.trim())return;const box=$("#messages");box.insertAdjacentHTML("beforeend",`<div class="message user">${esc(text)}</div><div class="message bot thinking">正在结合课程内容思考…</div>`);box.scrollTop=box.scrollHeight;
  let answer="";
  try{const response=await apiFetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({course,question:text})});const data=await readApiResponse(response);if(!response.ok)throw new Error(data.error||"AI 问答失败");answer=data.answer}
  catch(err){answer=replyFor(text)}
  $(".message.thinking",box)?.remove();box.insertAdjacentHTML("beforeend",`<div class="message bot">${esc(answer).replace(/\n/g,"<br>")}</div>`);box.scrollTop=box.scrollHeight;
}

function saveHistory(source){const history=JSON.parse(localStorage.getItem("classReplayHistory")||"[]").filter(x=>x.title!==course.title);history.unshift({title:course.title,subject:course.subject,date:new Date().toLocaleDateString("zh-CN"),score:null,source});localStorage.setItem("classReplayHistory",JSON.stringify(history.slice(0,6)));renderHistory()}
function updateHistoryScore(score){const h=JSON.parse(localStorage.getItem("classReplayHistory")||"[]");const item=h.find(x=>x.title===course.title);if(item)item.score=score;localStorage.setItem("classReplayHistory",JSON.stringify(h));toast("掌握度已保存到学习记录")}
function renderHistory(){const h=JSON.parse(localStorage.getItem("classReplayHistory")||"[]");$("#historyList").innerHTML=h.length?h.map(x=>`<article class="history-item"><strong>${esc(x.title)}</strong><span>${esc(x.subject)} · ${esc(x.date)} ${x.score!==null?`· 掌握度 ${x.score}%`:''}</span></article>`).join(""):`<div class="empty-history">还没有学习记录。体验一节示例课堂，它会出现在这里。</div>`;$$('.history-item').forEach(x=>x.onclick=()=>{course=structuredClone(demoCourse);openCourse()})}
function exportNotes(){let md=`# ${course.title}\n\n${course.summary}\n\n## 学习目标\n${course.objectives.map(x=>`- ${x}`).join("\n")}\n\n## 知识点\n`;course.points.forEach(p=>md+=`\n### ${p.name}\n${p.definition}\n\n**为什么重要：** ${p.importance}\n\n**例子：** ${p.example}\n`);const blob=new Blob([md],{type:"text/markdown;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${course.title}-学习笔记.md`;a.click();URL.revokeObjectURL(a.href);toast("学习笔记已导出")}

$("#demoBtn").onclick=()=>{course=structuredClone(demoCourse);runLoading("内置示例")};$("#dropZone").onclick=()=>$("#fileInput").click();$("#dropZone").onkeydown=e=>{if(e.key==="Enter"||e.key===" ")$("#fileInput").click()};$("#fileInput").onchange=e=>e.target.files[0]&&handleFile(e.target.files[0]);["dragenter","dragover"].forEach(x=>$("#dropZone").addEventListener(x,e=>{e.preventDefault();$("#dropZone").classList.add("dragging")}));["dragleave","drop"].forEach(x=>$("#dropZone").addEventListener(x,e=>{e.preventDefault();$("#dropZone").classList.remove("dragging")}));$("#dropZone").addEventListener("drop",e=>e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0]));
$("#stepNav").onclick=e=>{const b=e.target.closest("button[data-step]");if(b)renderStep(b.dataset.step)};$("#backBtn").onclick=$("#brandBtn").onclick=()=>{showView("homeView");renderHistory()};$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("classReplayTheme",document.body.classList.contains("dark")?"dark":"light")};$("#exportBtn").onclick=exportNotes;$("#chatForm").onsubmit=e=>{e.preventDefault();sendChat($("#chatInput").value);$("#chatInput").value=""};$("#quickPrompts").onclick=e=>{if(e.target.tagName==="BUTTON")sendChat(e.target.textContent)};$("#openTutor").onclick=()=>$("#tutorPanel").classList.add("open");$("#closeTutor").onclick=()=>$("#tutorPanel").classList.remove("open");$("#clearHistoryBtn").onclick=()=>{localStorage.removeItem("classReplayHistory");renderHistory();toast("历史记录已清除")};
if(localStorage.getItem("classReplayTheme")==="dark")document.body.classList.add("dark");renderHistory();
apiFetch("/api/status").then(readApiResponse).then(s=>{$("#aiStatus").innerHTML=s.ready?`<i></i> AI 已连接 · ${esc(s.model)}`:`<i></i> 离线演示模式`}).catch(()=>{$("#aiStatus").innerHTML="<i></i> 后端未启动 · python main.py"});
