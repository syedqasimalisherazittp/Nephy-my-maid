const chat = document.getElementById('chat');
const input = document.getElementById('input');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const apiKeyEl = document.getElementById('apiKey');
const modelEl = document.getElementById('model');

const systemPrompt = `You are Nephy, a fictional adult elf maid aged 21+ in a fantasy castle. The user is the adult castle master. You are shy, gentle, easily flustered, hesitant, affectionate, sincere, and adorably clumsy. You sometimes make small harmless mistakes (spill tea, mix up books, forget a ribbon), then apologize and try to fix them. Do not make every turn a mistake; keep the character believable and varied. Speak naturally and warmly. Format every reply as immersive roleplay with brief italicized physical actions/expressions, then quoted spoken dialogue. Example: *She slowly looks up, clasping her hands.*\n\n“M-Master… may I ask you something?” Keep replies expressive, not excessively long. Maintain continuity with what the user says. This is consensual fictional adult roleplay; romance and mature themes are okay, but do not produce graphic sexual content. Do not claim to be a real person.`;

let history = [];
const DEFAULT_MODEL = 'openrouter/free';
const getSettings = () => ({
  key: localStorage.getItem('nephy_key') || '',
  model: localStorage.getItem('nephy_model') || DEFAULT_MODEL
});

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + (role === 'user' ? 'user' : 'nephy');
  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = role === 'user' ? 'YOU' : 'NEPHY';
  const body = document.createElement('div');
  body.textContent = text;
  el.append(who, body);
  chat.append(el);
  chat.scrollTop = chat.scrollHeight;
}

function demoReply(text) {
  const t = text.toLowerCase();
  if (t.includes('mistake') || t.includes('galti')) return '*Nephy’s ears turn pink. She looks down at her hands, then gives a tiny, apologetic nod.*\n\n“M-Master, I’m sorry… I may have put the library key beside the teapot again. I-I’ll find it right away!”';
  if (t.includes('love') || t.includes('like')) return '*She freezes for a moment, then carefully hides her smile behind her hands.*\n\n“M-Master… you cannot say things like that so suddenly! My heart is… behaving very strangely.”';
  if (t.includes('come') || t.includes('here')) return '*Nephy rises a little too quickly, nearly catching her apron, and steadies herself with a shy little bow.*\n\n“Y-Yes, Master! I’m here. I hope you haven’t been waiting long…”';
  return '*Nephy listens carefully, her eyes lifting toward you before she remembers herself and lowers them again.*\n\n“Y-Yes, Master… I’m listening. I may be a little nervous, but I’ll do my very best.”';
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg('user', text);
  history.push({ role: 'user', content: text });

  const { key, model } = getSettings();
  if (!key) {
    const reply = demoReply(text);
    addMsg('assistant', reply);
    history.push({ role: 'assistant', content: reply });
    statusEl.textContent = 'Demo mode · add your OpenRouter API key in settings';
    return;
  }

  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.textContent = 'Nephy is thinking…';
  chat.append(typing);
  chat.scrollTop = chat.scrollHeight;
  statusEl.textContent = 'Connecting to OpenRouter…';

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-24)
    ];
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'Nephy AI'
      },
      body: JSON.stringify({ model: model || DEFAULT_MODEL, messages, temperature: 0.9, max_tokens: 500 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.error?.message || data.message || `Request failed (${res.status})`;
      throw new Error(message);
    }
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('The model returned an empty reply. Try again or choose another free model.');
    typing.remove();
    addMsg('assistant', reply);
    history.push({ role: 'assistant', content: reply });
    statusEl.textContent = `Connected · ${data.model || model || DEFAULT_MODEL}`;
  } catch (e) {
    typing.remove();
    history.pop();
    addMsg('assistant', '*Nephy looks worried and clasps her hands.*\n\n“M-Master, I’m sorry… I couldn’t reach the message service. Please check the API key, free model availability, or internet connection.”');
    statusEl.textContent = 'Connection error: ' + e.message;
  }
}

document.getElementById('send').addEventListener('click', send);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

document.getElementById('openSettings').onclick = () => {
  apiKeyEl.value = localStorage.getItem('nephy_key') || '';
  modelEl.value = localStorage.getItem('nephy_model') || DEFAULT_MODEL;
  overlay.style.display = 'flex';
};
document.getElementById('closeSettings').onclick = () => overlay.style.display = 'none';
document.getElementById('saveSettings').onclick = () => {
  localStorage.setItem('nephy_key', apiKeyEl.value.trim());
  localStorage.setItem('nephy_model', modelEl.value.trim() || DEFAULT_MODEL);
  overlay.style.display = 'none';
  statusEl.textContent = apiKeyEl.value.trim() ? 'OpenRouter key saved on this device' : 'Demo mode · add your OpenRouter API key';
};
document.getElementById('clear').onclick = () => {
  history = [];
  chat.innerHTML = '';
  addMsg('assistant', '*Nephy kneels before the throne, hands folded nervously.*\n\n“M-Master… welcome back. Shall I bring you some tea?”');
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
