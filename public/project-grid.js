/* ==========================================================
   Charge dynamiquement les projets ajoutés depuis /admin.html
   Si l'API ne répond pas ou qu'aucun projet n'existe encore,
   les emplacements réservés statiques restent affichés.
   ========================================================== */

(function () {
  var grid = document.getElementById('projects-grid');
  if (!grid) return;

  fetch('/api/projects')
    .then(function (r) {
      return r.ok ? r.json() : [];
    })
    .then(function (projects) {
      if (!projects || !projects.length) return; // garde les placeholders statiques

      grid.innerHTML = '';

      projects.forEach(function (p) {
        var card = document.createElement('a');
        card.href = 'project.html?id=' + encodeURIComponent(p.id);
        card.className = 'placeholder reveal filled';
        card.style.aspectRatio = '1/1';
        card.style.position = 'relative';
        card.style.display = 'block';
        card.style.cursor = 'pointer';
        card.style.textDecoration = 'none';
        if (p.large) card.style.gridColumn = 'span 2';

        var mediaList = Array.isArray(p.media) && p.media.length ? p.media : (p.url ? [{ type: p.type, url: p.url }] : []);
        var cover = mediaList[0] || { type: 'image', url: '' };

        var media = document.createElement(cover.type === 'video' ? 'video' : 'img');
        media.src = cover.url;
        if (cover.type === 'video') {
          media.muted = true;
          media.loop = true;
          media.playsInline = true;
          media.autoplay = true;
        } else {
          media.alt = p.title || '';
        }
        card.appendChild(media);

        if (mediaList.length > 1) {
          var countBadge = document.createElement('div');
          countBadge.style.cssText =
            'position:absolute; top:10px; right:10px; z-index:2; background:rgba(0,0,0,.6);' +
            'color:#eef1f5; font-size:11px; font-family:Inter,sans-serif; padding:3px 8px; border-radius:20px;';
          countBadge.textContent = mediaList.length + ' médias';
          card.appendChild(countBadge);
        }

        var caption = document.createElement('div');
        caption.style.cssText =
          'position:absolute; left:0; right:0; bottom:0; z-index:2; padding:10px 12px;' +
          'background:linear-gradient(to top, rgba(0,0,0,.75), transparent);' +
          'text-align:left; font-family:Inter,sans-serif; pointer-events:none;';

        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:12px; font-weight:600; color:#eef1f5;';
        titleEl.textContent = p.title || '';
        caption.appendChild(titleEl);

        if (p.description) {
          var descEl = document.createElement('div');
          descEl.style.cssText = 'font-size:10.5px; color:#aab4c0; margin-top:2px;';
          descEl.textContent = p.description;
          caption.appendChild(descEl);
        }

        card.appendChild(caption);
        grid.appendChild(card);
      });

      if (window.__reinitReveal) window.__reinitReveal();
      if (window.__reinitTilt) window.__reinitTilt();
    })
    .catch(function () {
      /* pas de backend ou API injoignable : les placeholders restent visibles */
    });
})();
