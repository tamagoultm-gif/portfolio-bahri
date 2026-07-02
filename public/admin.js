(function () {
  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var logoutBtn = document.getElementById('logout-btn');

  var addForm = document.getElementById('add-form');
  var addStatus = document.getElementById('add-status');
  var addSubmit = document.getElementById('add-submit');

  var listEl = document.getElementById('admin-projects-list');
  var emptyState = document.getElementById('empty-state');

  document.addEventListener('DOMContentLoaded', checkAuth);

  function checkAuth() {
    fetch('/api/admin/check')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.isAdmin) showDashboard();
        else showLogin();
      })
      .catch(showLogin);
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadProjects();
  }

  // ---------- Login / logout ----------
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.textContent = '';
    var password = document.getElementById('login-password').value;

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          loginError.textContent = res.data.error || 'Erreur de connexion.';
          return;
        }
        document.getElementById('login-password').value = '';
        showDashboard();
      })
      .catch(function () {
        loginError.textContent = 'Impossible de contacter le serveur.';
      });
  });

  logoutBtn.addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST' }).then(showLogin);
  });

  // ---------- Add project ----------
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addStatus.textContent = 'Envoi en cours…';
    addStatus.className = 'admin-status';
    addSubmit.disabled = true;

    var formData = new FormData(addForm);
    formData.set('large', document.getElementById('add-large').checked);

    fetch('/api/admin/projects', { method: 'POST', body: formData })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        addSubmit.disabled = false;
        if (!res.ok) {
          addStatus.textContent = res.data.error || "Échec de l'envoi.";
          addStatus.className = 'admin-status err';
          return;
        }
        addStatus.textContent = 'Projet publié ✓';
        addStatus.className = 'admin-status ok';
        addForm.reset();
        loadProjects();
      })
      .catch(function () {
        addSubmit.disabled = false;
        addStatus.textContent = 'Impossible de contacter le serveur.';
        addStatus.className = 'admin-status err';
      });
  });

  // ---------- List / edit / delete / reorder ----------
  function loadProjects() {
    fetch('/api/projects')
      .then(function (r) { return r.json(); })
      .then(renderList)
      .catch(function () {
        listEl.innerHTML = '';
        emptyState.style.display = 'block';
        emptyState.textContent = 'Impossible de charger les projets.';
      });
  }

  function renderList(projects) {
    listEl.innerHTML = '';
    emptyState.style.display = projects.length ? 'none' : 'block';

    projects.forEach(function (p, i) {
      var card = document.createElement('div');
      card.className = 'admin-project-card';

      var mediaList = Array.isArray(p.media) ? p.media : (p.url ? [{ id: null, type: p.type, url: p.url }] : []);

      var cover = document.createElement(mediaList[0] && mediaList[0].type === 'video' ? 'video' : 'img');
      cover.className = 'admin-project-thumb';
      if (mediaList[0]) cover.src = mediaList[0].url;
      if (mediaList[0] && mediaList[0].type === 'video') { cover.muted = true; cover.controls = true; }
      card.appendChild(cover);

      var body = document.createElement('div');
      body.className = 'admin-project-body';

      // ---- media gallery for this project ----
      var galleryLabel = document.createElement('div');
      galleryLabel.style.cssText = 'font-size:11px; color:var(--ink-dim); margin-top:10px; margin-bottom:6px; text-transform:uppercase; letter-spacing:.06em;';
      galleryLabel.textContent = mediaList.length + ' média' + (mediaList.length > 1 ? 's' : '');

      var gallery = document.createElement('div');
      gallery.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;';

      mediaList.forEach(function (m) {
        var thumbWrap = document.createElement('div');
        thumbWrap.style.cssText = 'position:relative; width:64px; height:64px;';

        var thumbEl = document.createElement(m.type === 'video' ? 'video' : 'img');
        thumbEl.src = m.url;
        thumbEl.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:6px; display:block;';
        if (m.type === 'video') thumbEl.muted = true;
        thumbWrap.appendChild(thumbEl);

        if (m.id && mediaList.length > 1) {
          var rmBtn = document.createElement('button');
          rmBtn.type = 'button';
          rmBtn.textContent = '×';
          rmBtn.title = 'Supprimer ce média';
          rmBtn.style.cssText = 'position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%; border:none; background:#c33; color:#fff; font-size:12px; line-height:1; cursor:pointer;';
          rmBtn.addEventListener('click', function () {
            if (confirm('Supprimer ce média ?')) deleteMedia(p.id, m.id);
          });
          thumbWrap.appendChild(rmBtn);
        }

        gallery.appendChild(thumbWrap);
      });

      var addMoreWrap = document.createElement('label');
      addMoreWrap.style.cssText = 'width:64px; height:64px; border:1px dashed var(--line); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:22px; color:var(--ink-dim); cursor:pointer;';
      addMoreWrap.textContent = '+';
      var addMoreInput = document.createElement('input');
      addMoreInput.type = 'file';
      addMoreInput.accept = 'image/*,video/*';
      addMoreInput.multiple = true;
      addMoreInput.style.display = 'none';
      addMoreInput.addEventListener('change', function () {
        if (addMoreInput.files.length) addMedia(p.id, addMoreInput.files);
      });
      addMoreWrap.appendChild(addMoreInput);
      gallery.appendChild(addMoreWrap);

      body.appendChild(galleryLabel);
      body.appendChild(gallery);

      var titleInput = document.createElement('input');
      titleInput.className = 'admin-input';
      titleInput.value = p.title;

      var descInput = document.createElement('textarea');
      descInput.className = 'admin-input';
      descInput.rows = 2;
      descInput.value = p.description || '';

      var largeLabel = document.createElement('label');
      largeLabel.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--ink-mid);';
      var largeCheckbox = document.createElement('input');
      largeCheckbox.type = 'checkbox';
      largeCheckbox.checked = !!p.large;
      largeLabel.appendChild(largeCheckbox);
      largeLabel.appendChild(document.createTextNode('Format large'));

      var actions = document.createElement('div');
      actions.className = 'admin-project-actions';

      var saveBtn = mkBtn('Enregistrer', 'btn-sm', function () {
        updateProject(p.id, {
          title: titleInput.value,
          description: descInput.value,
          large: largeCheckbox.checked,
        });
      });

      var upBtn = mkBtn('↑', 'btn-sm', function () { move(i, -1); });
      var downBtn = mkBtn('↓', 'btn-sm', function () { move(i, 1); });
      if (i === 0) upBtn.disabled = true;
      if (i === projects.length - 1) downBtn.disabled = true;

      var deleteBtn = mkBtn('Supprimer', 'btn-sm danger', function () {
        if (confirm('Supprimer ce projet ?')) deleteProject(p.id);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(saveBtn);
      actions.appendChild(deleteBtn);

      body.appendChild(titleInput);
      body.appendChild(descInput);
      body.appendChild(largeLabel);
      body.appendChild(actions);
      card.appendChild(body);
      listEl.appendChild(card);

      function move(index, dir) {
        var newIndex = index + dir;
        if (newIndex < 0 || newIndex >= projects.length) return;
        var order = projects.map(function (proj) { return proj.id; });
        var tmp = order[index];
        order[index] = order[newIndex];
        order[newIndex] = tmp;
        reorder(order);
      }
    });
  }

  function mkBtn(label, cls, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function updateProject(id, payload) {
    fetch('/api/admin/projects/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(loadProjects);
  }

  function deleteProject(id) {
    fetch('/api/admin/projects/' + id, { method: 'DELETE' }).then(loadProjects);
  }

  function addMedia(projectId, fileList) {
    var fd = new FormData();
    for (var i = 0; i < fileList.length; i++) fd.append('media', fileList[i]);
    fetch('/api/admin/projects/' + projectId + '/media', { method: 'POST', body: fd })
      .then(loadProjects)
      .catch(function () { alert("Échec de l'ajout du média."); });
  }

  function deleteMedia(projectId, mediaId) {
    fetch('/api/admin/projects/' + projectId + '/media/' + mediaId, { method: 'DELETE' })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) { alert(res.data.error || 'Échec de la suppression.'); return; }
        loadProjects();
      });
  }

  function reorder(order) {
    fetch('/api/admin/projects-reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: order }),
    }).then(loadProjects);
  }
})();
