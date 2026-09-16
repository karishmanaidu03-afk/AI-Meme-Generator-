/* =========================================================
   MemeLab — Frontend-only AI Meme Generator
   Models verified against Groq's current production list.
   ========================================================= */

const API_KEY_STORAGE = 'memelab_groq_key';
const HISTORY_STORAGE = 'memelab_history';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MODELS_TO_TRY = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3-8-27b',
];

const TEMPLATES = [
  { id: 'drake',      name: 'Drake Hotline Bling',  url: 'https://i.imgflip.com/30b1gx.jpg', topPos: 0.15, bottomPos: 0.85 },
  { id: 'distracted', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg', topPos: 0.08, bottomPos: 0.92 },
  { id: 'twobuttons', name: 'Two Buttons',          url: 'https://i.imgflip.com/1g8my4.jpg', topPos: 0.10, bottomPos: 0.55 },
  { id: 'brain',      name: 'Expanding Brain',      url: 'https://i.imgflip.com/1jwhww.jpg', topPos: 0.10, bottomPos: 0.90 },
  { id: 'changemind', name: 'Change My Mind',       url: 'https://i.imgflip.com/24y43o.jpg', topPos: 0.30, bottomPos: 0.55 },
  { id: 'thisisfine', name: 'This Is Fine',         url: 'https://i.imgflip.com/26am.jpg',   topPos: 0.08, bottomPos: 0.85 },
  { id: 'success',    name: 'Success Kid',          url: 'https://i.imgflip.com/1bhk.jpg',   topPos: 0.10, bottomPos: 0.90 },
  { id: 'rollsafe',   name: 'Roll Safe',            url: 'https://i.imgflip.com/1h7in3.jpg', topPos: 0.10, bottomPos: 0.85 },
  { id: 'disaster',   name: 'Disaster Girl',        url: 'https://i.imgflip.com/23ls.jpg',   topPos: 0.08, bottomPos: 0.92 },
  { id: 'spongebob',  name: 'Mocking SpongeBob',    url: 'https://i.imgflip.com/1otk96.jpg', topPos: 0.10, bottomPos: 0.90 },
];

/* ---------- DOM ---------- */
const chatArea = document.getElementById('chatArea');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const statusBadge = document.getElementById('statusBadge');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveSettings = document.getElementById('saveSettings');
const cancelSettings = document.getElementById('cancelSettings');
const clearKey = document.getElementById('clearKey');
const historyBtn = document.getElementById('historyBtn');
const historyDrawer = document.getElementById('historyDrawer');
const historyOverlay = document.getElementById('historyOverlay');
const closeHistory = document.getElementById('closeHistory');
const historyList = document.getElementById('historyList');
const toast = document.getElementById('toast');

/* ---------- API key ---------- */
function getApiKey() { return localStorage.getItem(API_KEY_STORAGE) || ''; }
function setApiKey(k) { localStorage.setItem(API_KEY_STORAGE, k); updateStatus(); }
function clearApiKey() { localStorage.removeItem(API_KEY_STORAGE); updateStatus(); }

function updateStatus() {
  const key = getApiKey();
  if (key && key.startsWith('gsk_')) {
    statusBadge.textContent = 'ready';
    statusBadge.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full badge-ok';
  } else {
    statusBadge.textContent = 'no key';
    statusBadge.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500';
  }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

/* ---------- Chat helpers ---------- */
function scrollBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function addBubble(text, type = 'ai') {
  const wrap = document.createElement('div');
  wrap.className = 'flex ' + (type === 'user' ? 'justify-end' : 'justify-start');
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (type === 'user' ? 'bubble-user' : type === 'error' ? 'bubble-error' : 'bubble-ai');
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chatArea.appendChild(wrap);
  scrollBottom();
  return bubble;
}

function addTypingBubble() {
  const wrap = document.createElement('div');
  wrap.className = 'flex justify-start';
  wrap.id = 'typingBubble';
  const bubble = document.createElement('div');
  bubble.className = 'bubble bubble-ai';
  bubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  wrap.appendChild(bubble);
  chatArea.appendChild(wrap);
  scrollBottom();
}

function removeTypingBubble() {
  const t = document.getElementById('typingBubble');
  if (t) t.remove();
}

function addMemeBubble(dataUrl, caption, prompt) {
  const wrap = document.createElement('div');
  wrap.className = 'flex justify-start';
  const bubble = document.createElement('div');
  bubble.className = 'bubble bubble-ai';

  const img = document.createElement('img');
  img.className = 'meme-img';
  img.src = dataUrl;
  img.alt = caption || 'Generated meme';

  const actions = document.createElement('div');
  actions.className = 'meme-actions';

  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'btn-action primary';
  downloadBtn.href = dataUrl;
  downloadBtn.download = 'meme-' + Date.now() + '.png';
  downloadBtn.textContent = '⬇️ Download';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-action';
  saveBtn.textContent = '💾 Save';
  saveBtn.onclick = () => {
    saveToHistory({ dataUrl, caption, prompt, date: new Date().toISOString() });
    showToast('Saved to history');
  };

  actions.appendChild(downloadBtn);
  actions.appendChild(saveBtn);
  bubble.appendChild(img);
  bubble.appendChild(actions);
  wrap.appendChild(bubble);
  chatArea.appendChild(wrap);
  scrollBottom();

  saveToHistory({ dataUrl, caption, prompt, date: new Date().toISOString() });
}

/* ---------- Groq API call ---------- */
async function askGroq(prompt, apiKey) {
  const templateList = TEMPLATES.map(t => t.id).join(', ');

  const instruction =
    'You are a meme writer. Reply with ONLY a JSON object (no markdown, no extra text).\n' +
    'Keys: response (string), template (string), top_text (string), bottom_text (string).\n' +
    'template must be one of: ' + templateList + '\n' +
    'Keep top_text and bottom_text under 6 words, UPPERCASE, funny.\n' +
    'Example: {"response":"Here you go!","template":"drake","top_text":"MONDAY MORNINGS","bottom_text":"MORE SLEEP"}';

  let lastError = 'unknown';

  for (const model of MODELS_TO_TRY) {
    console.log('Trying model:', model);

    try {
      const r = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: instruction + '\n\nCreate a meme for: ' + prompt },
          ],
          temperature: 0.9,
          max_tokens: 400,
        }),
      });

      const rawText = await r.text();

      if (!r.ok) {
        let detail = rawText;
        try {
          const parsed = JSON.parse(rawText);
          detail = parsed.error?.message || parsed.error?.failed_generation || rawText;
        } catch (e) {}
        console.warn('Model ' + model + ' failed:', detail);
        lastError = 'HTTP ' + r.status + ': ' + detail;
        continue;
      }

      let data;
      try { data = JSON.parse(rawText); }
      catch (e) { lastError = 'Non-JSON envelope'; continue; }

      console.log('Groq response from', model, ':', data);

      const choice = data.choices?.[0];
      const message = choice?.message || {};

      let content = '';
      if (typeof message.content === 'string' && message.content.trim()) {
        content = message.content.trim();
      } else if (Array.isArray(message.content)) {
        content = message.content.map(p => (typeof p === 'string' ? p : p?.text || '')).join('').trim();
      } else if (typeof message.reasoning === 'string' && message.reasoning.trim()) {
        content = message.reasoning.trim();
      }

      if (!content) {
        lastError = 'Empty content from ' + model;
        continue;
      }

      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }

      const fb = content.indexOf('{');
      const lb = content.lastIndexOf('}');
      if (fb !== -1 && lb !== -1 && lb > fb) content = content.substring(fb, lb + 1);

      let plan;
      try { plan = JSON.parse(content); }
      catch (e) { lastError = 'Invalid JSON from ' + model; continue; }

      if (!plan.template || !TEMPLATES.find(t => t.id === plan.template)) {
        plan.template = TEMPLATES[0].id;
      }
      plan.top_text = (plan.top_text || '').toString().toUpperCase().substring(0, 40);
      plan.bottom_text = (plan.bottom_text || '').toString().toUpperCase().substring(0, 40);
      plan.response = plan.response || 'Here is your meme!';

      console.log('✅ SUCCESS with model:', model);
      return plan;

    } catch (err) {
      console.warn('Model ' + model + ' threw:', err);
      lastError = err.message;
    }
  }

  throw new Error('All models failed. Last: ' + lastError);
}

/* ---------- Canvas rendering ---------- */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load template'));
    img.src = url;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderMeme(templateId, topText, bottomText) {
  const tmpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const img = await loadImage(tmpl.url);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const fontSize = Math.max(24, Math.floor(img.height * 0.09));
  ctx.font = 'bold ' + fontSize + 'px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, fontSize * 0.1);
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'white';
  const maxWidth = img.width * 0.9;

  function drawAt(text, yRatio) {
    if (!text) return;
    const lines = wrapText(ctx, text.toUpperCase(), maxWidth);
    const lh = fontSize * 1.1;
    const startY = img.height * yRatio - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      const y = startY + i * lh;
      ctx.strokeText(line, img.width / 2, y);
      ctx.fillText(line, img.width / 2, y);
    });
  }

  drawAt(topText, tmpl.topPos);
  drawAt(bottomText, tmpl.bottomPos);

  return canvas.toDataURL('image/png');
}

/* ---------- Main flow ---------- */
async function handleSend(message) {
  const apiKey = getApiKey();
  if (!apiKey) {
    addBubble(message, 'user');
    messageInput.value = '';
    addBubble('Please add your Groq API key first (top-right button).', 'error');
    openSettings();
    return;
  }

  addBubble(message, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;
  addTypingBubble();

  try {
    const plan = await askGroq(message, apiKey);
    removeTypingBubble();
    addBubble(plan.response || 'Here is your meme!', 'ai');

    addTypingBubble();
    try {
      const dataUrl = await renderMeme(plan.template, plan.top_text, plan.bottom_text);
      removeTypingBubble();
      addMemeBubble(dataUrl, plan.top_text + ' | ' + plan.bottom_text, message);
    } catch (err) {
      removeTypingBubble();
      addBubble('Meme render failed: ' + err.message, 'error');
    }
  } catch (err) {
    removeTypingBubble();
    addBubble('Something went wrong: ' + err.message, 'error');
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

/* ---------- History ---------- */
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_STORAGE) || '[]'); }
  catch (e) { return []; }
}

function saveToHistory(item) {
  const h = getHistory();
  h.unshift(item);
  if (h.length > 50) h.length = 50;
  localStorage.setItem(HISTORY_STORAGE, JSON.stringify(h));
}

function openHistory() {
  historyDrawer.classList.remove('translate-x-full');
  historyOverlay.classList.remove('hidden');
  renderHistory();
}

function closeHistoryDrawer() {
  historyDrawer.classList.add('translate-x-full');
  historyOverlay.classList.add('hidden');
}

function renderHistory() {
  const h = getHistory();
  if (h.length === 0) {
    historyList.innerHTML = '<p class="text-xs text-gray-500 text-center py-8">No memes yet.</p>';
    return;
  }
  historyList.innerHTML = '';
  h.forEach(item => {
    const div = document.createElement('div');
    div.className = 'border border-line rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition';

    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.className = 'w-full h-24 object-cover rounded mb-2';
    img.alt = item.caption || 'Meme';

    const cap = document.createElement('p');
    cap.className = 'text-xs font-medium truncate';
    cap.textContent = item.caption || item.prompt || 'Meme';

    const date = document.createElement('p');
    date.className = 'text-[10px] text-gray-500 mt-0.5';
    date.textContent = new Date(item.date).toLocaleString();

    div.appendChild(img);
    div.appendChild(cap);
    div.appendChild(date);
    div.onclick = () => {
      addBubble(item.prompt || item.caption, 'user');
      addMemeBubble(item.dataUrl, item.caption, item.prompt);
      closeHistoryDrawer();
    };
    historyList.appendChild(div);
  });
}

/* ---------- Settings ---------- */
function openSettings() {
  apiKeyInput.value = getApiKey();
  settingsOverlay.classList.remove('hidden');
}
function closeSettings() {
  settingsOverlay.classList.add('hidden');
}

/* ---------- Welcome ---------- */
function showWelcome() {
  const wrap = document.createElement('div');
  wrap.className = 'text-center py-12';
  wrap.innerHTML =
    '<div class="text-4xl mb-3">🎨</div>' +
    '<h2 class="text-xl font-semibold mb-1">Welcome to MemeLab</h2>' +
    '<p class="text-sm text-gray-500 max-w-md mx-auto mb-4">Describe a vibe, situation, or chaos. Try: <em>"programmers who hate meetings"</em>.</p>';
  chatArea.appendChild(wrap);
}

/* ---------- Event bindings ---------- */
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 128) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  handleSend(text);
});

settingsBtn.addEventListener('click', openSettings);
cancelSettings.addEventListener('click', closeSettings);
saveSettings.addEventListener('click', () => {
  const k = apiKeyInput.value.trim();
  if (!k.startsWith('gsk_')) { showToast('Key should start with gsk_'); return; }
  setApiKey(k);
  closeSettings();
  showToast('API key saved');
});
clearKey.addEventListener('click', () => {
  clearApiKey();
  apiKeyInput.value = '';
  showToast('API key cleared');
});

historyBtn.addEventListener('click', openHistory);
closeHistory.addEventListener('click', closeHistoryDrawer);
historyOverlay.addEventListener('click', closeHistoryDrawer);

/* ---------- Template grid + chips ---------- */
function renderTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  if (!grid) return;
  grid.innerHTML = '';
  TEMPLATES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.onclick = () => {
      messageInput.value = 'use the ' + t.name + ' template for: ';
      messageInput.focus();
    };
    const img = document.createElement('img');
    img.src = t.url;
    img.alt = t.name;
    img.loading = 'lazy';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = t.name;
    card.appendChild(img);
    card.appendChild(name);
    grid.appendChild(card);
  });
}

function wireSuggestionChips() {
  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      messageInput.value = btn.textContent.trim();
      messageInput.focus();
    });
  });
}

/* ---------- Init ---------- */
showWelcome();
updateStatus();
renderTemplateGrid();
wireSuggestionChips();
messageInput.focus();