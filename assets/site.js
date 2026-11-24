'use strict';
/* ── общие помощники ── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* цены на сайте — в юанях, без пересчёта (решение руководителя 15.09.2026) */
const CNY = { bach: 12200, lang: 7200 };
const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const ml = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
$$('[data-price]').forEach((el) => { el.textContent = fmt(CNY[el.dataset.price]); });

/* Сроки маршрута. grade: 8–11, 0 — школа окончена.
   Бакалавриат: начать в сентябре, окно ноябрь – май, учёба с сентября.
   Языковой год: начать с середины января, окно март – июль, учёба с сентября. */
function routeDates(route, grade, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  let G = grade === 0 ? y : (m >= 8 ? y : y - 1) + 1 + (11 - grade);
  const win = (g) => (route === 'bach'
    ? { ws: new Date(g - 1, 10, 1), we: new Date(g, 4, 31), st: new Date(g - 1, 8, 1) }
    : { ws: new Date(g, 2, 1), we: new Date(g, 6, 31), st: new Date(g, 0, 15) });
  let w = win(G);
  while (w.we < now) { G += 1; w = win(G); }
  return {
    ...w, year: G,
    months: Math.max(0, Math.round((w.ws - now) / (30.4 * 864e5))),
    win: `${ml(w.ws)} – ${ml(w.we)}`,
    start: w.st <= now ? 'сейчас' : ml(w.st),
    entry: `сентябрь ${G}`,
  };
}

/* ── меню ── */
(() => {
  const nav = $('#nav'), burger = $('#burger');
  if (!nav) return;
  const setOpen = (v) => {
    nav.classList.toggle('is-open', v);
    burger.setAttribute('aria-expanded', String(v));
    burger.setAttribute('aria-label', v ? 'Закрыть меню' : 'Открыть меню');
  };
  burger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) || e.target.closest('.nav__links a')) setOpen(false);
  });
})();

/* ── блоки мягко появляются при прокрутке ── */
(() => {
  const els = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  els.forEach((el) => io.observe(el));
})();

/* ── вкладки «Узнаёте себя?» ── */
(() => {
  const list = $('.tabs__list');
  if (!list) return;
  const tabs = $$('[role="tab"]', list);
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => {
      select(t);
      // на узком экране ответ стоит под списком — подводим к нему
      if (innerWidth <= 900) $('#' + t.getAttribute('aria-controls')).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
})();

/* ── «До / После»: перетаскиваемая граница (вернули из версии 3) ── */
(() => {
  const ba = $('#ba');
  if (!ba) return;
  const handle = $('.ba__handle', ba);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // шторка стоит справа: видно «Учёба в России»; тянем влево — строки превращаются в «Учёба в Китае»
  let pos = 92, dragging = false, touched = false;
  const set = (v) => {
    pos = clamp(v, 2, 98);
    ba.style.setProperty('--pos', pos.toFixed(2) + '%');
    handle.setAttribute('aria-valuenow', String(Math.round(pos)));
    handle.setAttribute('aria-valuetext', pos > 80 ? 'видно: учёба в России' : pos < 20 ? 'видно: учёба в Китае' : 'видно обе части');
  };
  const touch = () => { touched = true; ba.classList.add('is-touched'); };
  set(pos);
  const fromEvent = (e) => { const r = ba.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
  ba.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; touch();
    ba.setPointerCapture(e.pointerId);
    ba.classList.add('is-drag');
    fromEvent(e);
  });
  ba.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  const end = () => { dragging = false; ba.classList.remove('is-drag'); };
  ba.addEventListener('pointerup', end);
  ba.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
    if (d !== undefined) { e.preventDefault(); touch(); set(pos + d); }
    else if (e.key === 'Home') { e.preventDefault(); touch(); set(0); }
    else if (e.key === 'End') { e.preventDefault(); touch(); set(100); }
  });
  /* подсказка: граница сама слегка качнётся при первом появлении */
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    const keys = [92, 58, 84, 92], t0 = performance.now() + 500, dur = 2200;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      if (touched) return;
      const u = clamp((now - t0) / dur, 0, 1) * 3, seg = Math.min(2, Math.floor(u));
      set(keys[seg] + (keys[seg + 1] - keys[seg]) * ease(u - seg));
      if (u < 3) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.5 });
  io.observe(ba);
})();

/* ── квиз «Подберём ваш маршрут»: 5 вопросов → маршрут → заявка ──
   Вопросы 3 и 4 — сегментация по таблице маркетинга («Шаблон - база интернет-маркетинга.xlsx»):
   типаж клиента и психотип внутри него. Менеджер получает их вместе с заявкой. */
(() => {
  const form = $('#quiz-form');
  if (!form) return;
  const steps = $$('.q', form);
  const back = $('#q-back'), restart = $('#q-restart'), bar = $('#q-bar'), count = $('.quiz__count');
  const TOTAL = 5;
  let cur = 1;

  // для менеджера: как называются типажи и психотипы в таблице маркетинга
  const SEG = {
    anxious: 'Тревожные родители',
    planner: 'Родители, которые думают заблаговременно',
    ege: 'Школьники, которые боятся ЕГЭ',
    dreamer: 'Школьники, которые мечтают учиться за границей',
    easy: 'Школьники, которые уверены, что поступить в Китай просто',
    look: 'Задумался, но не ищет активно',
  };
  const PSY = {
    facts: 'Рационал: аналитик, стратег, скептик — нужен план и факты',
    support: 'Нужна опора: гиперопека, тревожный отличник, неопределившийся',
    roi: 'Инвестор — смотрит на окупаемость',
    fast: 'Импульсивный или прокрастинатор — нужна скорость',
    dream: 'Мечтатель',
  };
  // что увидит семья: ключевые сообщения из листа «Позиционирование по сегментам»
  const SEG_MSG = {
    anxious: 'Начать можно мягко: языковой год или Foundation. Ребёнок привыкает к стране и языку, а потом поступает на бакалавриат. Менеджер ведёт каждый шаг и сообщает вам статус заявок.',
    planner: 'Выстроим стратегию заранее: экзамены, требования вузов, сильная заявка и стипендии, на которые можно подать.',
    ege: 'Вузы Китая не принимают по баллам ЕГЭ. Составим понятный план подготовки, чтобы будущее не зависело от одного экзамена.',
    dreamer: 'Превратим мечту в план: что, когда и в каком порядке. Сроки и документы держит менеджер.',
    easy: 'Чаще всего год теряют на пропущенном сроке или неполном пакете документов. Сроки и бумаги возьмём на себя, а ребёнок займётся подготовкой.',
    look: 'Начните с бесплатной консультации: расскажем, что реально под ваш класс и язык. Без обязательств.',
  };
  const PSY_MSG = {
    facts: 'На консультации покажем план по месяцам под ваш класс.',
    support: 'Менеджер отвечает на вопросы на каждом этапе, от первой консультации до заселения.',
    roi: 'На консультации разберём, сколько стоит весь путь: сопровождение, обучение и проживание в подходящих вузах, и на какие стипендии можно подать.',
    fast: 'На консультации назовём ближайший дедлайн и что сделать до него. Остальное — на менеджере.',
    dream: 'На консультации поговорим о вузах и городах, где ребёнку будет интересно учиться и жить.',
  };

  const val = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;

  function show(n, focus = true) {
    cur = n;
    steps.forEach((s) => s.classList.toggle('is-on', +s.dataset.step === n));
    const done = n > TOTAL;
    count.innerHTML = done ? 'Готово' : `Вопрос <b>${n}</b> из ${TOTAL}`;
    bar.style.width = (done ? 100 : (n / TOTAL) * 100) + '%';
    back.hidden = n === 1 || done;
    restart.hidden = !done;
    if (n === 3) { // варианты третьего вопроса зависят от того, кто заполняет
      const who = val('who');
      $$('.opt[data-for]', form).forEach((o) => {
        const off = o.dataset.for !== who;
        o.hidden = off;
        if (off) o.querySelector('input').checked = false;
      });
    }
    if (done) result();
    if (focus) {
      const t = done ? $('#r-kicker') : $(`.q[data-step="${n}"] .q__t`, form);
      t && t.focus({ preventScroll: true });
      const box = $('#quiz-box').getBoundingClientRect();
      if (box.top < 0) $('#quiz-box').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  form.addEventListener('change', (e) => {
    const q = e.target.closest('.q');
    if (!q || e.target.type !== 'radio' || +q.dataset.step > TOTAL) return;
    setTimeout(() => show(+q.dataset.step + 1), reduceMotion ? 0 : 220);
  });
  back.addEventListener('click', () => show(Math.max(1, cur - 1)));
  restart.addEventListener('click', () => { resetLead(); form.reset(); show(1); });

  let lead = {};
  function result() {
    const grade = +val('grade'), seg = val('seg'), psy = val('psy'), lang = val('lang');
    const bachDates = routeDates('bach', grade || 0);
    let route, why;
    if (lang === 'ready') {
      route = 'bach';
      why = 'Язык уже на уровне: можно сразу подаваться на бакалавриат в три вуза.';
    } else if (seg !== 'anxious' && grade && bachDates.months >= 12) {
      route = 'bach';
      why = `До окна подачи ${bachDates.months} мес.: хватает, чтобы подтянуть язык до HSK 4 или IELTS 7.0 и подаваться сразу на бакалавриат.`;
    } else {
      route = 'lang';
      why = lang === 'zero'
        ? 'Язык на входе не нужен: год учёбы в Китае, потом подача на бакалавриат.'
        : 'До подачи мало времени, чтобы выйти на HSK 4 или IELTS 7.0. Надёжнее зайти через языковой год, а через год подаваться на бакалавриат.';
      if (seg === 'anxious') why = 'Мягкий вход: год языка и адаптации в Китае, потом бакалавриат. ' + (lang === 'zero' ? 'Язык на входе не нужен.' : '');
    }
    const d = route === 'bach' ? bachDates : routeDates('lang', grade || 0);
    $('#r-title').textContent = route === 'bach' ? 'Бакалавриат' : 'Языковой год / Foundation';
    $('#r-why').textContent = why.trim();
    $('#r-price').textContent = fmt(CNY[route]) + ' ¥ за весь путь';
    $('#r-unis').textContent = route === 'bach' ? 'в 3 вуза' : 'в 1 вуз';
    $('#r-win').textContent = d.win;
    $('#r-entry').textContent = d.entry;
    $('#r-seg').textContent = SEG_MSG[seg] || '';
    $('#r-psy').textContent = PSY_MSG[psy] || '';
    lead = {
      кто: val('who') === 'parent' ? 'родитель' : 'школьник',
      класс: grade ? (grade === 9 ? '8–9' : String(grade)) : 'школа окончена',
      типаж: SEG[seg], психотип: PSY[psy],
      язык: { zero: 'с нуля', mid: 'учит, ниже HSK 4 / IELTS 7.0', ready: 'HSK 4+ / IELTS 7.0+' }[lang],
      маршрут: route === 'bach' ? 'бакалавриат' : 'языковой год',
      страница: location.pathname.split('/').pop() || 'index.html',
    };
  }

  /* ── заявка ── */
  const fields = $('#lead-fields'), ok = $('#lead-ok'), city = $('#f-city');
  const rules = {
    name: () => {
      const v = form.name.value.trim();
      if (v.length < 2) return 'Напишите имя, хотя бы две буквы';
      if (/\d/.test(v)) return 'В имени не должно быть цифр';
      return '';
    },
    contact: () => {
      const v = form.contact.value.trim();
      if (!v) return 'Оставьте телефон или ник';
      if (/^@/.test(v) || /[a-z]/i.test(v)) return /^@?[a-zA-Z0-9_]{5,32}$/.test(v) ? '' : 'Ник: от 5 символов, латиница, цифры и _';
      const dg = v.replace(/\D/g, '');
      return dg.length >= 10 && dg.length <= 15 ? '' : 'Проверьте номер: нужно 10–11 цифр';
    },
    city: () => (val('city') ? '' : 'Выберите город'),
    consent: () => (form.consent.checked ? '' : 'Нужно согласие на обработку данных'),
  };
  const target = { name: $('#f-name'), contact: $('#f-contact'), city, consent: $('#f-consent') };
  const touched = new Set();
  function check(name) {
    const msg = rules[name]();
    $('#e-' + name).textContent = msg;
    target[name].setAttribute('aria-invalid', String(!!msg));
    return !msg;
  }
  Object.keys(rules).forEach((name) => {
    const el = target[name];
    el.addEventListener('focusout', () => { if (name === 'city' && el.contains(document.activeElement)) return; touched.add(name); check(name); });
    el.addEventListener(name === 'city' || name === 'consent' ? 'change' : 'input', () => { if (touched.has(name)) check(name); });
  });
  function resetLead() {
    touched.clear();
    Object.keys(rules).forEach((n) => { $('#e-' + n).textContent = ''; target[n].removeAttribute('aria-invalid'); });
    ok.hidden = true; fields.hidden = false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cur <= TOTAL) return;
    let first = null;
    Object.keys(rules).forEach((n) => { touched.add(n); if (!check(n) && !first) first = n; });
    if (first) { (first === 'city' ? city.querySelector('input') : target[first]).focus(); return; }
    const payload = { ...lead, имя: form.name.value.trim(), контакт: form.contact.value.trim(), канал: val('channel'), город: val('city') };
    // отправка заявки подключается отдельно (план сайта, фаза 8); пока заявка лежит здесь
    window.MChinaLead = payload;
    document.dispatchEvent(new CustomEvent('mchina:lead', { detail: payload }));
    $('#lead-ok-text').textContent = `${payload.имя}, свяжемся в течение рабочего дня: ${payload.канал === 'Звонок' ? 'позвоним' : 'напишем в ' + payload.канал}.`;
    fields.hidden = true; ok.hidden = false;
    ok.focus();
  });

  show(1, false);
})();

/* ── заголовки .rw выезжают по словам (как на прошлой версии сайта) ── */
(() => {
  const hs = $$('.rw');
  hs.forEach((h) => {
    let i = 0;
    const wrapText = (node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((p) => {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--wi', i++);
        w.appendChild(s); frag.appendChild(w);
      });
      node.replaceWith(frag);
    };
    Array.from(h.childNodes).forEach((n) => {
      if (n.nodeType === 3) wrapText(n);
      else if (n.nodeType === 1) Array.from(n.childNodes).forEach((c) => c.nodeType === 3 && wrapText(c));
    });
  });
  if (reduceMotion || !('IntersectionObserver' in window)) { hs.forEach((h) => h.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.2 });
  hs.forEach((h) => io.observe(h));
})();
