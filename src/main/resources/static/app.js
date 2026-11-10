const $ = (id) => document.getElementById(id);
const ROLE_RU = { SUPER_ADMIN: 'Суперадмин', ADMIN: 'Админ', TEACHER: 'Преподаватель' };
let roles = [], students = [];

async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = sessionStorage.getItem('token');
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && !url.includes('/auth/')) { logout(); throw new Error('Сессия истекла, войдите снова'); }
  if (res.status === 403) throw new Error('Недостаточно прав');
  if (!res.ok) {
    let msg = 'Ошибка ' + res.status;
    try { msg = (await res.json()).message || msg; } catch {}
    throw new Error(res.status === 401 ? 'Неверный email или пароль' : msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function button(text, cls, onClick, type = 'button') { const b = el('button', cls, text); b.type = type; b.onclick = onClick; return b; }
const has = (...r) => r.some((x) => roles.includes(x));
function toast(msg, bad) { const t = el('div', 'toast' + (bad ? ' bad' : ''), msg); $('toasts').appendChild(t); setTimeout(() => t.remove(), 3200); }
const COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#22c55e', '#8b5cf6', '#f43f5e'];
function avatar(name = '', surname = '') {
  const a = el('div', 'ava', (name[0] || '') + (surname[0] || ''));
  a.style.background = COLORS[[...(name + surname)].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
  return a;
}
function tag(role) { return el('span', 'tag t-' + role, ROLE_RU[role] || role); }

function openModal(build) {
  const ov = el('div', 'overlay'), box = el('div', 'modal');
  const close = () => { ov.remove(); document.removeEventListener('keydown', esc); };
  const esc = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', esc);
  ov.onmousedown = (e) => e.target === ov && close();
  build(box, close);
  ov.appendChild(box); $('modalRoot').appendChild(ov);
  box.querySelector('input')?.focus();
}
function field(label, value = '', type = 'text', ph = '') {
  const l = el('label', null, label), i = el('input');
  i.type = type; i.value = value; i.placeholder = ph; i.maxLength = 120; l.appendChild(i);
  return [l, i];
}
function confirmBox(text, onYes) {
  openModal((box, close) => {
    box.append(el('h2', null, 'Вы уверены?'), el('p', 'muted', text),
      el('div', 'actions'));
    box.lastChild.append(button('Отмена', 'btn-light', close), button('Удалить', 'btn-red', async () => { await onYes(); close(); }));
  });
}

document.querySelectorAll('.demo-btns button').forEach((b) => (b.onclick = () => { $('email').value = b.dataset.e; $('password').value = b.dataset.p; }));
$('loginForm').onsubmit = async (e) => {
  e.preventDefault(); $('loginErr').textContent = '';
  try {
    const r = await api('POST', '/api/v1/auth/login', { email: $('email').value.trim(), password: $('password').value });
    sessionStorage.setItem('token', r.token);
    sessionStorage.setItem('roles', JSON.stringify(r.roles.map((x) => x.replace('ROLE_', ''))));
    sessionStorage.setItem('email', $('email').value.trim());
    $('password').value = '';
    start();
  } catch (err) { $('loginErr').textContent = err.message; }
};
function logout() { sessionStorage.clear(); $('appView').classList.add('hidden'); $('loginView').classList.remove('hidden'); $('modalRoot').replaceChildren(); }
$('logout').onclick = logout;
 
function start() {
  roles = JSON.parse(sessionStorage.getItem('roles') || '[]');
  $('who').textContent = sessionStorage.getItem('email');
  $('whoRoles').replaceChildren(...roles.map(tag));
  $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
  $('tabStudents').classList.toggle('hidden', !has('ADMIN', 'TEACHER'));
  $('tabUsers').classList.toggle('hidden', !has('SUPER_ADMIN'));
  document.querySelectorAll('.adminOnly').forEach((x) => x.classList.toggle('hidden', !has('ADMIN')));
  showTab(has('ADMIN', 'TEACHER') ? 'students' : 'users');
}
function showTab(name) {
  ['students', 'users'].forEach((t) => $(t).classList.toggle('hidden', t !== name));
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  name === 'students' ? loadStudents() : loadUsers();
}
document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
 
async function loadStudents() {
  try { students = (await api('GET', '/api/v1/student')).response; renderStudents(); }
  catch (err) { toast(err.message, true); }
}
function renderStudents() {
  const q = $('search').value.trim().toLowerCase();
  const list = students.filter((s) => (s.name + ' ' + s.surname).toLowerCase().includes(q));
  $('count').textContent = students.length;
  const grid = $('studentGrid'); grid.replaceChildren();
  if (!list.length) grid.appendChild(el('div', 'empty', q ? '🔎 Никого не нашли' : 'Пока нет студентов'));
  list.forEach((s) => {
    const c = el('div', 'scard'), t = el('div');
    t.append(el('div', 'name', s.name + ' ' + s.surname), el('div', 'muted', 'ID #' + s.id));
    c.append(avatar(s.name, s.surname), t, el('div', 'arrow', '→'));
    c.onclick = () => openStudent(s.id);
    grid.appendChild(c);
  });
}
$('search').oninput = renderStudents;
 
async function openStudent(id) {
  let s;
  try { s = await api('GET', '/api/v1/student/' + Number(id)); } catch (err) { return toast(err.message, true); }
  openModal((box, close) => {
    const head = el('div', 'profile-head'), t = el('div');
    t.append(el('h2', null, s.name + ' ' + s.surname), el('div', 'muted', 'ID #' + s.id));
    head.append(avatar(s.name, s.surname), t);
    const info = el('div', 'info');
    [['📧 Email', s.email], ['📱 Телефон', s.phoneNumber]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('small', null, k), document.createTextNode(v || '—')); info.appendChild(d);
    });
    box.append(head, info);
    const act = el('div', 'actions');
    if (has('ADMIN')) {
      const [l1, email] = field('Email', s.email || '', 'email', 'student@mail.ru');
      const [l2, phone] = field('Телефон', s.phoneNumber || '', 'tel', '+7 900 000-00-00');
      box.append(l1, l2);
      act.append(
        button('Удалить', 'btn-red', () => { close(); confirmBox(`Удалить ${s.name} ${s.surname}?`, async () => {
          try { await api('DELETE', '/api/v1/student/' + s.id); toast('Студент удалён'); loadStudents(); } catch (e) { toast(e.message, true); }
        }); }),
        button('Сохранить', 'btn', async () => {
          if (email.value && !/^\S+@\S+\.\S+$/.test(email.value)) return toast('Некорректный email', true);
          try { await api('PUT', '/api/v1/student/' + s.id, { email: email.value.trim(), phoneNumber: phone.value.trim() }); toast('Сохранено'); close(); }
          catch (e) { toast(e.message, true); }
        }));
    } else act.append(button('Закрыть', 'btn-light', close));
    box.appendChild(act);
  });
}
 
$('addStudentBtn').onclick = () => openModal((box, close) => {
  const [l1, name] = field('Имя', '', 'text', 'Иван'), [l2, surname] = field('Фамилия', '', 'text', 'Петров');
  const [l3, phone] = field('Телефон', '', 'tel', '+7 900 000-00-00'), [l4, email] = field('Email', '', 'email', 'ivan@mail.ru');
  const err = el('div', 'err'), act = el('div', 'actions');
  act.append(button('Отмена', 'btn-light', close), button('Добавить', 'btn', async () => {
    if (!name.value.trim() || !surname.value.trim()) return (err.textContent = 'Имя и фамилия обязательны');
    if (email.value && !/^\S+@\S+\.\S+$/.test(email.value)) return (err.textContent = 'Некорректный email');
    try {
      await api('POST', '/api/v1/student/save', { name: name.value.trim(), surname: surname.value.trim(), phone_number: phone.value.trim(), email: email.value.trim() });
      toast('Студент добавлен'); close(); loadStudents();
    } catch (e) { err.textContent = e.message; }
  }));
  box.append(el('h2', null, 'Новый студент'), l1, l2, l3, l4, err, act);
});
 
async function loadUsers() {
  const rows = $('userRows'); rows.replaceChildren();
  try {
    (await api('GET', '/api/v1/users')).responses.forEach((u) => {
      const tr = el('tr'), rc = el('td'), ac = el('td');
      rc.append(...u.roles.map(tag)); ac.style.textAlign = 'right';
      ac.appendChild(button('Изменить', 'btn-light', () => userModal(u)));
      ac.lastChild.style.marginRight = '6px';
      if (u.email !== sessionStorage.getItem('email'))
        ac.appendChild(button('Удалить', 'btn-red', () => confirmBox('Удалить ' + u.email + '?', async () => {
          try { await api('DELETE', '/api/v1/users/' + u.id); toast('Пользователь удалён'); loadUsers(); } catch (e) { toast(e.message, true); }
        })));
      else ac.appendChild(el('span', 'muted', 'это вы'));
      tr.append(el('td', 'muted', '#' + u.id), el('td', null, u.email), rc, ac);
      rows.appendChild(tr);
    });
  } catch (err) { toast(err.message, true); }
}
 
$('addUserBtn').onclick = () => userModal(null);
function userModal(u) { openModal((box, close) => {
  const [l1, email] = field('Email', u ? u.email : '', 'email', 'teacher2@example.com'), [l2, pass] = field(u ? 'Новый пароль (необязательно)' : 'Пароль', '', 'password', 'минимум 6 символов');
  const rl = el('div', 'roles');
  Object.keys(ROLE_RU).forEach((r) => {
    const l = el('label'), i = el('input'); i.type = 'checkbox'; i.value = r; i.checked = u ? u.roles.includes(r) : r === 'TEACHER';
    l.append(i, el('span', null, ROLE_RU[r])); rl.appendChild(l);
  });
  const err = el('div', 'err'), act = el('div', 'actions');
  act.append(button('Отмена', 'btn-light', close), button(u ? 'Сохранить' : 'Создать', 'btn', async () => {
    const r = [...rl.querySelectorAll('input:checked')].map((c) => c.value);
    if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return (err.textContent = 'Некорректный email');
    if ((!u || pass.value) && pass.value.length < 6) return (err.textContent = 'Пароль минимум 6 символов');
    if (!r.length) return (err.textContent = 'Выберите хотя бы одну роль');
    const body = { email: email.value.trim(), roles: r };
    if (pass.value) body.password = pass.value;
    try {
      if (u) { await api('PUT', '/api/v1/users/' + Number(u.id), body); toast('Пользователь обновлён'); }
      else { await api('POST', '/api/v1/users/save', body); toast('Пользователь создан'); }
      close(); loadUsers();
    } catch (e) { err.textContent = e.message; }
  }));
  box.append(el('h2', null, u ? 'Редактирование' : 'Новый пользователь'), l1, l2, el('div', 'muted', 'Роли'), rl, err, act);
  rl.style.marginTop = '8px';
}); }
 
if (sessionStorage.getItem('token')) start();
