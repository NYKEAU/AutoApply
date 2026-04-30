document.addEventListener('DOMContentLoaded', () => {

  chrome.storage.sync.get(['authToken', 'userProfile'], data => {
    if (data.authToken) document.getElementById('token').value = '••••••••••••••••';
    if (data.userProfile) {
      const p = data.userProfile;
      if (p.nom) document.getElementById('profile-nom').value = p.nom;
      if (p.telephone) document.getElementById('profile-telephone').value = p.telephone;
      if (p.email) document.getElementById('profile-email').value = p.email;
      if (p.linkedin) document.getElementById('profile-linkedin').value = p.linkedin;
    }
  });

  chrome.storage.local.get(['formData'], data => {
    if (data.formData) {
      const f = data.formData;
      if (f.cvType) document.getElementById('lm-cv-type').value = f.cvType;
      if (f.cvVersion) document.getElementById('lm-cv-version').value = f.cvVersion;
      if (f.entreprise) document.getElementById('lm-entreprise').value = f.entreprise;
      if (f.poste) document.getElementById('lm-poste').value = f.poste;
      if (f.recruteurNom) document.getElementById('lm-recruteur-nom').value = f.recruteurNom;
      if (f.sourceOffre) document.getElementById('lm-source-offre').value = f.sourceOffre;
      if (f.adresse) document.getElementById('lm-adresse').value = f.adresse;
      if (f.ville) document.getElementById('lm-ville').value = f.ville;
      if (f.province) document.getElementById('lm-province').value = f.province;
      
      if (f.templateIndex !== null && f.templateIndex !== undefined) {
        lmTemplateIndex = f.templateIndex;
        document.getElementById('lm-random').classList.remove('active');
        document.querySelectorAll('.lm-tpl-btn').forEach(b => {
          b.classList.remove('active');
          if (parseInt(b.dataset.index) === f.templateIndex) {
            b.classList.add('active');
          }
        });
      } else {
        lmTemplateIndex = null;
        document.getElementById('lm-random').classList.add('active');
      }
    }
  });

  document.getElementById('saveToken').addEventListener('click', () => {
    const token = document.getElementById('token').value.trim();
    if (!token || token === '••••••••••••••••') {
      showStatus('Entre un token valide.', 'error');
      return;
    }
    chrome.storage.sync.set({ authToken: token }, () => {
      showStatus('Token enregistré !', 'success');
      document.getElementById('token').value = '••••••••••••••••';
    });
  });

  // Sauvegarde automatique du profil utilisateur
  function saveUserProfile() {
    const userProfile = {
      nom: document.getElementById('profile-nom').value.trim(),
      telephone: document.getElementById('profile-telephone').value.trim(),
      email: document.getElementById('profile-email').value.trim(),
      linkedin: document.getElementById('profile-linkedin').value.trim(),
    };
    chrome.storage.sync.set({ userProfile });
  }

  ['profile-nom', 'profile-telephone', 'profile-email', 'profile-linkedin'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveUserProfile);
    document.getElementById(id).addEventListener('input', saveUserProfile);
  });

  function saveFormData() {
    const formData = {
      cvType: document.getElementById('lm-cv-type').value,
      cvVersion: document.getElementById('lm-cv-version').value,
      entreprise: document.getElementById('lm-entreprise').value.trim(),
      poste: document.getElementById('lm-poste').value.trim(),
      recruteurNom: document.getElementById('lm-recruteur-nom').value.trim(),
      sourceOffre: document.getElementById('lm-source-offre').value,
      adresse: document.getElementById('lm-adresse').value.trim(),
      ville: document.getElementById('lm-ville').value.trim(),
      province: document.getElementById('lm-province').value.trim(),
      templateIndex: lmTemplateIndex,
    };
    chrome.storage.local.set({ formData });
  }

  const fields = ['lm-cv-type', 'lm-cv-version', 'lm-entreprise', 'lm-poste', 'lm-recruteur-nom', 'lm-source-offre', 'lm-adresse', 'lm-ville', 'lm-province'];
  fields.forEach(id => {
    document.getElementById(id).addEventListener('change', saveFormData);
    document.getElementById(id).addEventListener('input', saveFormData);
  });

  let lmTemplateIndex = null;

  document.getElementById('lm-random').addEventListener('click', () => {
    lmTemplateIndex = null;
    document.querySelectorAll('.lm-tpl-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('lm-random').classList.add('active');
    saveFormData();
  });

  document.querySelectorAll('.lm-tpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lmTemplateIndex = parseInt(btn.dataset.index);
      document.getElementById('lm-random').classList.remove('active');
      document.querySelectorAll('.lm-tpl-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveFormData();
    });
  });

  document.getElementById('lm-generate').addEventListener('click', () => {
    const entreprise = document.getElementById('lm-entreprise').value.trim();
    const poste = document.getElementById('lm-poste').value.trim();

    if (!entreprise || !poste) {
      showStatus('Entreprise et poste sont requis.', 'error');
      return;
    }

    chrome.storage.sync.get(['middlewarePort', 'authToken'], data => {
      const port = data.middlewarePort || 3000;
      const token = data.authToken;

      if (!token) {
        showStatus('Token manquant, configure-le d\'abord.', 'error');
        return;
      }

      const payload = {
        cv_type: document.getElementById('lm-cv-type').value,
        cv_version: document.getElementById('lm-cv-version').value,
        entreprise,
        poste,
        adresse: document.getElementById('lm-adresse').value.trim(),
        ville: document.getElementById('lm-ville').value.trim(),
        province: document.getElementById('lm-province').value.trim(),
        recruteur_nom: document.getElementById('lm-recruteur-nom').value.trim(),
        source_offre: document.getElementById('lm-source-offre').value,
        template_index: lmTemplateIndex,
      };

      const genBtn = document.getElementById('lm-generate');
      genBtn.textContent = 'Génération...';
      genBtn.disabled = true;

      fetch(`http://localhost:${port}/api/cover-letter/generate-from-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            document.getElementById('lm-text').value = result.cover_letter;
            document.getElementById('lm-result').style.display = 'block';
            showStatus(`LM générée (template ${result.template_index + 1}/${result.template_count})`, 'success');
          } else {
            showStatus('Erreur : ' + (result.error || 'Inconnue'), 'error');
          }
        })
        .catch(err => {
          console.error(err);
          showStatus('Erreur réseau. Vérifie que le serveur tourne.', 'error');
        })
        .finally(() => {
          genBtn.textContent = 'Générer';
          genBtn.disabled = false;
        });
    });
  });

  document.getElementById('lm-copy').addEventListener('click', () => {
    const text = document.getElementById('lm-text').value;
    navigator.clipboard.writeText(text).then(() => {
      showStatus('LM copiée !', 'success');
    }).catch(() => {
      document.getElementById('lm-text').select();
      document.execCommand('copy');
      showStatus('LM copiée !', 'success');
    });
  });

  document.getElementById('lm-download').addEventListener('click', () => {
    const text = document.getElementById('lm-text').value;
    const entreprise = document.getElementById('lm-entreprise').value.trim() || 'entreprise';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LM-${entreprise}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('LM téléchargée !', 'success');
  });

  document.getElementById('lm-pdf').addEventListener('click', () => {
    const text = document.getElementById('lm-text').value;
    const entreprise = document.getElementById('lm-entreprise').value.trim() || '';
    const poste = document.getElementById('lm-poste').value.trim() || '';

    if (!text || !entreprise || !poste) {
      showStatus('Entreprise, poste et texte de la LM sont requis pour générer le PDF.', 'error');
      return;
    }

    showStatus('Génération du PDF...', 'success');

    const dateStr = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    const ville = document.getElementById('lm-ville').value.trim() || 'Montréal';
    const province = document.getElementById('lm-province').value.trim() || 'QC';

    const profileNom = document.getElementById('profile-nom').value.trim();
    const profileTel = document.getElementById('profile-telephone').value.trim();
    const profileEmail = document.getElementById('profile-email').value.trim();
    const profileLinkedin = document.getElementById('profile-linkedin').value.trim();

    const lines = text.split('\n');
    let bodyHTML = '';
    let skipFooter = false;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (line.trim() === '---') { skipFooter = true; continue; }
      if (skipFooter) continue;
      if (line.trim() === '') { bodyHTML += '<div style="height:8px;"></div>'; continue; }
      if (line.trim() === ',') continue;
      let parsed = line;
      parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      if (/^\s*[-✓]\s+/.test(parsed)) {
        const content = parsed.replace(/^\s*[-✓]\s+/, '');
        bodyHTML += `<div style="margin:3px 0 3px 24px;text-indent:-12px;">– ${content}</div>`;
        continue;
      }

      if (parsed.startsWith('<strong>')) {
        bodyHTML += `<div style="margin:14px 0 4px 0;">${parsed}</div>`;
        continue;
      }

      bodyHTML += `<div style="margin:4px 0;text-align:justify;">${parsed}</div>`;
    }

    const documentHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LM - ${entreprise} - ${poste}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm 20mm 20mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 11pt; line-height: 1.55; color: #1a1a1a;
      margin: 0; padding: 0;
      max-width: 210mm; min-height: 297mm;
      margin: 0 auto; padding: 25mm 20mm 20mm 20mm;
    }
    @media print { body { padding: 0; max-width: none; min-height: auto; } }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 14px; border-bottom: 1.5px solid #333; margin-bottom: 20px;
    }
    .header-left { font-size: 10pt; color: #444; line-height: 1.5; }
    .header-name { font-size: 14pt; font-weight: bold; color: #1a1a1a; margin-bottom: 2px; }
    .header-right { text-align: right; font-size: 10pt; color: #555; }
    .recipient { margin-bottom: 18px; font-size: 10.5pt; color: #333; }
    .body-content { margin-bottom: 24px; }
    .signature { margin-top: 8px; font-size: 10.5pt; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="header-name">${profileNom || 'Votre Nom'}</div>
      ${profileTel ? profileTel + '<br>' : ''}
      ${profileEmail ? profileEmail + '<br>' : ''}
      ${profileLinkedin ? profileLinkedin : ''}
    </div>
    <div class="header-right">
      ${ville}, ${province}<br>
      ${dateStr}
    </div>
  </div>
  <div class="recipient">
    <strong>${entreprise}</strong><br>
    Objet : Candidature – ${poste}
  </div>
  <div class="body-content">
    ${bodyHTML}
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    printWindow.document.write(documentHTML);
    printWindow.document.close();

    printWindow.onload = function() {
      printWindow.print();
      showStatus('PDF généré', 'success');
    };
  });

  function showStatus(message, type) {
    const el = document.getElementById('status');
    el.textContent = message;
    el.className = `status ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3500);
  }
});
