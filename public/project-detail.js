/* ==========================================================
   Charge un seul projet (via ?id=...) et affiche toutes ses
   photos/vidéos dans une galerie sur project.html
   ========================================================== */

(function () {
  var content = document.getElementById('project-content');
  if (!content) return;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');

  if (!id) {
    content.innerHTML = '<p style="color:var(--ink-dim); font-size:13px;">Projet introuvable.</p>';
    return;
  }

  fetch('/api/projects/' + encodeURIComponent(id))
    .then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then(renderProject)
    .catch(function () {
      content.innerHTML = '<p style="color:var(--ink-dim); font-size:13px;">Ce projet n\'existe pas ou a été supprimé.</p>';
    });

  function renderProject(p) {
    document.title = (p.title || 'Projet') + ' — Hammami Bahri';

    var mediaList = Array.isArray(p.media) && p.media.length ? p.media : (p.url ? [{ type: p.type, url: p.url }] : []);

    var html = '';
    html += '<h1 class="section-title" style="font-size:clamp(28px,4vw,44px); margin-bottom:10px;">' + escapeHtml(p.title || 'Sans titre') + '</h1>';
    if (p.description) {
      html += '<p style="color:var(--ink-mid); font-size:14px; line-height:1.8; max-width:680px; margin-bottom:32px;">' + escapeHtml(p.description) + '</p>';
    } else {
      html += '<div style="margin-bottom:28px;"></div>';
    }

    html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">';
    mediaList.forEach(function (m) {
      html += '<div style="position:relative; border-radius:10px; overflow:hidden; background:#0a1219; aspect-ratio:4/3;">';
      if (m.type === 'video') {
        html += '<video src="' + m.url + '" controls playsinline style="width:100%; height:100%; object-fit:cover; display:block;"></video>';
      } else {
        html += '<img src="' + m.url + '" alt="' + escapeHtml(p.title || '') + '" style="width:100%; height:100%; object-fit:cover; display:block;">';
      }
      html += '</div>';
    });
    html += '</div>';

    content.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
