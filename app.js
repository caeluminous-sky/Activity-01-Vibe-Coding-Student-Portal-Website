(() => {
  'use strict';

  const D = window.PORTAL_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;

  /* ---------- Safe localStorage wrapper ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sp:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('sp:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  /* ---------- State ---------- */
  let profile = { ...D.student, ...store.get('profile', {}) };
  let readIds = new Set(store.get('read', ['a5', 'a6', 'a7']));
  let annFilter = 'All';
  let annQuery = '';
  let scheduleMode = store.get('scheduleMode', 'week');

  /* ---------- Helpers ---------- */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const addDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  const fmtDate = (d, o) => d.toLocaleDateString('en-US', o || { month: 'short', day: 'numeric', year: 'numeric' });
  const initials = () => ((profile.firstName || '?')[0] + (profile.lastName || '')[0]).toUpperCase();
  const fullName = () => `${profile.firstName} ${profile.lastName}`.trim();
  const courseById = (id) => D.courses.find((c) => c.id === id);

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- Grade maths ---------- */
  function courseStats(c) {
    let doneW = 0, earned = 0, pendW = 0;
    c.components.forEach((k) => {
      if (k.score == null) pendW += k.weight;
      else { doneW += k.weight; earned += (k.weight * k.score) / k.max; }
    });
    return { avg: doneW ? (earned / doneW) * 100 : null, earned, doneW, pendW };
  }
  const SCALE = [[93, 'A', 4.0], [90, 'A-', 3.7], [87, 'B+', 3.3], [83, 'B', 3.0], [80, 'B-', 2.7], [77, 'C+', 2.3], [73, 'C', 2.0], [70, 'C-', 1.7], [60, 'D', 1.0], [0, 'F', 0]];
  const letter = (p) => (SCALE.find((s) => p >= s[0]) || SCALE[SCALE.length - 1]);
  function gpa() {
    let pts = 0, units = 0;
    D.courses.forEach((c) => {
      const s = courseStats(c);
      if (s.avg == null) return;
      pts += letter(s.avg)[2] * c.units; units += c.units;
    });
    return units ? pts / units : 0;
  }
  const attendancePct = () => {
    const p = D.courses.reduce((a, c) => a + c.attendance.present, 0);
    const t = D.courses.reduce((a, c) => a + c.attendance.total, 0);
    return t ? (p / t) * 100 : 0;
  };
  const totalUnits = () => D.courses.reduce((a, c) => a + c.units, 0);
  const unreadCount = () => D.announcements.filter((a) => !readIds.has(a.id)).length;
  const gradeTone = (p) => (p >= 90 ? 'ok' : p >= 80 ? '' : p >= 75 ? 'warn' : 'bad');

  /* ---------- Chrome (badges, mini profile) ---------- */
  function updateChrome() {
    const n = unreadCount();
    const badge = $('#navBadge');
    badge.textContent = n; badge.hidden = n === 0;
    $('#bellDot').hidden = n === 0;
    $('#miniProfile').innerHTML = `
      <div class="avatar">${esc(initials())}</div>
      <div><strong>${esc(fullName())}</strong><span>${esc(profile.studentId)}</span></div>`;
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard(el) {
    const now = new Date();
    const hr = now.getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const nowMin = hr * 60 + now.getMinutes();
    const dow = now.getDay();

    const today = [];
    D.courses.forEach((c) => c.meetings.forEach((m) => { if (m.day === dow) today.push({ c, m }); }));
    today.sort((a, b) => toMin(a.m.start) - toMin(b.m.start));

    const classHtml = today.length
      ? today.map(({ c, m }) => {
          const s = toMin(m.start), e = toMin(m.end);
          const state = nowMin >= e ? 'done' : nowMin >= s ? 'now' : '';
          const label = state === 'done' ? '<span class="badge">Done</span>' : state === 'now' ? '<span class="badge ok">In progress</span>' : '<span class="badge">Upcoming</span>';
          return `<li class="class-item ${state}" style="--c:${c.color}">
            <div class="class-time">${fmtTime(m.start)}<small>to ${fmtTime(m.end)}</small></div>
            <div class="class-info"><strong>${esc(c.name)}</strong><span>${icon('pin')} ${esc(c.room)} &middot; ${esc(c.instructor)}</span></div>
            ${label}</li>`;
        }).join('')
      : `<li class="empty">${dow === 0 || dow === 6 ? 'No classes on weekends. Enjoy the break!' : 'No classes scheduled today.'}</li>`;

    const deadlines = [...D.deadlines].sort((a, b) => a.dueIn - b.dueIn).map((d) => {
      const date = addDays(d.dueIn);
      const c = courseById(d.course);
      const soon = d.dueIn <= 3;
      return `<li class="deadline">
        <div class="date-chip"><b>${date.getDate()}</b><small>${fmtDate(date, { month: 'short' })}</small></div>
        <div style="flex:1;min-width:0"><strong>${esc(d.title)}</strong><span>${d.dueIn === 0 ? 'Due today' : `Due in ${d.dueIn} day${d.dueIn === 1 ? '' : 's'}`}</span></div>
        ${soon ? '<span class="badge bad">Soon</span>' : `<span class="badge" style="color:${c ? c.color : 'inherit'}">${esc(d.course)}</span>`}
      </li>`;
    }).join('');

    const recent = [...D.announcements].sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 3).map((a) => `
      <li class="deadline">
        <div class="ann-ic ${esc(a.category)}">${icon('bell')}</div>
        <div style="flex:1;min-width:0"><strong>${esc(a.title)}</strong><span>${esc(a.category)} &middot; ${a.daysAgo === 0 ? 'Today' : a.daysAgo + 'd ago'}</span></div>
        ${readIds.has(a.id) ? '' : '<i class="unread-dot" title="Unread"></i>'}
      </li>`).join('');

    const bars = D.courses.map((c) => {
      const s = courseStats(c);
      const v = s.avg == null ? 0 : s.avg;
      return `<div class="bar-row" style="--c:${c.color}"><strong>${esc(c.id)}</strong><div class="track"><div class="fill" data-w="${v.toFixed(1)}"></div></div><em>${s.avg == null ? '-' : v.toFixed(0) + '%'}</em></div>`;
    }).join('');

    const g = gpa();
    el.innerHTML = `
      <div class="hero">
        <h2>${greet}, ${esc(profile.firstName)}!</h2>
        <p>${esc(fmtDate(now, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}. You have ${today.length} class${today.length === 1 ? '' : 'es'} today and ${D.deadlines.filter((d) => d.dueIn <= 7).length} deadlines this week.</p>
        <div class="hero-chips"><span>${esc(profile.program)}</span><span>${esc(profile.yearLevel)} &middot; ${esc(profile.section)}</span><span>${esc(D.term)}</span></div>
      </div>

      <div class="grid cols-4" style="margin-bottom:20px">
        <div class="card stat"><div class="stat-ic c1">${icon('cap')}</div><div><b>${g.toFixed(2)}</b><span>Current GPA</span></div></div>
        <div class="card stat"><div class="stat-ic c2">${icon('book')}</div><div><b>${totalUnits()}</b><span>Units enrolled</span></div></div>
        <div class="card stat"><div class="stat-ic c3">${icon('check')}</div><div><b>${attendancePct().toFixed(0)}%</b><span>Attendance</span></div></div>
        <a class="card stat" href="#/announcements"><div class="stat-ic c4">${icon('bell')}</div><div><b>${unreadCount()}</b><span>Unread announcements</span></div></a>
      </div>

      <div class="grid cols-2">
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Today's classes</h2><a class="link" href="#/schedule">Full schedule</a></div><ul class="list">${classHtml}</ul></div>
          <div class="card"><div class="card-head"><h2>Grade overview</h2><a class="link" href="#/grades">Details</a></div><div class="bars">${bars}</div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Upcoming deadlines</h2></div><ul class="list">${deadlines}</ul></div>
          <div class="card"><div class="card-head"><h2>Latest announcements</h2><a class="link" href="#/announcements">View all</a></div><ul class="list">${recent}</ul></div>
        </div>
      </div>`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.fill', el).forEach((f) => { f.style.width = f.dataset.w + '%'; });
    }));
  }

  /* ---------- Schedule ---------- */
  function renderSchedule(el) {
    const START = 8, END = 19, PX = 64;
    const dow = new Date().getDay();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const legend = D.courses.map((c) => `<span style="--c:${c.color}"><i></i>${esc(c.id)}</span>`).join('');

    let body;
    if (scheduleMode === 'week') {
      const heads = [1, 2, 3, 4, 5].map((d) => `<div class="week-head ${d === dow ? 'today' : ''}">${DAYS[d].slice(0, 3)}<small>${d === dow ? 'Today' : DAYS[d]}</small></div>`).join('');
      let hours = '';
      for (let h = START; h <= END; h++) hours += `<span style="top:${(h - START) * PX}px">${fmtTime(h + ':00').replace(':00', '')}</span>`;
      const cols = [1, 2, 3, 4, 5].map((d) => {
        const evs = [];
        D.courses.forEach((c) => c.meetings.forEach((m) => {
          if (m.day !== d) return;
          const top = ((toMin(m.start) - START * 60) / 60) * PX;
          const h = ((toMin(m.end) - toMin(m.start)) / 60) * PX - 3;
          evs.push(`<div class="event" style="--c:${c.color};top:${top}px;height:${h}px" title="${esc(c.name)}"><b>${esc(c.id)}</b>${esc(c.name)}<span>${fmtTime(m.start)} - ${fmtTime(m.end)}</span><span>${esc(c.room)}</span></div>`);
        }));
        let line = '';
        if (d === dow && nowMin >= START * 60 && nowMin <= END * 60) line = `<div class="now-line" style="top:${((nowMin - START * 60) / 60) * PX}px"></div>`;
        return `<div class="day-col ${d === dow ? 'today' : ''}">${evs.join('')}${line}</div>`;
      }).join('');
      body = `<div class="card week-wrap"><div class="week" style="--h:${(END - START) * PX}px"><div class="week-head"></div>${heads}<div class="time-col">${hours}</div>${cols}</div></div>`;
    } else {
      body = [1, 2, 3, 4, 5].map((d) => {
        const items = [];
        D.courses.forEach((c) => c.meetings.forEach((m) => { if (m.day === d) items.push({ c, m }); }));
        items.sort((a, b) => toMin(a.m.start) - toMin(b.m.start));
        return `<div class="day-group"><h3>${DAYS[d]} ${d === dow ? '<span class="badge ok">Today</span>' : ''}</h3>
          <ul class="list">${items.length ? items.map(({ c, m }) => `
            <li class="class-item" style="--c:${c.color}">
              <div class="class-time">${fmtTime(m.start)}<small>to ${fmtTime(m.end)}</small></div>
              <div class="class-info"><strong>${esc(c.id)}: ${esc(c.name)}</strong><span>${icon('pin')} ${esc(c.room)} &middot; ${esc(c.instructor)}</span></div>
              <span class="badge">${c.units} units</span></li>`).join('') : '<li class="empty card">No classes</li>'}</ul></div>`;
      }).join('');
    }

    el.innerHTML = `
      <div class="toolbar">
        <div class="legend">${legend}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div class="seg" role="group" aria-label="View mode">
            <button data-mode="week" class="${scheduleMode === 'week' ? 'on' : ''}">Week</button>
            <button data-mode="list" class="${scheduleMode === 'list' ? 'on' : ''}">List</button>
          </div>
          <button class="btn" id="printBtn">Print</button>
        </div>
      </div>${body}`;

    $$('[data-mode]', el).forEach((b) => b.addEventListener('click', () => { scheduleMode = b.dataset.mode; store.set('scheduleMode', scheduleMode); renderSchedule(el); }));
    $('#printBtn', el).addEventListener('click', () => window.print());
  }

  /* ---------- Grades ---------- */
  function renderGrades(el) {
    const g = gpa();
    const overall = D.courses.reduce((a, c) => a + (courseStats(c).avg || 0), 0) / D.courses.length;
    const best = [...D.courses].sort((a, b) => (courseStats(b).avg || 0) - (courseStats(a).avg || 0))[0];
    const standing = g >= 3.7 ? 'Dean\'s Lister range' : g >= 3.0 ? 'Good standing' : g >= 2.0 ? 'Satisfactory' : 'Academic watch';

    const cards = D.courses.map((c) => {
      const s = courseStats(c);
      const L = s.avg == null ? ['-', '-'] : letter(s.avg);
      const rows = c.components.map((k) => `
        <tr><td>${esc(k.name)}</td><td>${k.weight}%</td>
        <td>${k.score == null ? '<span class="badge warn">Pending</span>' : `${k.score}/${k.max}`}</td></tr>`).join('');
      const whatIf = s.pendW > 0 ? `
        <div class="whatif" data-course="${esc(c.id)}">
          <span>To finish with</span>
          <input type="number" min="0" max="100" value="90" aria-label="Target final grade in percent"> <span>%, you need an average of</span>
          <output>-</output> <span>on the remaining work.</span>
        </div>` : '';
      return `<details class="card course-card" style="--c:${c.color}">
        <summary>
          <div class="cc-main"><strong>${esc(c.id)}: ${esc(c.name)}</strong><span>${esc(c.instructor)} &middot; ${c.units} units</span></div>
          <div class="score"><b>${s.avg == null ? '-' : s.avg.toFixed(1) + '%'}</b><span class="badge ${s.avg == null ? '' : gradeTone(s.avg)}">${L[1] === '-' ? '-' : L[0]}</span></div>
          <svg class="ic chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
        </summary>
        <div class="cc-body">
          <table><thead><tr><th>Component</th><th>Weight</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
          <p class="muted" style="margin-top:12px;font-size:13px">${s.doneW}% of the grade is complete. Attendance: ${c.attendance.present}/${c.attendance.total} sessions.</p>
          ${whatIf}
        </div>
      </details>`;
    }).join('');

    el.innerHTML = `
      <div class="grade-summary">
        <div class="card" style="display:flex;align-items:center;gap:20px">
          <div class="gauge" style="--p:${(g / 4) * 100}"><div><span><b>${g.toFixed(2)}</b><small>of 4.00</small></span></div></div>
          <div><h2 style="font-size:17px">Current GPA</h2><p class="muted">${esc(standing)}</p></div>
        </div>
        <div class="card"><p class="muted">Average across courses</p><p class="big-num" style="margin:6px 0">${overall.toFixed(1)}%</p><span class="badge ${gradeTone(overall)}">${letter(overall)[0]}</span></div>
        <div class="card"><p class="muted">Top course</p><p class="big-num" style="margin:6px 0;font-size:26px">${esc(best.id)}</p><p class="muted">${esc(best.name)} (${courseStats(best).avg.toFixed(1)}%)</p></div>
      </div>
      <div class="stack">${cards}</div>
      <p class="scale">Grades shown are based on completed components only and update when pending work is graded. Scale: A 93+, A- 90, B+ 87, B 83, B- 80, C+ 77, C 73, C- 70, D 60, F below 60.</p>`;

    $$('.whatif', el).forEach((box) => {
      const c = courseById(box.dataset.course);
      const input = $('input', box), out = $('output', box);
      const calc = () => {
        const target = parseFloat(input.value);
        const s = courseStats(c);
        if (isNaN(target)) { out.textContent = '-'; return; }
        const need = ((target - s.earned) / s.pendW) * 100;
        out.textContent = need > 100 ? 'not reachable' : need <= 0 ? 'already secured' : need.toFixed(1) + '%';
      };
      input.addEventListener('input', calc);
      calc();
    });
  }

  /* ---------- Announcements ---------- */
  function renderAnnouncements(el) {
    const cats = ['All', ...new Set(D.announcements.map((a) => a.category))];
    el.innerHTML = `
      <div class="filters">
        <label class="search">${icon('search')}<input id="annSearch" type="search" placeholder="Search announcements" value="${esc(annQuery)}" aria-label="Search announcements"></label>
        <div class="chips" id="annChips">${cats.map((c) => `<button class="chip ${c === annFilter ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <button class="btn small" id="markAll" style="margin-left:auto">Mark all as read</button>
      </div>
      <div id="annList"></div>`;

    const list = $('#annList', el);
    const draw = () => {
      const q = annQuery.trim().toLowerCase();
      const items = D.announcements
        .filter((a) => (annFilter === 'All' || a.category === annFilter) && (!q || (a.title + ' ' + a.body).toLowerCase().includes(q)))
        .sort((a, b) => a.daysAgo - b.daysAgo);
      list.innerHTML = items.length ? items.map((a) => `
        <article class="card ann" data-id="${esc(a.id)}">
          <button aria-expanded="false">
            <div class="ann-ic ${esc(a.category)}">${icon('bell')}</div>
            <div class="ann-main">
              <div class="ann-meta"><span class="badge">${esc(a.category)}</span>${a.important ? '<span class="badge bad">Important</span>' : ''}<span>${fmtDate(addDays(-a.daysAgo))}</span></div>
              <h3>${esc(a.title)} ${readIds.has(a.id) ? '' : '<i class="unread-dot" title="Unread"></i>'}</h3>
              <p class="ann-body">${esc(a.body)}</p>
            </div>
          </button>
        </article>`).join('') : '<div class="card empty">No announcements match your search.</div>';

      $$('.ann', list).forEach((card) => {
        const btn = $('button', card);
        btn.addEventListener('click', () => {
          const open = card.classList.toggle('open');
          btn.setAttribute('aria-expanded', open);
          const id = card.dataset.id;
          if (open && !readIds.has(id)) {
            readIds.add(id); store.set('read', [...readIds]);
            const dot = $('.unread-dot', card); if (dot) dot.remove();
            updateChrome();
          }
        });
      });
    };
    draw();

    $('#annSearch', el).addEventListener('input', (e) => { annQuery = e.target.value; draw(); });
    $('#annChips', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      annFilter = b.dataset.cat;
      $$('.chip', el).forEach((c) => c.classList.toggle('on', c === b));
      draw();
    });
    $('#markAll', el).addEventListener('click', () => {
      D.announcements.forEach((a) => readIds.add(a.id));
      store.set('read', [...readIds]);
      updateChrome(); draw(); toast('All announcements marked as read');
    });
  }

  /* ---------- Profile ---------- */
  function renderProfile(el) {
    const age = (() => {
      if (!profile.birthdate) return '-';
      const b = new Date(profile.birthdate), n = new Date();
      let a = n.getFullYear() - b.getFullYear();
      if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
      return isNaN(a) ? '-' : a;
    })();

    const field = (id, label, type = 'text', ro = false) => `
      <div class="field"><label for="f-${id}">${label}</label>
        <input id="f-${id}" name="${id}" type="${type}" value="${esc(profile[id])}" ${ro ? 'readonly' : ''} autocomplete="off">
        <span class="err" data-err="${id}"></span></div>`;

    el.innerHTML = `
      <div class="profile-grid">
        <div class="card id-card">
          <div class="avatar xl">${esc(initials())}</div>
          <h2>${esc(fullName())}</h2>
          <p class="sub">${esc(profile.program)}</p>
          <span class="badge ok">${esc(profile.status)} student</span>
          <dl class="facts">
            <div><dt>Student ID</dt><dd>${esc(profile.studentId)}</dd></div>
            <div><dt>Year &amp; section</dt><dd>${esc(profile.yearLevel)}, ${esc(profile.section)}</dd></div>
            <div><dt>Adviser</dt><dd>${esc(profile.advisor)}</dd></div>
            <div><dt>Age</dt><dd>${age}</dd></div>
            <div><dt>GPA</dt><dd>${gpa().toFixed(2)}</dd></div>
          </dl>
        </div>

        <form class="card" id="profileForm" novalidate>
          <div class="card-head"><h2>Personal information</h2></div>
          <div class="row">${field('firstName', 'First name')}${field('lastName', 'Last name')}</div>
          <div class="row">${field('email', 'Email', 'email')}${field('phone', 'Phone', 'tel')}</div>
          <div class="row">${field('birthdate', 'Date of birth', 'date')}${field('address', 'Home address')}</div>
          <p class="section-title">Emergency contact</p>
          <div class="row">${field('guardian', 'Name')}${field('guardianPhone', 'Phone', 'tel')}</div>
          <p class="section-title">Academic (managed by the registrar)</p>
          <div class="row">${field('studentId', 'Student ID', 'text', true)}${field('program', 'Program', 'text', true)}</div>
          <div class="row">${field('yearLevel', 'Year level', 'text', true)}${field('advisor', 'Adviser', 'text', true)}</div>
          <div class="form-actions">
            <button type="submit" class="btn primary">Save changes</button>
            <button type="button" class="btn" id="resetBtn">Reset to defaults</button>
          </div>
        </form>
      </div>`;

    const form = $('#profileForm', el);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form).entries());
      const errs = {};
      if (!v.firstName.trim()) errs.firstName = 'First name is required.';
      if (!v.lastName.trim()) errs.lastName = 'Last name is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errs.email = 'Enter a valid email address.';
      if (v.phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone number.';
      if (v.guardianPhone && v.guardianPhone.replace(/\D/g, '').length < 7) errs.guardianPhone = 'Enter a valid phone number.';
      $$('[data-err]', form).forEach((s) => { s.textContent = errs[s.dataset.err] || ''; });
      if (Object.keys(errs).length) { toast('Please fix the highlighted fields'); return; }

      ['firstName', 'lastName', 'email', 'phone', 'birthdate', 'address', 'guardian', 'guardianPhone'].forEach((k) => { profile[k] = v[k].trim(); });
      const overrides = {};
      ['firstName', 'lastName', 'email', 'phone', 'birthdate', 'address', 'guardian', 'guardianPhone'].forEach((k) => { overrides[k] = profile[k]; });
      store.set('profile', overrides);
      updateChrome(); renderProfile(el); toast('Profile saved');
    });
    $('#resetBtn', el).addEventListener('click', () => {
      try { localStorage.removeItem('sp:profile'); } catch { /* ignore */ }
      profile = { ...D.student };
      updateChrome(); renderProfile(el); toast('Profile reset');
    });
  }

  /* ---------- Router ---------- */
  const ROUTES = {
    dashboard:     { title: 'Dashboard',      sub: () => D.term, render: renderDashboard },
    schedule:      { title: 'Class Schedule', sub: () => `${D.courses.length} courses, ${totalUnits()} units`, render: renderSchedule },
    grades:        { title: 'Grades',         sub: () => D.term, render: renderGrades },
    announcements: { title: 'Announcements',  sub: () => `${unreadCount()} unread`, render: renderAnnouncements },
    profile:       { title: 'My Profile',     sub: () => `${profile.studentId} · ${profile.program}`, render: renderProfile }
  };

  function route() {
    const key = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
    const name = ROUTES[key] ? key : 'dashboard';
    const r = ROUTES[name];
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + name; });
    $$('#nav a').forEach((a) => {
      const on = a.dataset.route === name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    r.render($('#view-' + name));
    $('#pageTitle').textContent = r.title;
    $('#pageSub').textContent = r.sub();
    document.title = `${r.title} | Student Portal`;
    closeMenu();
    window.scrollTo({ top: 0 });
    $('#main').focus({ preventScroll: true });
  }

  /* ---------- Mobile menu ---------- */
  const sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
  function openMenu() { sidebar.classList.add('open'); scrim.classList.add('show'); menuBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { sidebar.classList.remove('open'); scrim.classList.remove('show'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => (sidebar.classList.contains('open') ? closeMenu() : openMenu()));
  scrim.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Theme ---------- */
  function applyThemeIcon() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('#themeIcon').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  }
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.set('theme', next);
    applyThemeIcon();
  });

  /* ---------- Boot ---------- */
  applyThemeIcon();
  updateChrome();
  window.addEventListener('hashchange', route);
  route();
})();
