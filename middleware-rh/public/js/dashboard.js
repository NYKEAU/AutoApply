document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM chargé, initialisation du dashboard...");

  // Fonction pour vérifier l'authentification
  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Important pour envoyer les cookies
        headers: {
          // Récupérer le token depuis localStorage si disponible
          Authorization: localStorage.getItem("token")
            ? `Bearer ${localStorage.getItem("token")}`
            : "",
        },
      });

      if (!response.ok) {
        console.error("Erreur d'authentification:", response.status);
        // Rediriger vers la page de connexion
        window.location.href = "/login";
        return;
      }

      const data = await response.json();
      console.log("Utilisateur authentifié:", data.user);

      // Mettre à jour les informations de l'utilisateur
      updateUserInfo(data.user);
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
    }
  }

  // Vérifier l'authentification au chargement
  checkAuthentication();

  // Initialisation du thème
  initTheme();

  // Initialisation du chat
  initChat();

  // Chargement des statistiques
  loadStats();

  // Afficher le message de bienvenue
  showWelcomeMessage();

  // Écouteur d'événement pour la déconnexion
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    console.log(
      "Bouton de déconnexion trouvé, ajout de l'écouteur d'événement"
    );
    logoutBtn.addEventListener("click", logout);
  } else {
    console.error("Bouton de déconnexion non trouvé");
  }

  // Écouteurs d'événements pour les boutons du dashboard
  const viewCandidaturesBtn = document.getElementById("view-candidatures");
  if (viewCandidaturesBtn) {
    console.log(
      "Bouton 'Voir les candidatures' trouvé, ajout de l'écouteur d'événement"
    );
    viewCandidaturesBtn.addEventListener("click", function () {
      console.log("Clic sur 'Voir les candidatures'");
      viewCandidatures();
    });
  } else {
    console.error("Bouton 'Voir les candidatures' non trouvé");
  }

  const syncNotionBtn = document.getElementById("sync-notion");
  if (syncNotionBtn) {
    syncNotionBtn.addEventListener("click", syncNotion);
  }

  // Bouton copier le token pour l'extension
  const copyTokenBtn = document.getElementById("copy-extension-token");
  if (copyTokenBtn) {
    copyTokenBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/token", { credentials: "include" });
        const data = await res.json();
        if (!data.success || !data.token) {
          showNotification("Impossible de récupérer le token. Reconnecte-toi.", true);
          return;
        }
        showTokenModal(data.token);
      } catch (e) {
        showNotification("Erreur réseau.", true);
      }
    });
  }

  function showTokenModal(token) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;";

    overlay.innerHTML = `
      <div style="background:var(--card-bg,#1e1e2e);padding:24px;border-radius:12px;max-width:560px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <h3 style="margin:0 0 8px;color:var(--text-primary,#fff)">🧩 Token Extension Chrome</h3>
        <p style="margin:0 0 12px;color:var(--text-secondary,#aaa);font-size:13px;">
          Colle ce token dans le popup de l'extension (champ "Token d'authentification").
        </p>
        <div style="position:relative;">
          <input id="modal-token-input" type="password" readonly
            style="width:100%;padding:10px 40px 10px 10px;border-radius:6px;border:1px solid #444;
                   background:#111;color:#fff;font-size:12px;font-family:monospace;box-sizing:border-box;"
            value="${token}">
          <button id="modal-toggle-btn"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;
                   border:none;color:#aaa;cursor:pointer;font-size:16px;">👁</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button id="modal-copy-btn"
            style="flex:1;padding:10px;background:#0a66c3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">
            Copier
          </button>
          <button id="modal-close-btn"
            style="flex:1;padding:10px;background:#555;color:#fff;border:none;border-radius:6px;cursor:pointer;">
            Fermer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById("modal-token-input");

    document.getElementById("modal-toggle-btn").addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
    });

    document.getElementById("modal-copy-btn").addEventListener("click", () => {
      input.type = "text";
      input.select();
      document.execCommand("copy");
      document.getElementById("modal-copy-btn").textContent = "✅ Copié !";
      setTimeout(() => { document.body.removeChild(overlay); }, 1200);
    });

    document.getElementById("modal-close-btn").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  const newCandidatureBtn = document.getElementById("new-candidature");
  if (newCandidatureBtn) {
    console.log("Bouton 'Ajouter' trouvé, ajout de l'écouteur d'événement");
    newCandidatureBtn.addEventListener("click", function () {
      console.log("Clic sur 'Ajouter'");
      showNewCandidatureModal();
    });
  } else {
    console.error("Bouton 'Ajouter' non trouvé");
  }

  // Écouteurs d'événements pour le modal de nouvelle candidature
  const closeModalBtn = document.querySelector(".close");
  if (closeModalBtn) {
    console.log(
      "Bouton de fermeture du modal trouvé, ajout de l'écouteur d'événement"
    );
    closeModalBtn.addEventListener("click", hideModal);
  } else {
    console.error("Bouton de fermeture du modal non trouvé");
  }

  const candidatureForm = document.getElementById("candidature-form");
  if (candidatureForm) {
    console.log(
      "Formulaire de candidature trouvé, ajout de l'écouteur d'événement"
    );
    candidatureForm.addEventListener("submit", submitCandidature);
  } else {
    console.error("Formulaire de candidature non trouvé");
  }

  // Écouteur d'événement pour fermer la liste des candidatures
  const closeCandidaturesBtn = document.querySelector(".close-candidatures");
  if (closeCandidaturesBtn) {
    console.log(
      "Bouton de fermeture des candidatures trouvé, ajout de l'écouteur d'événement"
    );
    closeCandidaturesBtn.addEventListener("click", hideCandidatures);
  } else {
    console.error("Bouton de fermeture des candidatures non trouvé");
  }

  // Fonction pour vérifier l'authentification
  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      // Mettre à jour les informations de l'utilisateur
      updateUserInfo(data.user);
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
      window.location.href = "/login";
    }
  }

  // Fonction pour mettre à jour les informations de l'utilisateur
  function updateUserInfo(user) {
    const userAvatar = document.getElementById("user-avatar");
    const userName = document.getElementById("user-name");
    const userEmail = document.getElementById("user-email");

    if (user.displayName) {
      userName.textContent = user.displayName;
      userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
    }

    if (user.email) {
      userEmail.textContent = user.email;
    }

    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || "Utilisateur"}" />`;
    }
  }

  // Fonction pour se déconnecter
  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", {
        credentials: "include",
      });

      if (response.ok) {
        // Rediriger vers la page d'accueil
        window.location.href = "/";
      } else {
        throw new Error("Erreur lors de la déconnexion");
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      showNotification("Erreur lors de la déconnexion", true);
    }
  }

  // Fonction pour initialiser le thème
  function initTheme() {
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle.querySelector("i");

    // Vérifier si un thème est déjà enregistré dans localStorage
    const currentTheme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", currentTheme);

    // Mettre à jour l'icône en fonction du thème actuel
    if (currentTheme === "dark") {
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    }

    // Fonction pour basculer entre les thèmes
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.body.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      document.body.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);

      // Mettre à jour l'icône
      themeIcon.classList.toggle("fa-moon");
      themeIcon.classList.toggle("fa-sun");
    });
  }

  // Fonction pour afficher une notification
  function showNotification(message, isError = false) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = isError
      ? "notification error show"
      : "notification show";

    setTimeout(() => {
      notification.className = "notification";
    }, 3000);
  }

  // Autres fonctions (à implémenter selon les besoins)
  function initChat() {
    // Implémentation du chat
  }

  // Instances Chart.js (pour pouvoir les détruire avant recréation)
  let statusChartInstance = null;
  let sourceChartInstance = null;

  // Palette de couleurs pour les graphiques
  const CHART_COLORS = [
    "#4285f4", "#34a853", "#fbbc05", "#ea4335",
    "#9c27b0", "#ff5722", "#00bcd4", "#8bc34a",
    "#ff9800", "#607d8b", "#e91e63", "#795548",
  ];

  function renderStatusChart(statusCount) {
    const canvas = document.getElementById("status-chart");
    if (!canvas) return;

    const labels = Object.keys(statusCount);
    const values = Object.values(statusCount);
    if (labels.length === 0) return;

    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#fff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label} : ${ctx.raw} candidature(s)`,
            },
          },
        },
      },
    });
  }

  // sourceCount complet (toutes sources) gardé en mémoire pour le filtrage
  let allSourceCount = {};

  function renderSourceChart(sourceCount) {
    const canvas = document.getElementById("source-chart");
    const emptyMsg = document.getElementById("source-chart-empty");
    if (!canvas) return;

    const labels = Object.keys(sourceCount).sort((a, b) => sourceCount[b] - sourceCount[a]);
    const values = labels.map(l => sourceCount[l]);

    if (labels.length === 0) {
      canvas.style.display = "none";
      if (emptyMsg) emptyMsg.style.display = "block";
      return;
    }

    canvas.style.display = "block";
    if (emptyMsg) emptyMsg.style.display = "none";

    if (sourceChartInstance) sourceChartInstance.destroy();

    // Couleur stable par source (même index = même couleur quelle que soit la vue)
    const allKeys = Object.keys(allSourceCount).sort((a, b) => allSourceCount[b] - allSourceCount[a]);
    const bgColors = labels.map(l => CHART_COLORS[allKeys.indexOf(l) % CHART_COLORS.length]);

    sourceChartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Candidatures",
          data: values,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.raw} candidature(s)`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 } },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Peuple le select "Source" avec toutes les sources connues
  function populateSourceFilter(sourceCount) {
    const select = document.getElementById("source-filter");
    if (!select) return;

    // Mémorise le choix actuel avant de reconstruire
    const current = select.value;

    // On garde seulement l'option "Toutes les sources"
    select.innerHTML = '<option value="all">Toutes les sources</option>';

    Object.keys(sourceCount)
      .sort((a, b) => sourceCount[b] - sourceCount[a])
      .forEach(src => {
        const opt = document.createElement("option");
        opt.value = src;
        opt.textContent = `${src} (${sourceCount[src]})`;
        select.appendChild(opt);
      });

    // Restaure la sélection si elle existe encore
    if (current && [...select.options].some(o => o.value === current)) {
      select.value = current;
    }

    // Listener : filtre le graphique à la sélection
    select.onchange = () => {
      const val = select.value;
      if (val === "all") {
        renderSourceChart(allSourceCount);
      } else {
        renderSourceChart({ [val]: allSourceCount[val] || 0 });
      }
    };
  }

  function loadStats() {
    fetch("/api/candidatures/stats", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;

        // Total candidatures
        const totalEl = document.getElementById("total-candidatures");
        if (totalEl) totalEl.textContent = data.total || 0;

        // Salaire moyen mensuel
        const salaireEl = document.getElementById("salaire-moyen");
        if (salaireEl) {
          if (data.averageMonthlySalary) {
            salaireEl.textContent = data.averageMonthlySalary.toLocaleString("fr-CA") + " $ / mois";
            salaireEl.title = `Basé sur ${data.withSalaryCount} candidature(s) avec salaire`;
          } else {
            salaireEl.textContent = "—";
            salaireEl.title = "Aucune candidature avec salaire détecté";
          }
        }

        // Taux de réponse = (Interviewé + Job refusé + Job accepté) / total
        const tauxEl = document.getElementById("taux-reponse");
        if (tauxEl && data.total > 0) {
          const responded = (data.statusCount["Interviewé"] || 0) +
            (data.statusCount["Job refusé"] || 0) +
            (data.statusCount["Job accepté"] || 0);
          tauxEl.textContent = Math.round((responded / data.total) * 100) + "%";
        }

        // Charts + filtre source
        if (data.statusCount) renderStatusChart(data.statusCount);
        if (data.sourceCount) {
          allSourceCount = data.sourceCount;
          populateSourceFilter(data.sourceCount);
          renderSourceChart(data.sourceCount);
        }

        // Ce mois-ci: on récupère les candidatures pour filtrer
        fetch("/api/candidatures", { credentials: "include" })
          .then((r) => r.json())
          .then((candidatures) => {
            const now = new Date();
            const thisMonth = candidatures.filter((c) => {
              const d = new Date(c.date || c.createdAt);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length;
            const moisEl = document.getElementById("candidatures-mois");
            if (moisEl) moisEl.textContent = thisMonth;
          })
          .catch(() => {});
      })
      .catch((err) => console.error("Erreur stats:", err));
  }

  function showWelcomeMessage() {
    // Affichage du message de bienvenue
  }

  // Fonction pour afficher la liste des candidatures
  async function viewCandidatures() {
    console.log("Fonction viewCandidatures appelée");
    try {
      showLoader();
      console.log("Récupération des candidatures depuis l'API...");

      const response = await fetch("/api/candidatures", {
        credentials: "include",
      });

      console.log("Réponse de l'API:", response.status);

      if (!response.ok) {
        throw new Error(
          `Erreur lors de la récupération des candidatures: ${response.status}`
        );
      }

      const candidatures = await response.json();
      console.log(`${candidatures.length} candidatures récupérées`);

      // Afficher les candidatures
      displayCandidatures(candidatures);

      // Afficher le conteneur des candidatures
      const candidaturesContainer = document.getElementById(
        "candidatures-container"
      );
      if (candidaturesContainer) {
        candidaturesContainer.classList.add("show");
        console.log("Conteneur des candidatures affiché");
      } else {
        console.error("Conteneur des candidatures non trouvé");
      }

      hideLoader();
    } catch (error) {
      console.error("Erreur lors de l'affichage des candidatures:", error);
      showNotification(
        "Erreur lors de l'affichage des candidatures: " + error.message,
        true
      );
      hideLoader();
    }
  }

  // Fonction pour afficher les candidatures dans la liste
  function displayCandidatures(candidatures) {
    const candidaturesList = document.getElementById("candidatures-list");
    candidaturesList.innerHTML = "";

    if (candidatures.length === 0) {
      candidaturesList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>Aucune candidature trouvée</h3>
          <p>Vous n'avez pas encore ajouté de candidature.</p>
          <button class="btn primary" onclick="document.getElementById('new-candidature').click()">
            Ajouter une candidature
          </button>
        </div>
      `;
      return;
    }

    candidatures.forEach((candidature) => {
      const candidatureElement = document.createElement("div");
      candidatureElement.className = "candidature-item";
      candidatureElement.dataset.id = candidature.id;

      // Déterminer la classe CSS en fonction du statut
      let statusClass = "";
      switch (candidature.statut) {
        case "Postulé":
          statusClass = "status-applied";
          break;
        case "Interviewé":
          statusClass = "status-interviewed";
          break;
        case "Job refusé":
          statusClass = "status-rejected";
          break;
        case "Job accepté":
          statusClass = "status-accepted";
          break;
        default:
          statusClass = "status-applied";
      }

      const sourceBadge = candidature.source
        ? `<span class="candidature-source">${candidature.source}</span>`
        : "";

      candidatureElement.innerHTML = `
        <div class="candidature-header">
          <h3>${candidature.entreprise}</h3>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            ${sourceBadge}
            <span class="candidature-status ${statusClass}">${candidature.statut}</span>
          </div>
        </div>
        <div class="candidature-details">
          <p><strong>Poste:</strong> ${candidature.poste}</p>
          <p><strong>Date:</strong> ${new Date(candidature.date).toLocaleDateString()}</p>
          <p><strong>Salaire:</strong> ${candidature.salaire || "Non défini"}</p>
          ${candidature.location ? `<p><strong>Lieu:</strong> ${candidature.location}</p>` : ""}
        </div>
        <div class="candidature-actions">
          <button class="btn primary edit-candidature" data-id="${candidature.id}">
            <i class="fas fa-edit"></i> Modifier
          </button>
          <button class="btn danger delete-candidature" data-id="${candidature.id}">
            <i class="fas fa-trash"></i> Supprimer
          </button>
        </div>
      `;

      candidaturesList.appendChild(candidatureElement);
    });

    // Ajouter des écouteurs d'événements pour les boutons d'édition et de suppression
    document.querySelectorAll(".edit-candidature").forEach((button) => {
      button.addEventListener("click", function () {
        const id = this.dataset.id;
        editCandidature(id);
      });
    });

    document.querySelectorAll(".delete-candidature").forEach((button) => {
      button.addEventListener("click", function () {
        const id = this.dataset.id;
        deleteCandidature(id);
      });
    });
  }

  // Fonction pour cacher la liste des candidatures
  function hideCandidatures() {
    document.getElementById("candidatures-container").classList.remove("show");
  }

  // Fonction pour synchroniser avec Notion
  async function syncNotion() {
    console.log("Fonction syncNotion appelée");
    try {
      showLoader();
      console.log("Envoi de la requête de synchronisation à l'API...");

      const response = await fetch("/api/notion/sync", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Réponse de l'API:", response.status);

      if (!response.ok) {
        throw new Error(
          `Erreur lors de la synchronisation avec Notion: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Synchronisation réussie:", data);

      showNotification(data.message || "Synchronisation avec Notion réussie");

      hideLoader();
    } catch (error) {
      console.error("Erreur lors de la synchronisation avec Notion:", error);
      showNotification(
        "Erreur lors de la synchronisation avec Notion: " + error.message,
        true
      );
      hideLoader();
    }
  }

  // Fonction pour afficher le modal de nouvelle candidature
  function showNewCandidatureModal() {
    console.log("Fonction showNewCandidatureModal appelée");
    // Réinitialiser le formulaire
    const candidatureForm = document.getElementById("candidature-form");
    if (candidatureForm) {
      candidatureForm.reset();
      console.log("Formulaire réinitialisé");
    } else {
      console.error("Formulaire de candidature non trouvé");
    }

    // Afficher le modal
    const modal = document.getElementById("modal");
    if (modal) {
      modal.style.display = "block";
      console.log("Modal affiché");
    } else {
      console.error("Modal non trouvé");
    }
  }

  // Fonction pour cacher le modal
  function hideModal() {
    document.getElementById("modal").style.display = "none";
  }

  // Fonction pour soumettre une nouvelle candidature
  async function submitCandidature(event) {
    event.preventDefault();

    try {
      showLoader();

      const formData = new FormData(event.target);
      const candidature = {
        entreprise: formData.get("entreprise"),
        poste: formData.get("poste"),
        statut: formData.get("statut"),
        salaire: formData.get("salaire"),
        date: formData.get("date") || new Date().toISOString().split("T")[0],
        location: formData.get("location"),
        description: formData.get("description"),
      };

      const response = await fetch("/api/candidatures", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(candidature),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout de la candidature");
      }

      const data = await response.json();

      showNotification(data.message || "Candidature ajoutée avec succès");

      // Cacher le modal
      hideModal();

      // Recharger les candidatures
      viewCandidatures();

      hideLoader();
    } catch (error) {
      console.error("Erreur lors de l'ajout de la candidature:", error);
      showNotification("Erreur lors de l'ajout de la candidature", true);
      hideLoader();
    }
  }

  // Fonction pour éditer une candidature
  async function editCandidature(id) {
    try {
      showLoader();

      const response = await fetch(`/api/candidatures/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de la candidature");
      }

      const candidature = await response.json();

      // Remplir le formulaire avec les données de la candidature
      document.getElementById("entreprise").value = candidature.entreprise;
      document.getElementById("poste").value = candidature.poste;
      document.getElementById("statut").value = candidature.statut;
      document.getElementById("salaire").value = candidature.salaire;
      document.getElementById("date").value = new Date(candidature.date)
        .toISOString()
        .split("T")[0];
      document.getElementById("location").value = candidature.location || "";
      document.getElementById("description").value =
        candidature.description || "";

      // Modifier le titre du modal
      document.querySelector(".modal-content h2").textContent =
        "Modifier la candidature";

      // Ajouter l'ID de la candidature au formulaire
      const idInput = document.createElement("input");
      idInput.type = "hidden";
      idInput.name = "id";
      idInput.value = id;
      document.getElementById("candidature-form").appendChild(idInput);

      // Afficher le modal
      document.getElementById("modal").style.display = "block";

      hideLoader();
    } catch (error) {
      console.error("Erreur lors de l'édition de la candidature:", error);
      showNotification("Erreur lors de l'édition de la candidature", true);
      hideLoader();
    }
  }

  // Fonction pour supprimer une candidature
  async function deleteCandidature(id) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette candidature ?")) {
      return;
    }

    try {
      showLoader();

      const response = await fetch(`/api/candidatures/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de la candidature");
      }

      const data = await response.json();

      showNotification(data.message || "Candidature supprimée avec succès");

      // Recharger les candidatures
      viewCandidatures();

      hideLoader();
    } catch (error) {
      console.error("Erreur lors de la suppression de la candidature:", error);
      showNotification("Erreur lors de la suppression de la candidature", true);
      hideLoader();
    }
  }

  // Fonction pour afficher le loader
  function showLoader() {
    document.getElementById("loader").style.display = "flex";
  }

  // Fonction pour cacher le loader
  function hideLoader() {
    document.getElementById("loader").style.display = "none";
  }
});
