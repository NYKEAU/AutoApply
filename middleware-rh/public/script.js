/**
 * Script principal de l'application AutoApply
 * Ce script gère l'interface utilisateur et les interactions avec l'API
 */

document.addEventListener("DOMContentLoaded", function () {
  // Éléments DOM
  const viewCandidaturesBtn = document.getElementById("view-candidatures");
  const syncNotionBtn = document.getElementById("sync-notion");
  const newCandidatureBtn = document.getElementById("new-candidature");
  const modal = document.getElementById("modal");
  const closeModalBtn = document.querySelector(".close");
  const candidatureForm = document.getElementById("candidature-form");
  const candidaturesContainer = document.getElementById(
    "candidatures-container"
  );
  const closeCandidaturesBtn = document.querySelector(".close-candidatures");
  const candidaturesList = document.getElementById("candidatures-list");
  const notification = document.getElementById("notification");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle.querySelector("i");
  const settingsBtn = document.getElementById("settings-btn");

  // Initialisation du thème
  initTheme();

  // Initialisation du chat
  initChat();

  // Initialisation des paramètres utilisateur
  initUserSettings();

  // Chargement des statistiques
  loadStats();

  // Afficher le message de bienvenue
  showWelcomeMessage();

  // Configuration des MutationObservers pour surveiller les changements dans le DOM
  setupMutationObservers();

  /**
   * Configure les MutationObservers pour surveiller les changements dans le DOM
   * Remplace l'utilisation de setInterval pour une meilleure performance
   */
  function setupMutationObservers() {
    // Observer pour le conteneur de statistiques
    const statsContainer = document.getElementById("stats-container");
    if (statsContainer) {
      const statsObserver = new MutationObserver((mutations) => {
        // Vérifier si le conteneur est devenu visible
        if (statsContainer.offsetParent !== null) {
          fetchCandidatures()
            .then((candidatures) => {
              updateStatCounters(candidatures);
              generateStatusChart(candidatures);
              generateTimelineChart(candidatures);
              generateSourceChart(candidatures);
              updateStatusDetails(candidatures);
              updateAdvancedStats(candidatures);
            })
            .catch((error) => {
              console.error(
                "Erreur lors du chargement des statistiques:",
                error
              );
              showNotification(
                "Erreur lors du chargement des statistiques. Veuillez réessayer.",
                true
              );
            });
        }
      });

      // Observer les changements de style (display) et de classe
      statsObserver.observe(statsContainer, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    // Observer pour le conteneur de candidatures
    const candidaturesListContainer =
      document.getElementById("candidatures-list");
    if (candidaturesListContainer) {
      const candidaturesObserver = new MutationObserver((mutations) => {
        // Mettre à jour les écouteurs d'événements pour les nouvelles candidatures
        const actionButtons = candidaturesListContainer.querySelectorAll(
          ".candidature-actions button"
        );
        actionButtons.forEach((button) => {
          if (!button.hasAttribute("data-listener")) {
            if (button.classList.contains("delete-btn")) {
              button.addEventListener("click", function () {
                const candidatureId =
                  this.closest(".candidature-card").dataset.id;
                if (
                  confirm(
                    "Êtes-vous sûr de vouloir supprimer cette candidature ?"
                  )
                ) {
                  deleteCandidature(candidatureId);
                }
              });
            } else if (button.classList.contains("edit-btn")) {
              button.addEventListener("click", function () {
                const candidatureCard = this.closest(".candidature-card");
                showEditModal(candidatureCard.dataset);
              });
            } else if (button.classList.contains("details-btn")) {
              button.addEventListener("click", function () {
                const candidatureId =
                  this.closest(".candidature-card").dataset.id;
                const candidatures = JSON.parse(
                  localStorage.getItem("candidatures") || "[]"
                );
                const candidature = candidatures.find(
                  (c) => c.id === candidatureId
                );
                if (candidature) {
                  showCandidatureDetails(candidature);
                }
              });
            }
            button.setAttribute("data-listener", "true");
          }
        });
      });

      // Observer les changements dans la liste des candidatures
      candidaturesObserver.observe(candidaturesListContainer, {
        childList: true,
        subtree: true,
      });
    }

    // Observer pour les changements de thème
    const body = document.body;
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          // Mettre à jour les graphiques si le thème change
          const candidatures = JSON.parse(
            localStorage.getItem("candidatures") || "[]"
          );
          if (candidatures.length > 0) {
            generateStatusChart(candidatures);
            generateTimelineChart(candidatures);
            generateSourceChart(candidatures);
          }
        }
      });
    });

    // Observer les changements d'attribut data-theme
    themeObserver.observe(body, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  // Écouteur d'événement pour le redimensionnement de la fenêtre
  let resizeTimeout;
  window.addEventListener("resize", function () {
    // Utiliser un délai pour éviter de trop nombreux rechargements
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      // Recharger les graphiques si la page des statistiques est visible
      if (document.getElementById("stats-container").offsetParent !== null) {
        try {
          // Récupérer les candidatures et régénérer les graphiques
          fetchCandidatures()
            .then((candidatures) => {
              generateStatusChart(candidatures);
              generateTimelineChart(candidatures);
              generateSourceChart(candidatures);
            })
            .catch((error) => {
              console.error(
                "Erreur lors du rechargement des graphiques:",
                error
              );
            });
        } catch (error) {
          console.error("Erreur lors du rechargement des graphiques:", error);
        }
      }
    }, 250);
  });

  // Fonction pour charger les statistiques
  async function loadStats() {
    try {
      fetchCandidatures()
        .then((candidatures) => {
          // Vérifier s'il y a des candidatures
          if (!candidatures || candidatures.length === 0) {
            console.log("Aucune candidature trouvée, affichage de l'état vide");
            // Montrer l'état vide et réinitialiser les compteurs
            showEmptyState();
            // Réinitialiser les compteurs à zéro
            document.getElementById("total-candidatures").textContent = "0";
            document.getElementById("candidatures-mois").textContent = "0";
            document.getElementById("taux-reponse").textContent = "0%";
            document.getElementById("salaire-moyen").textContent = "Non défini";
            return;
          }

          // Ajouter un bouton pour réinitialiser toutes les candidatures
          addResetButton();

          // Continuer avec le traitement normal
          console.log(`${candidatures.length} candidatures récupérées`);
          updateStats(candidatures);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des stats:", error);
        });
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    }
  }

  // Ajouter un bouton pour réinitialiser toutes les candidatures
  function addResetButton() {
    // Vérifier si le bouton existe déjà
    if (document.getElementById("reset-candidatures")) {
      return;
    }

    // Créer le bouton
    const statsHeader = document.querySelector(".stats-container h2");
    if (!statsHeader) return;

    const resetButton = document.createElement("button");
    resetButton.id = "reset-candidatures";
    resetButton.className = "btn danger reset-btn";
    resetButton.textContent = "Supprimer toutes les candidatures";
    resetButton.style.marginLeft = "15px";
    resetButton.style.fontSize = "0.8rem";

    // Ajouter le bouton à côté du titre
    statsHeader.style.display = "flex";
    statsHeader.style.alignItems = "center";
    statsHeader.appendChild(resetButton);

    // Ajouter l'événement de clic
    resetButton.addEventListener("click", function () {
      if (
        confirm(
          "Êtes-vous sûr de vouloir supprimer TOUTES vos candidatures ? Cette action est irréversible."
        )
      ) {
        resetAllCandidatures();
      }
    });
  }

  // Supprimer toutes les candidatures
  async function resetAllCandidatures() {
    try {
      showLoader();

      const response = await fetch("/api/candidatures/all", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      hideLoader();

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      showNotification(data.message, "success");

      // Recharger la page pour actualiser les données
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      hideLoader();
      console.error("Erreur lors de la suppression des candidatures:", error);
      showNotification(
        "Erreur lors de la suppression des candidatures",
        "error"
      );
    }
  }

  // Afficher l'état vide
  function showEmptyState() {
    console.log("Affichage de l'état vide - aucune candidature trouvée");

    // Masquer les éléments de statistiques
    document
      .querySelectorAll(
        ".stats-summary, .charts-container, .stats-details, .advanced-stats"
      )
      .forEach((el) => {
        el.style.display = "none";
      });

    // Vérifier si l'élément d'état vide existe déjà
    let emptyState = document.getElementById("empty-state");

    if (!emptyState) {
      // Créer l'élément d'état vide
      emptyState = document.createElement("div");
      emptyState.id = "empty-state";
      emptyState.className = "empty-state";

      // Ajouter le contenu
      emptyState.innerHTML = `
        <div class="empty-icon">
          <i class="fas fa-folder-open"></i>
        </div>
        <h3>Aucune candidature trouvée</h3>
        <p>Vous n'avez pas encore de candidatures dans votre compte.</p>
        <div class="empty-actions">
          <button id="add-first-candidature" class="btn primary">
            <i class="fas fa-plus-circle"></i> Ajouter ma première candidature
          </button>
          <button id="create-demo-data" class="btn secondary">
            <i class="fas fa-magic"></i> Créer des données de démonstration
          </button>
        </div>
      `;

      const statsContainer = document.getElementById("stats-container");
      statsContainer.appendChild(emptyState);

      // Ajouter les écouteurs d'événements
      document
        .getElementById("add-first-candidature")
        .addEventListener("click", function () {
          showModal();
        });

      document
        .getElementById("create-demo-data")
        .addEventListener("click", function () {
          createDemoData();
        });
    } else {
      // Afficher l'élément d'état vide existant
      emptyState.style.display = "block";
    }
  }

  // Créer des données de démonstration
  async function createDemoData() {
    try {
      showLoader();

      const response = await fetch("/api/candidatures/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      hideLoader();

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      showNotification(data.message, "success");

      // Recharger les statistiques après avoir créé les données
      setTimeout(() => {
        loadStats();
      }, 1000);
    } catch (error) {
      hideLoader();
      console.error(
        "Erreur lors de la création des données de démonstration:",
        error
      );
      showNotification(`Erreur: ${error.message}`, "error");
    }
  }

  // Mettre à jour les compteurs de statistiques
  function updateStatCounters(candidatures) {
    const totalCandidatures = document.getElementById("total-candidatures");
    const salaireMoyen = document.getElementById("salaire-moyen");
    const tauxReponse = document.getElementById("taux-reponse");
    const candidaturesMois = document.getElementById("candidatures-mois");

    // Total des candidatures
    totalCandidatures.textContent = candidatures.length;

    // Salaire moyen — calculé côté serveur (gère les formats texte comme "60 000 $ par an")
    fetch("/api/candidatures/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.averageMonthlySalary) {
          salaireMoyen.textContent = data.averageMonthlySalary.toLocaleString("fr-CA") + " $ / mois";
          salaireMoyen.title = `Basé sur ${data.withSalaryCount} candidature(s) avec salaire`;
        } else {
          salaireMoyen.textContent = "Non défini";
        }
      })
      .catch(() => { salaireMoyen.textContent = "Non défini"; });

    // Taux de réponse
    const hasResponse = (c) => {
      const s = (c.statut || c.status || "").toLowerCase();
      return ["interviewé", "job refusé", "job accepté", "interviewed", "job rejected", "job accepted"].includes(s);
    };
    const reponses = candidatures.filter(hasResponse).length;
    const taux = candidatures.length > 0 ? (reponses / candidatures.length) * 100 : 0;
    tauxReponse.textContent = taux.toFixed(1) + "%";

    // Candidatures ce mois-ci
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = candidatures.filter((c) => {
      const date = new Date(c.date_candidature || c.date || c.createdAt);
      return date >= firstDayOfMonth;
    }).length;
    candidaturesMois.textContent = thisMonth;
  }

  // Générer le graphique de répartition des statuts
  function generateStatusChart(candidatures) {
    try {
      const statusCounts = {};
      candidatures.forEach((c) => {
        const status = c.statut || "Non défini";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statuses = Object.keys(statusCounts);
      const counts = Object.values(statusCounts);

      // Définir des couleurs pour chaque statut
      const colors = [
        "rgba(10, 102, 195, 0.7)", // Bleu LinkedIn
        "rgba(40, 167, 69, 0.7)", // Vert
        "rgba(255, 193, 7, 0.7)", // Jaune
        "rgba(220, 53, 69, 0.7)", // Rouge
        "rgba(108, 117, 125, 0.7)", // Gris
      ];

      const container = document.getElementById("status-chart-container");

      // Vérifier si le conteneur existe
      if (!container) {
        console.error("Élément status-chart-container non trouvé");
        return;
      }

      // Créer un élément canvas s'il n'existe pas déjà
      let canvas = container.querySelector("canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        container.appendChild(canvas);
      }

      // Vérifier si le canvas supporte getContext
      if (!canvas.getContext) {
        console.error("Canvas non supporté par ce navigateur");
        return;
      }

      const ctx = canvas.getContext("2d");

      // Détruire le graphique existant s'il y en a un
      if (window.statusChart) {
        window.statusChart.destroy();
      }

      // Déterminer la couleur du texte en fonction du thème
      const isDarkMode = document.body.getAttribute("data-theme") === "dark";
      const textColor = isDarkMode ? "#F1F1F1" : "#333333";
      const gridColor = isDarkMode
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";

      // Vérifier si on est sur mobile
      const isMobile = window.innerWidth <= 768;

      // Créer le nouveau graphique avec des options complètes
      window.statusChart = new Chart(ctx, {
        type: "pie",
        data: {
          labels: statuses,
          datasets: [
            {
              data: counts,
              backgroundColor: colors.slice(0, statuses.length),
              borderColor: colors
                .slice(0, statuses.length)
                .map((c) => c.replace("0.7", "1")),
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: isMobile ? "bottom" : "right",
              labels: {
                color: textColor,
                boxWidth: isMobile ? 12 : 20,
                padding: isMobile ? 10 : 20,
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
            },
            title: {
              display: false,
              color: textColor,
            },
            tooltip: {
              enabled: true,
              bodyFont: {
                size: isMobile ? 12 : 14,
              },
              titleFont: {
                size: isMobile ? 12 : 14,
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Erreur dans generateStatusChart:", error);
    }
  }

  // Générer le graphique d'évolution des candidatures
  function generateTimelineChart(candidatures) {
    try {
      // Trier les candidatures par date
      const sortedCandidatures = candidatures
        .filter((c) => c.date_candidature || c.createdAt)
        .sort((a, b) => {
          const dateA = new Date(a.date_candidature || a.createdAt);
          const dateB = new Date(b.date_candidature || b.createdAt);
          return dateA - dateB;
        });

      if (sortedCandidatures.length === 0) return;

      // Regrouper par mois
      const monthlyData = {};
      sortedCandidatures.forEach((c) => {
        const date = new Date(c.date_candidature || c.createdAt);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
      });

      const months = Object.keys(monthlyData);
      const counts = Object.values(monthlyData);

      // Calculer le cumul
      const cumulativeCounts = [];
      let cumulative = 0;
      counts.forEach((count) => {
        cumulative += count;
        cumulativeCounts.push(cumulative);
      });

      const container = document.getElementById("timeline-chart-container");

      // Vérifier si le conteneur existe
      if (!container) {
        console.error("Élément timeline-chart-container non trouvé");
        return;
      }

      // Créer un élément canvas s'il n'existe pas déjà
      let canvas = container.querySelector("canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        container.appendChild(canvas);
      }

      // Vérifier si le canvas supporte getContext
      if (!canvas.getContext) {
        console.error("Canvas non supporté par ce navigateur");
        return;
      }

      const ctx = canvas.getContext("2d");

      // Détruire le graphique existant s'il y en a un
      if (window.timelineChart) {
        window.timelineChart.destroy();
      }

      // Déterminer la couleur du texte en fonction du thème
      const isDarkMode = document.body.getAttribute("data-theme") === "dark";
      const textColor = isDarkMode ? "#F1F1F1" : "#333333";
      const gridColor = isDarkMode
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";

      // Vérifier si on est sur mobile
      const isMobile = window.innerWidth <= 768;

      // Créer le nouveau graphique avec des options complètes
      window.timelineChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: months,
          datasets: [
            {
              label: "Candidatures par mois",
              data: counts,
              backgroundColor: "rgba(10, 102, 195, 0.7)",
              borderColor: "rgba(10, 102, 195, 1)",
              borderWidth: 1,
              order: 2,
            },
            {
              label: "Cumul des candidatures",
              data: cumulativeCounts,
              borderColor: "rgba(220, 53, 69, 1)",
              backgroundColor: "rgba(0, 0, 0, 0)",
              borderWidth: 2,
              type: "line",
              yAxisID: "y1",
              order: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: {
                color: textColor,
                maxRotation: isMobile ? 90 : 0,
                minRotation: isMobile ? 45 : 0,
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
              grid: {
                color: gridColor,
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: textColor,
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
              grid: {
                color: gridColor,
              },
            },
            y1: {
              beginAtZero: true,
              position: "right",
              display: !isMobile, // Masquer le deuxième axe Y sur mobile
              grid: {
                drawOnChartArea: false,
                color: gridColor,
              },
              ticks: {
                color: textColor,
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
            },
          },
          plugins: {
            legend: {
              position: isMobile ? "bottom" : "top",
              labels: {
                color: textColor,
                boxWidth: isMobile ? 12 : 20,
                padding: isMobile ? 10 : 20,
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
            },
            title: {
              display: false,
              color: textColor,
            },
            tooltip: {
              enabled: true,
              bodyFont: {
                size: isMobile ? 12 : 14,
              },
              titleFont: {
                size: isMobile ? 12 : 14,
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Erreur dans generateTimelineChart:", error);
    }
  }

  // Graphique de répartition par source (bar chart dans #source-chart-container)
  let sourceChartInstance = null;
  function generateSourceChart(candidatures) {
    try {
      const container = document.getElementById("source-chart-container");
      if (!container) return;

      // Construire le comptage dynamique
      const sourceCounts = {};
      candidatures.forEach((c) => {
        let src = c.source || "";
        if (!src) {
          const link = c.applicationLink || c.link || "";
          src = link.includes("linkedin.com") ? "LinkedIn"
              : link.includes("indeed.com") ? "Indeed"
              : link.includes("glassdoor.com") ? "Glassdoor"
              : "Direct";
        }
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });

      const labels = Object.keys(sourceCounts).sort((a, b) => sourceCounts[b] - sourceCounts[a]);
      const values = labels.map(l => sourceCounts[l]);

      const emptyMsg = document.getElementById("source-chart-empty");

      if (labels.length === 0) {
        const canvas = container.querySelector("canvas");
        if (canvas) canvas.style.display = "none";
        if (emptyMsg) emptyMsg.style.display = "block";
        return;
      }
      if (emptyMsg) emptyMsg.style.display = "none";

      let canvas = container.querySelector("canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "source-chart";
        container.appendChild(canvas);
      }
      canvas.style.display = "block";

      const KNOWN_COLORS = { LinkedIn: "#0a66c2", Indeed: "#2164f3", Glassdoor: "#0caa41", Direct: "#666" };
      const EXTRA_COLORS = ["#9c27b0", "#e91e63", "#ff5722", "#00bcd4", "#8bc34a", "#ff9800", "#607d8b", "#4285f4"];
      const bgColors = labels.map((l, i) => KNOWN_COLORS[l] || EXTRA_COLORS[i % EXTRA_COLORS.length]);

      if (sourceChartInstance) sourceChartInstance.destroy();

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
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} candidature(s)` } },
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: "rgba(128,128,128,0.1)" } },
            x: { ticks: { font: { size: 11 } }, grid: { display: false } },
          },
        },
      });
    } catch (err) {
      console.error("Erreur dans generateSourceChart:", err);
    }
  }

  // Mettre à jour les détails par statut
  function updateStatusDetails(candidatures) {
    const statusList = document.getElementById("status-list");
    statusList.innerHTML = "";

    // Regrouper les candidatures par statut
    const statusGroups = {};
    candidatures.forEach((c) => {
      const status = c.statut || "Non défini";
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(c);
    });

    // Créer une carte pour chaque statut
    Object.entries(statusGroups).forEach(([status, candidates]) => {
      const statusCard = document.createElement("div");
      statusCard.className = `status-card status-${status
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      const statusHeader = document.createElement("div");
      statusHeader.className = "status-header";
      statusHeader.innerHTML = `
        <h4>${status}</h4>
        <span class="status-count">${candidates.length}</span>
      `;

      const statusBody = document.createElement("div");
      statusBody.className = "status-body";

      // Ajouter une barre de progression
      const progressBar = document.createElement("div");
      progressBar.className = "progress-bar";
      const progress = document.createElement("div");
      progress.className = "progress";
      progress.style.width = `${
        (candidates.length / candidatures.length) * 100
      }%`;
      progressBar.appendChild(progress);

      // Ajouter une description
      const statusDescription = document.createElement("div");
      statusDescription.className = "status-description";
      statusDescription.textContent = `${candidates.length} candidature(s) avec le statut "${status}"`;

      statusBody.appendChild(progressBar);
      statusBody.appendChild(statusDescription);

      statusCard.appendChild(statusHeader);
      statusCard.appendChild(statusBody);
      statusList.appendChild(statusCard);
    });
  }

  // ─── Phase 4 : Analytics ─────────────────────────────────────────────────

  function updateAdvancedStats(candidatures) {
    const advancedStats = document.getElementById("advanced-stats");
    if (!advancedStats || candidatures.length === 0) return;

    const total = candidatures.length;
    const now = Date.now();

    // Statuts considérés comme "réponse reçue"
    const hasResponse = (c) => {
      const s = (c.statut || c.status || "").toLowerCase();
      return ["interviewé", "job refusé", "job accepté", "interviewed", "job rejected", "job accepted"].includes(s);
    };

    const responded = candidatures.filter(hasResponse);
    const responseRate = total > 0 ? (responded.length / total * 100).toFixed(1) : 0;

    // ── Sources (dynamique — tout site d'emploi)
    const bySource = {};
    candidatures.forEach((c) => {
      let src = c.source || "";
      // Fallback sur l'URL si la source n'est pas renseignée
      if (!src) {
        const link = c.applicationLink || c.link || "";
        src = link.includes("linkedin.com") ? "LinkedIn"
            : link.includes("indeed.com") ? "Indeed"
            : link.includes("glassdoor.com") ? "Glassdoor"
            : "Direct";
      }
      if (!bySource[src]) bySource[src] = { total: 0, responded: 0 };
      bySource[src].total++;
      if (hasResponse(c)) bySource[src].responded++;
    });

    // ── Cadence hebdomadaire
    const weekStart = (offset = 0) => {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay() + 1 - offset * 7);
      return d.getTime();
    };
    const thisWeek = candidatures.filter(c => c.date && new Date(c.date).getTime() >= weekStart(0)).length;
    const lastWeek = candidatures.filter(c => {
      const t = c.date && new Date(c.date).getTime();
      return t && t >= weekStart(1) && t < weekStart(0);
    }).length;
    const trend = thisWeek > lastWeek ? `↑ +${thisWeek - lastWeek}` : thisWeek < lastWeek ? `↓ ${thisWeek - lastWeek}` : "→ stable";
    const trendColor = thisWeek > lastWeek ? "#34a853" : thisWeek < lastWeek ? "#ea4335" : "#aaa";

    // ── Délai moyen avant réponse (updatedAt - createdAt pour les candidatures avec réponse)
    const delays = responded
      .map(c => {
        const created = c.createdAt ? new Date(c.createdAt).getTime() : null;
        const updated = c.updatedAt ? new Date(c.updatedAt).getTime() : null;
        return (created && updated && updated > created) ? Math.round((updated - created) / 86400000) : null;
      })
      .filter(d => d !== null && d < 90);
    const avgDelay = delays.length > 0 ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(0) : null;

    // ── Meilleur jour pour postuler (jour de la semaine avec le plus de réponses)
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const responseDays = Array(7).fill(0);
    responded.forEach(c => { if (c.date) responseDays[new Date(c.date).getDay()]++; });
    const bestDayIdx = responseDays.indexOf(Math.max(...responseDays));
    const bestDay = responded.length >= 3 ? dayNames[bestDayIdx] : null;

    // ── Source bars
    const sourceHTML = Object.entries(bySource)
      .filter(([, v]) => v.total > 0)
      .map(([src, v]) => {
        const rate = v.total > 0 ? (v.responded / v.total * 100).toFixed(0) : 0;
        const pct = (v.total / total * 100).toFixed(0);
        const KNOWN_ICONS  = { LinkedIn: "🔵", Indeed: "🟠", Glassdoor: "🟢", Direct: "⚫" };
        const KNOWN_COLORS = { LinkedIn: "#0a66c2", Indeed: "#2164f3", Glassdoor: "#0caa41", Direct: "#666" };
        const EXTRA_COLORS = ["#9c27b0", "#e91e63", "#ff5722", "#00bcd4", "#8bc34a", "#ff9800", "#607d8b"];
        const srcKeys = Object.keys(bySource);
        const icon  = KNOWN_ICONS[src]  || "🟣";
        const color = KNOWN_COLORS[src] || EXTRA_COLORS[srcKeys.indexOf(src) % EXTRA_COLORS.length];
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:0.85rem;">${icon} ${src}</span>
              <span style="font-size:0.8rem;color:#aaa;">${v.total} candidatures · ${rate}% de réponse</span>
            </div>
            <div style="background:#333;border-radius:4px;height:6px;">
              <div style="width:${pct}%;background:${color};height:6px;border-radius:4px;"></div>
            </div>
          </div>`;
      }).join("");

    advancedStats.innerHTML = `
      <h3>Statistiques avancées</h3>

      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-item">
          <h4>Taux de réponse</h4>
          <p style="color:${responseRate >= 20 ? "#34a853" : responseRate >= 10 ? "#fbbc04" : "#ea4335"};">${responseRate}%</p>
        </div>
        <div class="stat-item">
          <h4>Réponses reçues</h4>
          <p>${responded.length} / ${total}</p>
        </div>
        <div class="stat-item">
          <h4>Cette semaine</h4>
          <p>${thisWeek} <span style="font-size:0.75rem;color:${trendColor};">${trend} vs S-1</span></p>
        </div>
        ${avgDelay ? `<div class="stat-item"><h4>Délai moyen réponse</h4><p>${avgDelay} jours</p></div>` : ""}
        ${bestDay ? `<div class="stat-item"><h4>Meilleur jour</h4><p>${bestDay}</p></div>` : ""}
      </div>

      <div style="margin-top:8px;">
        <h4 style="margin-bottom:14px;font-size:0.9rem;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Répartition par source</h4>
        ${sourceHTML || '<p style="color:#666;font-size:0.85rem;">Pas assez de données</p>'}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────

  // Gestion du thème sombre/clair
  function initTheme() {
    if (!themeToggle) return;

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
      if (newTheme === "dark") {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
      } else {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
      }

      // Mettre à jour les graphiques si nécessaire
      try {
        if (window.statusChart) {
          updateChartTheme(window.statusChart);
        }
        if (window.timelineChart) {
          updateChartTheme(window.timelineChart);
        }
      } catch (error) {
        console.warn("Erreur lors de la mise à jour des graphiques:", error);
      }
    });
  }

  // Mettre à jour le thème des graphiques
  function updateChartTheme(chart) {
    if (!chart || !chart.options) {
      console.warn("Graphique non défini ou sans options");
      return;
    }

    const isDarkMode = document.body.getAttribute("data-theme") === "dark";
    const textColor = isDarkMode ? "#F1F1F1" : "#333333";
    const gridColor = isDarkMode
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";

    // Vérifier si les propriétés scales et plugins existent
    if (chart.options.scales) {
      // Vérifier si l'axe x existe
      if (chart.options.scales.x) {
        if (chart.options.scales.x.ticks) {
          chart.options.scales.x.ticks.color = textColor;
        }
        if (chart.options.scales.x.grid) {
          chart.options.scales.x.grid.color = gridColor;
        }
      }

      // Vérifier si l'axe y existe
      if (chart.options.scales.y) {
        if (chart.options.scales.y.ticks) {
          chart.options.scales.y.ticks.color = textColor;
        }
        if (chart.options.scales.y.grid) {
          chart.options.scales.y.grid.color = gridColor;
        }
      }

      // Vérifier si l'axe y1 existe
      if (chart.options.scales.y1) {
        if (chart.options.scales.y1.ticks) {
          chart.options.scales.y1.ticks.color = textColor;
        }
        if (chart.options.scales.y1.grid) {
          chart.options.scales.y1.grid.color = gridColor;
        }
      }
    }

    // Vérifier si les plugins existent
    if (chart.options.plugins) {
      // Vérifier si legend existe
      if (chart.options.plugins.legend) {
        if (chart.options.plugins.legend.labels) {
          chart.options.plugins.legend.labels.color = textColor;
        }
      }

      // Vérifier si title existe
      if (chart.options.plugins.title) {
        chart.options.plugins.title.color = textColor;
      }
    }

    // Mettre à jour le graphique
    chart.update();
  }

  // Afficher les candidatures
  viewCandidaturesBtn.addEventListener("click", async function () {
    candidaturesContainer.style.display = "block";
    try {
      const candidatures = await fetchCandidatures();
      displayCandidatures(candidatures);
    } catch (error) {
      console.error("Erreur affichage candidatures:", error);
    }
  });

  // Fermer la liste des candidatures
  closeCandidaturesBtn.addEventListener("click", function () {
    candidaturesContainer.style.display = "none";
  });

  // Synchroniser avec Notion
  syncNotionBtn.addEventListener("click", function () {
    syncWithNotion();
  });

  // Ouvrir le modal pour ajouter une candidature
  newCandidatureBtn.addEventListener("click", function () {
    modal.style.display = "block";
  });

  // Fermer le modal
  closeModalBtn.addEventListener("click", function () {
    modal.style.display = "none";
  });

  // Fermer le modal en cliquant en dehors
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Soumettre le formulaire
  candidatureForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const entreprise = document.getElementById("entreprise").value;
    const poste = document.getElementById("poste").value;
    const statut = document.getElementById("statut").value;
    const cv_type = document.getElementById("cv_type").value || undefined;
    const cv_version = document.getElementById("cv_version").value || undefined;
    const contact_method = document.getElementById("contact_method").value || undefined;
    const priority = document.getElementById("priority").value || "MEDIUM";

    createCandidature(entreprise, poste, statut, { cv_type, cv_version, contact_method, priority });
  });

  // Récupérer les candidatures
  async function fetchCandidatures() {
    try {
      console.log("Récupération des candidatures depuis l'API...");
      const response = await fetch("/api/candidatures", {
        credentials: "include", // Important pour envoyer les cookies
      });

      console.log("Réponse de l'API:", response.status);

      if (!response.ok) {
        const error = new Error(`Erreur HTTP: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const candidatures = await response.json();
      console.log(`${candidatures.length} candidatures récupérées`);

      // Normaliser les candidatures
      const normalizedCandidatures = candidatures.map(normalizeCandidature);

      // Stocker les candidatures dans le stockage local pour un accès rapide
      localStorage.setItem(
        "candidatures",
        JSON.stringify(normalizedCandidatures)
      );

      return normalizedCandidatures;
    } catch (error) {
      console.error("Erreur lors de la récupération des candidatures:", error);

      // En cas d'erreur, essayer de récupérer les candidatures du stockage local
      const cachedCandidatures = JSON.parse(
        localStorage.getItem("candidatures") || "[]"
      );

      if (cachedCandidatures.length > 0 && error.status !== 401) {
        showNotification(
          "Utilisation des données en cache. Certaines informations peuvent ne pas être à jour.",
          true
        );
        return cachedCandidatures;
      }

      throw error;
    }
  }

  // Afficher les candidatures
  function displayCandidatures(candidatures) {
    // Vider la liste des candidatures
    candidaturesList.innerHTML = "";

    // Trier les candidatures par date (plus récentes en premier)
    candidatures.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    // Afficher chaque candidature
    candidatures.forEach((candidature) => {
      // Normaliser la candidature
      const normalizedCandidature = normalizeCandidature(candidature);

      // Créer la carte de candidature
      const candidatureCard = document.createElement("div");
      candidatureCard.className = "candidature-card";
      candidatureCard.dataset.id = normalizedCandidature.id;
      candidatureCard.dataset.entreprise =
        normalizedCandidature.entreprise || normalizedCandidature.company || "";
      candidatureCard.dataset.poste =
        normalizedCandidature.poste || normalizedCandidature.position || "";
      candidatureCard.dataset.statut =
        normalizedCandidature.statut || normalizedCandidature.status || "";
      candidatureCard.dataset.date = normalizedCandidature.date || "";
      candidatureCard.dataset.salaire =
        normalizedCandidature.salaire ||
        normalizedCandidature.salary ||
        "Non défini";

      // Déterminer la classe CSS en fonction du statut
      let statusClass = "";
      const status =
        normalizedCandidature.statut || normalizedCandidature.status || "";

      switch (status.toLowerCase()) {
        case "postulé":
          statusClass = "status-postule";
          break;
        case "interviewé":
          statusClass = "status-interviewe";
          break;
        case "job refusé":
          statusClass = "status-refuse";
          break;
        case "job accepté":
          statusClass = "status-accepte";
          break;
        default:
          statusClass = "";
      }

      // Ajouter la classe de statut
      if (statusClass) {
        candidatureCard.classList.add(statusClass);
      }

      // Formater la date
      const dateStr = normalizedCandidature.date
        ? new Date(normalizedCandidature.date).toLocaleDateString("fr-FR")
        : "Date inconnue";

      // Contenu de la carte
      candidatureCard.innerHTML = `
        <h3>${normalizedCandidature.entreprise || normalizedCandidature.company || "Entreprise inconnue"}</h3>
        <p><strong>Poste:</strong> ${normalizedCandidature.poste || normalizedCandidature.position || "Non spécifié"}</p>
        <p><strong>Statut:</strong> <span class="status-badge ${statusClass}">${status || "Non spécifié"}</span></p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Salaire:</strong> ${normalizedCandidature.salaire || normalizedCandidature.salary || "Non défini"}</p>
        <div class="candidature-actions">
          <button class="details-btn"><i class="fas fa-eye"></i></button>
          <button class="edit-btn"><i class="fas fa-edit"></i></button>
          <button class="delete-btn"><i class="fas fa-trash"></i></button>
        </div>
      `;

      // Ajouter la carte à la liste
      candidaturesList.appendChild(candidatureCard);
    });

    // Ajouter les écouteurs d'événements pour les boutons d'action
    const actionButtons = candidaturesList.querySelectorAll(
      ".candidature-actions button"
    );
    actionButtons.forEach((button) => {
      if (button.classList.contains("delete-btn")) {
        button.addEventListener("click", function () {
          const candidatureId = this.closest(".candidature-card").dataset.id;
          if (
            confirm("Êtes-vous sûr de vouloir supprimer cette candidature ?")
          ) {
            deleteCandidature(candidatureId);
          }
        });
      } else if (button.classList.contains("edit-btn")) {
        button.addEventListener("click", function () {
          const candidatureCard = this.closest(".candidature-card");
          showEditModal(candidatureCard.dataset);
        });
      } else if (button.classList.contains("details-btn")) {
        button.addEventListener("click", function () {
          const candidatureId = this.closest(".candidature-card").dataset.id;
          const candidatures = JSON.parse(
            localStorage.getItem("candidatures") || "[]"
          );
          const candidature = candidatures.find((c) => c.id === candidatureId);
          if (candidature) {
            showCandidatureDetails(candidature);
          }
        });
      }
      button.setAttribute("data-listener", "true");
    });
  }

  // Afficher les détails de la candidature
  function showCandidatureDetails(candidature) {
    const detailsModal = document.createElement("div");
    detailsModal.className = "details-modal";
    detailsModal.innerHTML = `
        <div class="modal-content">
            <span class="close-details">&times;</span>
            <h2>Détails de la Candidature</h2>
            <ul>
                <li><strong>Entreprise:</strong> ${candidature.entreprise}</li>
                <li><strong>Poste:</strong> ${candidature.poste}</li>
                <li><strong>Statut:</strong> ${
                  candidature.statut || "Non défini"
                }</li>
                <li><strong>Next Deadline:</strong> ${
                  candidature.nextDeadline || "Non défini"
                }</li>
                <li><strong>Salary:</strong> ${
                  candidature.salary || "Non défini"
                }</li>
                <li><strong>Application Link:</strong>
                    <button class="link-button" data-url="${
                      candidature.applicationLink || "#"
                    }">
                        ${
                          candidature.source ||
                          ((candidature.applicationLink || "").includes("linkedin.com") ? "LinkedIn"
                            : (candidature.applicationLink || "").includes("indeed.com") ? "Indeed"
                            : (candidature.applicationLink || "").includes("glassdoor.com") ? "Glassdoor"
                            : "Direct")
                        }
                    </button>
                </li>
                <li><strong>Location:</strong> ${
                  candidature.location || "Non défini"
                }</li>
                <li><strong>HR Details:</strong> ${
                  candidature.hrDetails || "Non défini"
                }</li>
            </ul>
            <div style="margin-top:16px;">
              <button id="gen-lm-btn" class="btn primary" style="width:100%;">
                ✨ Générer une lettre de motivation
              </button>
              <div id="lm-result" style="display:none;margin-top:12px;">
                <textarea id="lm-text" rows="12" style="width:100%;background:#1a1a2e;color:#e0e0e0;border:1px solid #444;border-radius:8px;padding:12px;font-size:0.85rem;resize:vertical;"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;">
                  <button id="lm-copy-btn" class="btn secondary" style="flex:1;">📋 Copier</button>
                  <button id="lm-pdf-btn" class="btn secondary" style="flex:1;">📄 PDF</button>
                </div>
              </div>
              <div style="margin-top:10px;">
                <button id="compat-score-btn" class="btn" style="width:100%;background:#2a2a3e;color:#aaa;border:1px solid #444;">
                  🎯 Analyser ma compatibilité
                </button>
                <div id="compat-result" style="display:none;margin-top:10px;padding:14px;background:#1a1a2e;border-radius:8px;border:1px solid #333;"></div>
              </div>
            </div>
        </div>
    `;

    document.body.appendChild(detailsModal);

    // Ajouter un gestionnaire d'événements pour le lien d'application
    const applicationLink = detailsModal.querySelector(".link-button");
    applicationLink.addEventListener("click", function (event) {
      event.stopPropagation();
      window.open(this.getAttribute("data-url"), "_blank");
    });

    // Générer la LM
    detailsModal.querySelector("#gen-lm-btn").addEventListener("click", async function () {
      this.textContent = "⏳ Génération en cours...";
      this.disabled = true;
      try {
        const res = await fetch("/api/ai/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            entreprise: candidature.entreprise,
            poste: candidature.poste,
            description: candidature.description || candidature.hrDetails,
            location: candidature.location,
            profile: getProfile(),
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        detailsModal.querySelector("#lm-text").value = data.coverLetter;
        detailsModal.querySelector("#lm-result").style.display = "block";
        this.textContent = "✨ Régénérer";
        this.disabled = false;
      } catch (err) {
        this.textContent = "✨ Générer une lettre de motivation";
        this.disabled = false;
        showNotification("Erreur : " + err.message, true);
      }
    });

    // Copier la LM
    detailsModal.querySelector("#lm-copy-btn").addEventListener("click", function () {
      const text = detailsModal.querySelector("#lm-text").value;
      navigator.clipboard.writeText(text).then(() => {
        this.textContent = "✅ Copié !";
        setTimeout(() => { this.textContent = "📋 Copier"; }, 2000);
      });
    });

    // Export PDF de la LM
    detailsModal.querySelector("#lm-pdf-btn").addEventListener("click", function () {
      const text = detailsModal.querySelector("#lm-text").value;
      const profile = getProfile() || {};
      const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      const entreprise = candidature.entreprise !== "Inconnu" ? candidature.entreprise : "";
      const poste = (candidature.poste || "").replace(/\s*-\s*job post\s*$/i, "").replace(/\s*\|\s*.*$/, "").trim();
      const location = (candidature.location && candidature.location !== "Inconnu") ? candidature.location : "";

      const candidatBlock = [
        profile.nom,
        profile.email,
        profile.telephone,
        profile.localisation,
      ].filter(Boolean).join("<br>");

      const destinataireBlock = [
        entreprise ? `<strong>${entreprise}</strong>` : "",
        `<em>À l'attention du service recrutement</em>`,
        location,
      ].filter(Boolean).join("<br>");

      const win = window.open("", "_blank");
      win.document.write(`<!DOCTYPE html><html lang="fr"><head>
        <meta charset="UTF-8">
        <title>LM — ${poste}${entreprise ? " chez " + entreprise : ""}</title>
        <style>
          @page { margin: 2.2cm 2.5cm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, "Times New Roman", serif; font-size: 11.5pt; color: #111; line-height: 1.65; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .candidat { font-size: 10.5pt; color: #333; }
          .candidat strong { font-size: 13pt; color: #000; display: block; margin-bottom: 4px; }
          .date-dest { text-align: right; font-size: 10.5pt; color: #333; }
          .date-dest .date { margin-bottom: 16px; }
          .objet { margin: 28px 0 28px; font-size: 10.5pt; }
          .objet strong { font-weight: bold; }
          .body { white-space: pre-wrap; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style></head><body>
        <div class="header">
          <div class="candidat">${candidatBlock || "<em>Votre nom</em>"}</div>
          <div class="date-dest">
            <div class="date">${location || "Montréal"}, le ${today}</div>
            <div class="destinataire">${destinataireBlock}</div>
          </div>
        </div>
        ${poste ? `<div class="objet"><strong>Objet :</strong> Candidature au poste de ${poste}</div>` : ""}
        <div class="body">${text.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
        <script>window.onload = () => { window.print(); };<\/script>
        </body></html>`);
      win.document.close();
    });

    // Score de compatibilité
    detailsModal.querySelector("#compat-score-btn").addEventListener("click", async function () {
      if (!getProfile()) {
        showNotification("Configure ton profil d'abord (bouton 'Mon Profil')", true);
        return;
      }
      this.textContent = "⏳ Analyse...";
      this.disabled = true;
      try {
        // Utilise le résumé compressé si disponible (cache localStorage)
        const profileSummary = await getProfileSummary();
        const body = {
          entreprise: candidature.entreprise,
          poste: candidature.poste,
          description: candidature.description || candidature.hrDetails,
        };
        if (profileSummary) {
          body.profileSummary = profileSummary;
        } else {
          body.profile = getProfile();
        }
        const res = await fetch("/api/ai/compatibility-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const color = data.score >= 70 ? "#34a853" : data.score >= 45 ? "#fbbc04" : "#ea4335";
        const resultEl = detailsModal.querySelector("#compat-result");
        resultEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="font-size:2rem;font-weight:700;color:${color};">${data.score}<span style="font-size:1rem;color:#888;">/100</span></div>
            <div style="color:#ccc;font-style:italic;">${data.verdict}</div>
          </div>
          <div style="margin-bottom:8px;"><strong style="color:#34a853;">✓ Points forts</strong><ul style="margin:4px 0 0 16px;color:#ccc;font-size:0.85rem;">
            ${(data.points_forts || []).map(p => `<li>${p}</li>`).join("")}
          </ul></div>
          ${data.points_faibles?.length ? `<div style="margin-bottom:8px;"><strong style="color:#fbbc04;">⚠ Écarts</strong><ul style="margin:4px 0 0 16px;color:#ccc;font-size:0.85rem;">
            ${data.points_faibles.map(p => `<li>${p}</li>`).join("")}
          </ul></div>` : ""}
          ${data.conseil ? `<div style="background:#1e2a1e;padding:10px;border-radius:6px;color:#aaa;font-size:0.82rem;">💡 ${data.conseil}</div>` : ""}
        `;
        resultEl.style.display = "block";
        this.textContent = "🎯 Réanalyser";
        this.disabled = false;
      } catch (err) {
        showNotification("Erreur : " + err.message, true);
        this.textContent = "🎯 Analyser ma compatibilité";
        this.disabled = false;
      }
    });

    // Fermer le modal
    detailsModal.querySelector(".close-details").addEventListener("click", () => {
      document.body.removeChild(detailsModal);
    });

    detailsModal.addEventListener("click", (event) => {
      if (event.target === detailsModal) {
        document.body.removeChild(detailsModal);
      }
    });
  }

  // Créer une candidature
  async function createCandidature(entreprise, poste, statut, extra = {}) {
    try {
      const response = await fetch("/api/candidatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entreprise, poste, statut, ...extra }),
      });

      if (response.ok) {
        showNotification("Candidature ajoutée avec succès");
        modal.style.display = "none";
        candidatureForm.reset();
        fetchCandidatures();
      } else {
        showNotification("Erreur lors de l'ajout de la candidature", true);
      }
    } catch (error) {
      showNotification("Erreur lors de l'ajout de la candidature", true);
    }
  }

  // Supprimer une candidature
  function showEditModal(dataset) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
      <div style="background:var(--card-bg,#1e1e2e);padding:24px;border-radius:12px;max-width:500px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <h3 style="margin:0 0 16px;color:var(--text-primary,#fff);">Modifier la candidature</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <label style="color:#aaa;font-size:13px;">Entreprise
            <input id="edit-entreprise" type="text" value="${dataset.entreprise || ""}"
              style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;box-sizing:border-box;">
          </label>
          <label style="color:#aaa;font-size:13px;">Poste
            <input id="edit-poste" type="text" value="${dataset.poste || ""}"
              style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;box-sizing:border-box;">
          </label>
          <label style="color:#aaa;font-size:13px;">Statut
            <select id="edit-statut"
              style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;box-sizing:border-box;">
              <option value="Postulé" ${dataset.statut==="Postulé"?"selected":""}>Postulé</option>
              <option value="Interviewé" ${dataset.statut==="Interviewé"?"selected":""}>Interviewé</option>
              <option value="Job refusé" ${dataset.statut==="Job refusé"?"selected":""}>Job refusé</option>
              <option value="Job accepté" ${dataset.statut==="Job accepté"?"selected":""}>Job accepté</option>
            </select>
          </label>
          <label style="color:#aaa;font-size:13px;">Salaire
            <input id="edit-salaire" type="text" value="${dataset.salaire || ""}"
              style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;box-sizing:border-box;">
          </label>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button id="edit-save-btn" style="flex:1;padding:10px;background:#0a66c3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Enregistrer</button>
          <button id="edit-cancel-btn" style="flex:1;padding:10px;background:#555;color:#fff;border:none;border-radius:6px;cursor:pointer;">Annuler</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById("edit-cancel-btn").addEventListener("click", () => document.body.removeChild(overlay));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) document.body.removeChild(overlay); });

    document.getElementById("edit-save-btn").addEventListener("click", async () => {
      await updateCandidature(dataset.id, {
        entreprise: document.getElementById("edit-entreprise").value,
        poste: document.getElementById("edit-poste").value,
        statut: document.getElementById("edit-statut").value,
        salaire: document.getElementById("edit-salaire").value,
      });
      document.body.removeChild(overlay);
    });
  }

  async function updateCandidature(id, data) {
    try {
      const response = await fetch(`/api/candidatures/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        showNotification("Candidature mise à jour !");
        const candidatures = await fetchCandidatures();
        displayCandidatures(candidatures);
        loadPriorities(candidatures);
      } else {
        showNotification("Erreur lors de la mise à jour", true);
      }
    } catch (e) {
      showNotification("Erreur réseau", true);
    }
  }

  async function deleteCandidature(id) {
    try {
      const response = await fetch(`/api/candidatures/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showNotification("Candidature supprimée avec succès");
        fetchCandidatures();
      } else {
        showNotification(
          "Erreur lors de la suppression de la candidature",
          true
        );
      }
    } catch (error) {
      showNotification("Erreur lors de la suppression de la candidature", true);
    }
  }

  // Synchroniser avec Notion
  async function syncWithNotion() {
    try {
      // Afficher le loader
      document.getElementById("loader").style.display = "block";

      const response = await fetch("/sync-notion", {
        method: "POST",
      });

      if (response.ok) {
        showNotification("Synchronisation avec Notion réussie");
      } else {
        showNotification("Erreur lors de la synchronisation avec Notion", true);
      }
    } catch (error) {
      showNotification("Erreur lors de la synchronisation avec Notion", true);
    } finally {
      // Masquer le loader
      document.getElementById("loader").style.display = "none";
    }
  }

  // Afficher une notification
  function showNotification(message, isError = false) {
    const notificationElement = document.getElementById("notification");
    if (notificationElement) {
      notificationElement.textContent = message;
      notificationElement.className = isError
        ? "notification error show"
        : "notification show";

      setTimeout(() => {
        notificationElement.className = notificationElement.className.replace(
          "show",
          ""
        );
      }, 3000);
    } else {
      console.warn("Élément de notification non trouvé");
      // Fallback si l'élément n'existe pas
      alert(message);
    }
  }

  function showLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "block";
  }

  function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
  }

  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendChatBtn = document.getElementById("send-chat");
  const chatMessages = document.getElementById("chat-messages");
  const minimizeBtn = document.getElementById("minimize-chat");
  const clearChatBtn = document.getElementById("clear-chat");
  const suggestionChips = document.querySelectorAll(".suggestion-chip");

  // Initialisation du chat
  function initChat() {
    const chatInput = document.getElementById("chat-input");
    const sendChatBtn = document.getElementById("send-chat");
    const chatMessages = document.getElementById("chat-messages");
    const minimizeChat = document.getElementById("minimize-chat");
    const clearChat = document.getElementById("clear-chat");
    const chatContainer = document.getElementById("chat-container");
    const suggestionChips = document.querySelectorAll(".suggestion-chip");

    // Envoyer un message en appuyant sur Entrée
    chatInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });

    // Envoyer un message en cliquant sur le bouton
    sendChatBtn.addEventListener("click", sendMessage);

    // Minimiser/maximiser le chat
    minimizeChat.addEventListener("click", function () {
      chatContainer.classList.toggle("minimized");
      const icon = minimizeChat.querySelector("i");
      if (chatContainer.classList.contains("minimized")) {
        icon.classList.remove("fa-minus");
        icon.classList.add("fa-expand");
      } else {
        icon.classList.remove("fa-expand");
        icon.classList.add("fa-minus");
      }
    });

    // Effacer l'historique du chat
    clearChat.addEventListener("click", function () {
      chatMessages.innerHTML = "";
      addBotMessage(
        "Bonjour ! Je suis votre assistant RH. Comment puis-je vous aider aujourd'hui ?"
      );
    });

    // Gérer les suggestions
    suggestionChips.forEach((chip) => {
      chip.addEventListener("click", function () {
        const question = this.textContent;
        addUserMessage(question);
        processUserQuery(question);
      });
    });
  }

  // Ajouter un message utilisateur
  function addUserMessage(message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    messageElement.className = "chat-message chat-user";
    messageElement.textContent = message;

    const timeElement = document.createElement("div");
    timeElement.className = "chat-time";
    timeElement.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageElement.appendChild(timeElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Ajouter un message du bot
  function addBotMessage(message, isChart = false) {
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages) return;

    const messageElement = document.createElement("div");
    messageElement.className = "chat-message chat-bot";

    if (isChart) {
      // Si c'est un graphique, créer un conteneur pour le graphique
      const chartContainer = document.createElement("div");
      chartContainer.style.width = "100%";
      chartContainer.style.height = "200px";
      chartContainer.id = "chat-chart-" + Date.now();
      messageElement.appendChild(chartContainer);

      // Ajouter le graphique après que le message soit ajouté au DOM
      setTimeout(() => {
        createChatChart(
          chartContainer.id,
          message.data,
          message.type,
          message.options
        );
      }, 100);
    } else {
      // Si c'est un message texte normal
      try {
        // Convertir en string si ce n'est pas déjà le cas
        const messageText =
          typeof message === "string" ? message : JSON.stringify(message);

        // Formatter le markdown nous-même
        const safeText = messageText
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        // Formatage Markdown basique sans dépendance externe
        let formattedText = safeText
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
          .replace(/\n/g, "<br>");

        messageElement.innerHTML = formattedText;
      } catch (error) {
        console.error("Erreur lors du formatage du message:", error);
        // Fallback en cas d'erreur: afficher le texte brut
        messageElement.textContent =
          typeof message === "string" ? message : "Erreur d'affichage";
      }
    }

    const timeElement = document.createElement("div");
    timeElement.className = "chat-time";
    timeElement.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageElement.appendChild(timeElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Créer un graphique dans le chat
  function createChatChart(containerId, data, type = "pie", options = {}) {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error("Conteneur de graphique introuvable:", containerId);
        return;
      }

      // Créer un canvas à l'intérieur du conteneur
      const canvas = document.createElement("canvas");
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      container.appendChild(canvas);

      // Vérifier si le canvas est supporté
      if (!canvas.getContext) {
        console.error("Canvas non supporté par ce navigateur");
        container.innerHTML =
          "<p>Graphiques non supportés par votre navigateur</p>";
        return;
      }

      // Créer le graphique
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Impossible d'obtenir le contexte 2d du canvas");
        container.innerHTML = "<p>Impossible de créer le graphique</p>";
        return;
      }

      new Chart(ctx, {
        type: type,
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la création du graphique:", error);
      const errorContainer = document.getElementById(containerId);
      if (errorContainer) {
        errorContainer.innerHTML =
          "<p>Erreur lors de la création du graphique</p>";
      }
    }
  }

  // Ajouter un message d'erreur
  function addErrorMessage(message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    messageElement.className = "chat-message chat-error";
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Afficher l'indicateur de frappe
  function showTypingIndicator() {
    const chatMessages = document.getElementById("chat-messages");
    const typingElement = document.createElement("div");
    typingElement.className = "chat-message chat-bot typing-indicator";
    typingElement.innerHTML = `
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    typingElement.id = "typing-indicator";
    chatMessages.appendChild(typingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Masquer l'indicateur de frappe
  function hideTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // Envoyer un message
  // Compteur de messages chat par session (reset à chaque chargement de page)
  let chatSessionMessages = 0;
  const CHAT_SOFT_LIMIT = 5;

  async function sendMessage() {
    const chatInput = document.getElementById("chat-input");
    const message = chatInput.value.trim();

    if (message === "") return;

    chatSessionMessages++;
    if (chatSessionMessages === CHAT_SOFT_LIMIT + 1) {
      const chatMessages = document.getElementById("chat-messages");
      const warn = document.createElement("div");
      warn.style.cssText = "text-align:center;padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:#888;border-top:1px solid rgba(255,255,255,0.06);letter-spacing:1px;text-transform:uppercase;";
      warn.textContent = "⚠ Usage élevé du chatbot — consomme des tokens";
      chatMessages.appendChild(warn);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addUserMessage(message);
    chatInput.value = "";

    showTypingIndicator();
    await processUserQuery(message);
    hideTypingIndicator();
  }

  // Traiter la requête de l'utilisateur
  async function processUserQuery(query) {
    console.log("processUserQuery - Début du traitement:", query);

    if (!query || typeof query !== "string") {
      console.error("Query invalide:", query);
      addBotMessage("Désolé, je n'ai pas compris votre demande.");
      return;
    }

    try {
      const queryLower = query.toLowerCase().trim();

      if (queryLower.includes("candidatures en attente")) {
        console.log("Requête pour candidatures en attente détectée");
        try {
          await showPendingApplications();
        } catch (error) {
          console.error("Erreur dans showPendingApplications:", error);
          addBotMessage(
            "Désolé, je n'ai pas pu récupérer les candidatures en attente."
          );
        }
      } else if (queryLower.includes("candidatures ce mois")) {
        try {
          await showMonthlyApplications();
        } catch (error) {
          console.error("Erreur dans showMonthlyApplications:", error);
          addBotMessage(
            "Désolé, je n'ai pas pu récupérer les candidatures du mois."
          );
        }
      } else if (queryLower.includes("salaire")) {
        try {
          await showAverageSalary();
        } catch (error) {
          console.error("Erreur dans showAverageSalary:", error);
          addBotMessage("Désolé, je n'ai pas pu calculer le salaire moyen.");
        }
      } else if (
        queryLower.includes("statut") ||
        queryLower.includes("répartition")
      ) {
        try {
          await showStatusDistribution();
        } catch (error) {
          console.error("Erreur dans showStatusDistribution:", error);
          addBotMessage(
            "Désolé, je n'ai pas pu récupérer la répartition des statuts."
          );
        }
      } else if (
        queryLower.includes("évolution") ||
        queryLower.includes("tendance")
      ) {
        try {
          await showApplicationTrend();
        } catch (error) {
          console.error("Erreur dans showApplicationTrend:", error);
          addBotMessage(
            "Désolé, je n'ai pas pu récupérer l'évolution des candidatures."
          );
        }
      } else {
        // Requête générale à l'API
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: query }),
          });

          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }

          const data = await response.json();
          addBotMessage(
            data.response || "Je n'ai pas de réponse à cette question."
          );
        } catch (error) {
          console.error("Erreur API:", error);
          addBotMessage(
            "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer."
          );
        }
      }
    } catch (error) {
      console.error("Erreur globale:", error);
      addBotMessage(
        "Une erreur s'est produite lors du traitement de votre demande."
      );
    }
  }

  // Afficher les candidatures en attente
  async function showPendingApplications() {
    try {
      console.log("Début de showPendingApplications");
      // Message simple de chargement
      addBotMessage("Recherche de vos candidatures en attente...");

      try {
        const response = await fetch("/api/candidatures");
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const candidatures = await response.json();
        console.log("Candidatures récupérées:", candidatures?.length || 0);

        if (!candidatures || candidatures.length === 0) {
          console.log("Aucune candidature trouvée");
          addBotMessage(
            "Vous n'avez aucune candidature en attente actuellement."
          );
          return;
        }

        // Filtrer les candidatures en attente
        const pendingApplications = candidatures.filter((c) => {
          const statut = (c.statut || c.status || "").toLowerCase().trim();
          return [
            "postulé",
            "appliqué",
            "intéressé",
            "applied",
            "interested",
          ].includes(statut);
        });

        console.log("Candidatures en attente:", pendingApplications.length);

        if (pendingApplications.length === 0) {
          addBotMessage(
            "Vous n'avez aucune candidature en attente actuellement."
          );
          return;
        }

        // Message de résultat très simple
        let message =
          "Vous avez " +
          pendingApplications.length +
          " candidatures en attente :";

        // Ajouter les candidatures au message
        pendingApplications.forEach((app, index) => {
          const entreprise =
            app.entreprise || app.company || "Entreprise inconnue";
          const poste = app.poste || app.position || "Poste non spécifié";
          message += "\n\n- " + entreprise + " - " + poste;
        });

        console.log("Envoi du message au chat");
        addBotMessage(message);
      } catch (error) {
        console.error("Erreur dans showPendingApplications:", error);
        addBotMessage(
          "Désolé, je n'ai pas pu récupérer vos candidatures. Erreur: " +
            error.message
        );
      }
    } catch (outerError) {
      console.error(
        "Erreur critique dans showPendingApplications:",
        outerError
      );
      // Éviter une possible boucle infinie en n'appelant pas addBotMessage en cas d'erreur dans la fonction elle-même
      document
        .getElementById("chat-messages")
        ?.insertAdjacentHTML(
          "beforeend",
          "<div class='chat-message chat-error'>Une erreur est survenue. Veuillez réessayer.</div>"
        );
    }
  }

  // Afficher les candidatures du mois
  async function showMonthlyApplications() {
    try {
      console.log("Récupération des candidatures du mois en cours...");

      // Message de chargement
      addBotMessage("Recherche de vos candidatures ce mois-ci...");

      const response = await fetch("/api/candidatures");
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const candidatures = await response.json();

      if (!candidatures || candidatures.length === 0) {
        addBotMessage("Vous n'avez aucune candidature enregistrée.");
        return;
      }

      // Obtenir le mois en cours
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filtrer les candidatures du mois en cours
      const monthlyApplications = candidatures.filter((candidature) => {
        const candidatureDate = new Date(
          candidature.date || candidature.createdAt
        );
        return (
          candidatureDate.getMonth() === currentMonth &&
          candidatureDate.getFullYear() === currentYear
        );
      });

      const count = monthlyApplications.length;
      console.log(`Nombre de candidatures ce mois-ci: ${count}`);

      // Afficher le message textuel d'abord
      addBotMessage(
        `Vous avez envoyé ${count} candidature${count !== 1 ? "s" : ""} ce mois-ci.`
      );

      // Ne pas créer de graphique s'il n'y a pas de candidatures
      if (count === 0) {
        return;
      }

      // Préparer les données pour le graphique si nécessaire et qu'il y a des candidatures
      if (count > 0) {
        // Regrouper par statut
        const statusCount = {};
        monthlyApplications.forEach((app) => {
          const status = app.statut || app.status || "Non défini";
          statusCount[status] = (statusCount[status] || 0) + 1;
        });

        // Créer les données pour le graphique
        const chartData = {
          labels: Object.keys(statusCount),
          datasets: [
            {
              label: "Statut des candidatures",
              data: Object.values(statusCount),
              backgroundColor: [
                "#4CAF50", // Vert
                "#2196F3", // Bleu
                "#FFC107", // Jaune
                "#F44336", // Rouge
                "#9C27B0", // Violet
              ],
            },
          ],
        };

        // Ajouter le graphique
        addBotMessage(
          {
            type: "pie",
            data: chartData,
            options: {
              plugins: {
                title: {
                  display: true,
                  text: `Répartition des ${count} candidatures de ce mois`,
                },
              },
            },
          },
          true
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'affichage des candidatures du mois:",
        error
      );
      addBotMessage(
        "Désolé, je n'ai pas pu récupérer les candidatures de ce mois-ci."
      );
    }
  }

  // Afficher le salaire moyen
  async function showAverageSalary() {
    try {
      const response = await fetch("/api/candidatures");
      const candidatures = await response.json();

      const candidaturesWithSalary = candidatures.filter(
        (c) => c.salary && !isNaN(parseFloat(c.salary))
      );

      if (candidaturesWithSalary.length === 0) {
        addBotMessage(
          "Aucune information de salaire n'est disponible dans vos candidatures."
        );
        return;
      }

      const salaries = candidaturesWithSalary.map((c) => parseFloat(c.salary));
      const averageSalary =
        salaries.reduce((a, b) => a + b, 0) / salaries.length;
      const minSalary = Math.min(...salaries);
      const maxSalary = Math.max(...salaries);

      addBotMessage(
        `Le salaire moyen de vos candidatures est de **${averageSalary.toFixed(
          2
        )}€**. Le salaire minimum est de **${minSalary}€** et le maximum est de **${maxSalary}€**.`
      );

      // Ajouter un graphique
      const chartData = {
        labels: candidaturesWithSalary.map((c) => c.entreprise),
        datasets: [
          {
            label: "Salaire (€)",
            data: salaries,
            backgroundColor: "rgba(10, 102, 195, 0.7)",
            borderColor: "rgba(10, 102, 195, 1)",
            borderWidth: 1,
          },
        ],
      };

      addBotMessage(
        {
          type: "bar",
          data: chartData,
          options: {
            plugins: {
              title: {
                display: true,
                text: "Salaires par entreprise",
              },
            },
          },
        },
        true
      );
    } catch (error) {
      console.error("Erreur:", error);
      addErrorMessage(
        "Désolé, je n'ai pas pu récupérer les informations de salaire."
      );
    }
  }

  // Afficher la répartition des statuts
  async function showStatusDistribution() {
    try {
      const response = await fetch("/api/candidatures");
      const candidatures = await response.json();

      const statusCounts = {};
      candidatures.forEach((c) => {
        const status = c.statut || "Non défini";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statuses = Object.keys(statusCounts);
      const counts = Object.values(statusCounts);

      // Définir des couleurs pour chaque statut
      const colors = [
        "rgba(10, 102, 195, 0.7)", // Bleu LinkedIn
        "rgba(40, 167, 69, 0.7)", // Vert
        "rgba(255, 193, 7, 0.7)", // Jaune
        "rgba(220, 53, 69, 0.7)", // Rouge
        "rgba(108, 117, 125, 0.7)", // Gris
      ];

      const chartData = {
        labels: statuses,
        datasets: [
          {
            data: counts,
            backgroundColor: colors.slice(0, statuses.length),
            borderColor: colors
              .slice(0, statuses.length)
              .map((c) => c.replace("0.7", "1")),
            borderWidth: 1,
          },
        ],
      };

      let message = "Voici la répartition de vos candidatures par statut :\n\n";
      statuses.forEach((status, index) => {
        message += `- **${status}**: ${counts[index]} candidatures\n`;
      });

      addBotMessage(message);

      // Ajouter un graphique
      addBotMessage(
        {
          type: "pie",
          data: chartData,
          options: {
            plugins: {
              title: {
                display: true,
                text: "Répartition par statut",
              },
            },
          },
        },
        true
      );
    } catch (error) {
      console.error("Erreur:", error);
      addErrorMessage(
        "Désolé, je n'ai pas pu récupérer la répartition des statuts."
      );
    }
  }

  // Afficher l'évolution des candidatures
  async function showApplicationTrend() {
    try {
      const response = await fetch("/api/candidatures");
      const candidatures = await response.json();

      // Trier les candidatures par date
      const sortedCandidatures = candidatures
        .filter((c) => c.date_candidature || c.createdAt)
        .sort((a, b) => {
          const dateA = new Date(a.date_candidature || a.createdAt);
          const dateB = new Date(b.date_candidature || b.createdAt);
          return dateA - dateB;
        });

      if (sortedCandidatures.length === 0) {
        addBotMessage(
          "Aucune donnée temporelle n'est disponible pour vos candidatures."
        );
        return;
      }

      // Regrouper par mois
      const monthlyData = {};
      sortedCandidatures.forEach((c) => {
        const date = new Date(c.date_candidature || c.createdAt);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
      });

      const months = Object.keys(monthlyData);
      const counts = Object.values(monthlyData);

      // Calculer le cumul
      const cumulativeCounts = [];
      let cumulative = 0;
      counts.forEach((count) => {
        cumulative += count;
        cumulativeCounts.push(cumulative);
      });

      const chartData = {
        labels: months,
        datasets: [
          {
            label: "Candidatures par mois",
            data: counts,
            backgroundColor: "rgba(10, 102, 195, 0.7)",
            borderColor: "rgba(10, 102, 195, 1)",
            borderWidth: 1,
            type: "bar",
          },
          {
            label: "Cumul des candidatures",
            data: cumulativeCounts,
            borderColor: "rgba(220, 53, 69, 1)",
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderWidth: 2,
            type: "line",
            yAxisID: "y1",
          },
        ],
      };

      addBotMessage("Voici l'évolution de vos candidatures au fil du temps :");

      // Ajouter un graphique
      addBotMessage(
        {
          type: "bar",
          data: chartData,
          options: {
            plugins: {
              title: {
                display: true,
                text: "Évolution des candidatures",
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Candidatures par mois",
                },
              },
              y1: {
                beginAtZero: true,
                position: "right",
                title: {
                  display: true,
                  text: "Cumul des candidatures",
                },
                grid: {
                  drawOnChartArea: false,
                },
              },
            },
          },
        },
        true
      );
    } catch (error) {
      console.error("Erreur:", error);
      addErrorMessage(
        "Désolé, je n'ai pas pu récupérer l'évolution des candidatures."
      );
    }
  }

  // Afficher un message de bienvenue
  function showWelcomeMessage() {
    addBotMessage(
      "Bonjour ! Je suis votre assistant RH. Je peux vous aider à analyser vos candidatures et vous fournir des statistiques. Comment puis-je vous aider aujourd'hui ?"
    );
  }

  /**
   * Initialise les paramètres utilisateur
   * Charge les paramètres depuis le stockage local ou utilise les valeurs par défaut
   */
  function initUserSettings() {
    // Vérifier si le bouton des paramètres existe
    if (!settingsBtn) return;

    // Charger les paramètres utilisateur depuis le stockage local
    const userSettings = JSON.parse(
      localStorage.getItem("userSettings") || "{}"
    );

    // Ajouter un écouteur d'événement pour le bouton des paramètres
    settingsBtn.addEventListener("click", function () {
      showSettingsModal(userSettings);
    });
  }

  /**
   * Affiche la modal des paramètres utilisateur
   * @param {Object} settings - Les paramètres actuels de l'utilisateur
   */
  function showSettingsModal(settings) {
    // Créer la modal des paramètres
    const settingsModal = document.createElement("div");
    settingsModal.className = "modal settings-modal";
    settingsModal.id = "settings-modal";

    // Contenu de la modal
    settingsModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Paramètres</h2>
        <form id="settings-form">
          <div class="settings-section">
            <h3>Intégration Notion (optionnel)</h3>
            <div class="form-group">
              <label for="notion-token">Token Notion</label>
              <input type="password" id="notion-token" name="notion-token" placeholder="Votre token Notion" value="${settings.notionToken || ""}">
            </div>
            <div class="form-group">
              <label for="notion-database-id">ID de la base de données Notion</label>
              <input type="text" id="notion-database-id" name="notion-database-id" placeholder="ID de votre base de données Notion" value="${settings.notionDatabaseId || ""}">
            </div>
          </div>
          
          <div class="settings-section">
            <h3>Intégration Perplexity (optionnel)</h3>
            <div class="form-group">
              <label for="perplexity-api-key">Clé API Perplexity</label>
              <input type="password" id="perplexity-api-key" name="perplexity-api-key" placeholder="Votre clé API Perplexity" value="${settings.perplexityApiKey || ""}">
            </div>
          </div>
          
          <div class="settings-section">
            <h3>Préférences d'affichage</h3>
            <div class="form-group">
              <label for="default-theme">Thème par défaut</label>
              <select id="default-theme" name="default-theme">
                <option value="light" ${settings.defaultTheme === "light" ? "selected" : ""}>Clair</option>
                <option value="dark" ${settings.defaultTheme === "dark" ? "selected" : ""}>Sombre</option>
                <option value="system" ${!settings.defaultTheme || settings.defaultTheme === "system" ? "selected" : ""}>Système</option>
              </select>
            </div>
          </div>
          
          <button type="submit" class="btn success">Enregistrer</button>
        </form>
      </div>
    `;

    // Ajouter la modal au document
    document.body.appendChild(settingsModal);

    // Afficher la modal
    settingsModal.style.display = "block";

    // Gérer la fermeture de la modal
    const closeBtn = settingsModal.querySelector(".close");
    closeBtn.addEventListener("click", function () {
      settingsModal.style.display = "none";
      document.body.removeChild(settingsModal);
    });

    // Gérer la soumission du formulaire
    const settingsForm = document.getElementById("settings-form");
    settingsForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Récupérer les valeurs du formulaire
      const notionToken = document.getElementById("notion-token").value;
      const notionDatabaseId =
        document.getElementById("notion-database-id").value;
      const perplexityApiKey =
        document.getElementById("perplexity-api-key").value;
      const defaultTheme = document.getElementById("default-theme").value;

      // Enregistrer les paramètres
      const newSettings = {
        notionToken,
        notionDatabaseId,
        perplexityApiKey,
        defaultTheme,
      };

      // Sauvegarder dans le stockage local
      localStorage.setItem("userSettings", JSON.stringify(newSettings));

      // Appliquer les paramètres
      applyUserSettings(newSettings);

      // Fermer la modal
      settingsModal.style.display = "none";
      document.body.removeChild(settingsModal);

      // Afficher une notification
      showNotification("Paramètres enregistrés avec succès");
    });
  }

  /**
   * Applique les paramètres utilisateur
   * @param {Object} settings - Les paramètres à appliquer
   */
  function applyUserSettings(settings) {
    // Appliquer le thème
    if (settings.defaultTheme && settings.defaultTheme !== "system") {
      document.body.setAttribute("data-theme", settings.defaultTheme);
      localStorage.setItem("theme", settings.defaultTheme);

      // Mettre à jour l'icône du bouton de thème
      if (themeIcon) {
        themeIcon.className =
          settings.defaultTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
      }
    }

    // Synchroniser les paramètres avec le serveur
    syncUserSettings(settings);
  }

  /**
   * Synchronise les paramètres utilisateur avec le serveur
   * @param {Object} settings - Les paramètres à synchroniser
   */
  async function syncUserSettings(settings) {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notionToken: settings.notionToken,
          notionDatabaseId: settings.notionDatabaseId,
          perplexityApiKey: settings.perplexityApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la synchronisation des paramètres");
      }

      const data = await response.json();
      console.log("Paramètres synchronisés avec succès:", data);
    } catch (error) {
      console.error("Erreur lors de la synchronisation des paramètres:", error);
      // Ne pas afficher d'erreur à l'utilisateur, car cette fonctionnalité est optionnelle
    }
  }

  /**
   * Normalise les données de candidature
   * Assure que toutes les valeurs sont correctement formatées et francisées
   * @param {Object} candidature - La candidature à normaliser
   * @returns {Object} La candidature normalisée
   */
  function normalizeCandidature(candidature) {
    // Copier la candidature pour éviter de modifier l'original
    const normalized = { ...candidature };

    // Normaliser le statut
    if (normalized.status) {
      switch (normalized.status.toLowerCase()) {
        case "applied":
          normalized.status = "Postulé";
          break;
        case "interested":
          normalized.status = "Intéressé";
          break;
        case "interviewed":
          normalized.status = "Interviewé";
          break;
        case "job rejected":
          normalized.status = "Job refusé";
          break;
        case "job accepted":
          normalized.status = "Job accepté";
          break;
      }
    }

    // S'assurer que statut est également mis à jour
    normalized.statut = normalized.status;

    // Normaliser le salaire
    if (
      !normalized.salary ||
      normalized.salary === "" ||
      normalized.salary === 0
    ) {
      normalized.salary = "Non défini";
    }

    // S'assurer que salaire est également mis à jour
    normalized.salaire = normalized.salary;

    // Harmoniser link / applicationLink
    normalized.applicationLink = normalized.applicationLink || normalized.link || "";

    return normalized;
  }

  // Ajouter un écouteur d'événement pour le bouton de déconnexion
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      logout();
    });
  }

  // ─── Profil utilisateur ───────────────────────────────────────────────────

  function getProfile() {
    try { return JSON.parse(localStorage.getItem("userProfile") || "null"); } catch { return null; }
  }

  function saveProfile(profile) {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    // Invalide le résumé compressé si le profil change
    localStorage.removeItem("userProfileSummary");
  }

  // Retourne un résumé compressé du profil (généré une fois, mis en cache)
  async function getProfileSummary() {
    const profile = getProfile();
    if (!profile) return null;

    const profileHash = JSON.stringify(profile);
    try {
      const cached = JSON.parse(localStorage.getItem("userProfileSummary") || "null");
      if (cached && cached.hash === profileHash) return cached.summary;
    } catch { /* ignore */ }

    // Génère le résumé compressé
    try {
      const res = await fetch("/api/ai/compress-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("userProfileSummary", JSON.stringify({ summary: data.summary, hash: profileHash }));
        return data.summary;
      }
    } catch { /* fallback */ }

    // Fallback : profil complet si la compression échoue
    return null;
  }

  function showProfileModal() {
    const profile = getProfile() || {};
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;box-sizing:border-box;";
    overlay.innerHTML = `
      <div style="background:#1e1e2e;padding:28px;border-radius:14px;max-width:600px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="margin:0;color:#fff;">👤 Mon Profil</h3>
          <label style="background:#4285f4;color:white;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;">
            📄 Importer un CV (PDF)
            <input type="file" id="cv-upload" accept=".pdf" style="display:none;">
          </label>
        </div>
        <div id="cv-parsing-status" style="display:none;padding:10px;background:#1a2a1a;border-radius:8px;margin-bottom:16px;color:#34a853;font-size:0.85rem;">
          ⏳ Analyse du CV en cours...
        </div>
        <div style="display:grid;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Nom complet</label>
              <input id="p-nom" type="text" value="${profile.nom || ""}" placeholder="Jean Dupont"
                style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;box-sizing:border-box;">
            </div>
            <div>
              <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Titre / Poste recherché</label>
              <input id="p-titre" type="text" value="${profile.titre || ""}" placeholder="Développeur Full Stack"
                style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;box-sizing:border-box;">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Années d'expérience</label>
              <input id="p-exp" type="text" value="${profile.anneesExperience || ""}" placeholder="5 ans"
                style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;box-sizing:border-box;">
            </div>
            <div>
              <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Langues</label>
              <input id="p-langues" type="text" value="${(profile.langues || []).join(", ")}" placeholder="Français, Anglais"
                style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;box-sizing:border-box;">
            </div>
          </div>
          <div>
            <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Résumé professionnel</label>
            <textarea id="p-resume" rows="3" placeholder="Développeur passionné avec X ans d'expérience..."
              style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;resize:vertical;box-sizing:border-box;">${profile.resume || ""}</textarea>
          </div>
          <div>
            <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Compétences clés</label>
            <textarea id="p-competences" rows="2" placeholder="Leadership, Résolution de problèmes, Agilité..."
              style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;resize:vertical;box-sizing:border-box;">${(profile.competencesCles || []).join(", ")}</textarea>
          </div>
          <div>
            <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Technologies</label>
            <textarea id="p-tech" rows="2" placeholder="React, Node.js, Python, PostgreSQL..."
              style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;resize:vertical;box-sizing:border-box;">${(profile.technologies || []).join(", ")}</textarea>
          </div>
          <div>
            <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:4px;">Points forts (pour les LM)</label>
            <textarea id="p-points" rows="2" placeholder="Ex: Capacité à livrer rapidement, sens du client..."
              style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px 10px;border-radius:6px;resize:vertical;box-sizing:border-box;">${(profile.pointsForts || []).join(", ")}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button id="p-save-btn" class="btn success" style="flex:1;">💾 Sauvegarder</button>
          <button id="p-cancel-btn" class="btn" style="flex:0 0 auto;">Annuler</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Import CV
    overlay.querySelector("#cv-upload").addEventListener("change", async function () {
      if (!this.files[0]) return;
      const status = overlay.querySelector("#cv-parsing-status");
      status.style.display = "block";
      status.textContent = "⏳ Analyse du CV en cours...";
      try {
        const formData = new FormData();
        formData.append("cv", this.files[0]);
        const res = await fetch("/api/ai/parse-cv", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const p = data.profile;
        // Pré-remplir les champs
        if (p.nom) overlay.querySelector("#p-nom").value = p.nom;
        if (p.titre) overlay.querySelector("#p-titre").value = p.titre;
        if (p.anneesExperience) overlay.querySelector("#p-exp").value = p.anneesExperience;
        if (p.langues?.length) overlay.querySelector("#p-langues").value = p.langues.join(", ");
        if (p.resume) overlay.querySelector("#p-resume").value = p.resume;
        if (p.competencesCles?.length) overlay.querySelector("#p-competences").value = p.competencesCles.join(", ");
        if (p.technologies?.length) overlay.querySelector("#p-tech").value = p.technologies.join(", ");
        if (p.pointsForts?.length) overlay.querySelector("#p-points").value = p.pointsForts.join(", ");
        status.style.background = "#1a2a1a";
        status.style.color = "#34a853";
        status.textContent = "✅ CV importé ! Vérifie et ajuste les infos avant de sauvegarder.";
      } catch (err) {
        status.style.background = "#2a1a1a";
        status.style.color = "#ea4335";
        status.textContent = "❌ Erreur : " + err.message;
      }
    });

    // Sauvegarder
    overlay.querySelector("#p-save-btn").addEventListener("click", () => {
      const profile = {
        nom: overlay.querySelector("#p-nom").value.trim(),
        titre: overlay.querySelector("#p-titre").value.trim(),
        anneesExperience: overlay.querySelector("#p-exp").value.trim(),
        langues: overlay.querySelector("#p-langues").value.split(",").map(s => s.trim()).filter(Boolean),
        resume: overlay.querySelector("#p-resume").value.trim(),
        competencesCles: overlay.querySelector("#p-competences").value.split(",").map(s => s.trim()).filter(Boolean),
        technologies: overlay.querySelector("#p-tech").value.split(",").map(s => s.trim()).filter(Boolean),
        pointsForts: overlay.querySelector("#p-points").value.split(",").map(s => s.trim()).filter(Boolean),
      };
      saveProfile(profile);
      document.body.removeChild(overlay);
      showNotification("Profil sauvegardé !");
    });

    overlay.querySelector("#p-cancel-btn").addEventListener("click", () => document.body.removeChild(overlay));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  }

  document.getElementById("open-profile-btn")?.addEventListener("click", showProfileModal);

  // ──────────────────────────────────────────────────────────────────────────

  // Bouton Token Extension
  const copyTokenBtn = document.getElementById("copy-extension-token");
  if (copyTokenBtn) {
    copyTokenBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/token", { credentials: "include" });
        const data = await res.json();
        if (!data.success || !data.token) {
          alert("Impossible de récupérer le token. Reconnecte-toi.");
          return;
        }
        showTokenModal(data.token);
      } catch (e) {
        alert("Erreur réseau.");
      }
    });
  }

  function showEmailModal(entreprise, poste, emailText) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
    overlay.innerHTML = `
      <div style="background:#1e1e2e;padding:24px;border-radius:14px;max-width:560px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;color:#fff;">📧 Email de relance — ${entreprise}</h3>
          <button id="close-email-modal" style="background:none;border:none;color:#aaa;font-size:1.4rem;cursor:pointer;">×</button>
        </div>
        <p style="color:#888;font-size:0.8rem;margin:0 0 10px;">${poste}</p>
        <textarea id="email-text" rows="10" style="width:100%;background:#111;border:1px solid #333;color:#e0e0e0;padding:12px;border-radius:8px;font-size:0.85rem;resize:vertical;box-sizing:border-box;">${emailText}</textarea>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button id="copy-email-btn" class="btn secondary" style="flex:1;">📋 Copier</button>
          <button id="close-email-btn" class="btn" style="flex:0 0 auto;">Fermer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#copy-email-btn").addEventListener("click", function () {
      navigator.clipboard.writeText(overlay.querySelector("#email-text").value).then(() => {
        this.textContent = "✅ Copié !";
        setTimeout(() => { this.textContent = "📋 Copier"; }, 2000);
      });
    });
    const close = () => document.body.removeChild(overlay);
    overlay.querySelector("#close-email-modal").addEventListener("click", close);
    overlay.querySelector("#close-email-btn").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  }

  function showTokenModal(token) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
      <div style="background:#1e1e2e;padding:24px;border-radius:12px;max-width:540px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <h3 style="margin:0 0 8px;color:#fff;">🧩 Token Extension Chrome</h3>
        <p style="margin:0 0 12px;color:#aaa;font-size:13px;">Colle ce token dans le popup de l'extension → champ "Token d'authentification".</p>
        <div style="position:relative;">
          <input id="modal-token-input" type="password" readonly
            style="width:100%;padding:10px 44px 10px 10px;border-radius:6px;border:1px solid #444;
                   background:#111;color:#fff;font-size:11px;font-family:monospace;box-sizing:border-box;"
            value="${token}">
          <button id="modal-toggle-btn"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#aaa;cursor:pointer;font-size:18px;padding:0;">👁</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button id="modal-copy-btn" style="flex:1;padding:10px;background:#0a66c3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Copier</button>
          <button id="modal-close-btn" style="flex:1;padding:10px;background:#555;color:#fff;border:none;border-radius:6px;cursor:pointer;">Fermer</button>
        </div>
      </div>`;
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
      setTimeout(() => document.body.removeChild(overlay), 1200);
    });

    document.getElementById("modal-close-btn").addEventListener("click", () => document.body.removeChild(overlay));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  }

  // ─── Phase 2 : Priorités du jour ──────────────────────────────────────────

  function loadPriorities(candidatures) {
    const section = document.getElementById("priorities-section");
    if (!section) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Compteur aujourd'hui
    const todayCount = candidatures.filter((c) => {
      const d = c.date ? new Date(c.date) : null;
      return d && d >= todayStart;
    }).length;

    const goal = parseInt(localStorage.getItem("dailyGoal") || "5");
    document.getElementById("today-count").textContent = todayCount;
    document.getElementById("goal-target").textContent = goal;
    const pct = Math.min((todayCount / goal) * 100, 100);
    const bar = document.getElementById("goal-progress");
    bar.style.width = pct + "%";
    if (pct >= 100) bar.classList.add("complete"); else bar.classList.remove("complete");

    // À relancer : statut "Postulé" depuis > 7 jours
    const toFollow = candidatures.filter((c) => {
      const statut = (c.statut || c.status || "").toLowerCase();
      const d = c.date ? new Date(c.date) : null;
      return statut === "postulé" && d && d < sevenDaysAgo;
    });

    const badge = document.getElementById("followup-badge");
    badge.textContent = toFollow.length;
    badge.className = "followup-badge" + (toFollow.length === 0 ? " zero" : "");

    const list = document.getElementById("followup-list");
    if (toFollow.length === 0) {
      list.innerHTML = '<p class="empty-priorities">Aucune candidature à relancer 🎉</p>';
    } else {
      list.innerHTML = toFollow.map((c) => {
        const days = Math.floor((Date.now() - new Date(c.date)) / 86400000);
        return `
          <div class="followup-item" data-id="${c.id}" data-entreprise="${c.entreprise || ""}" data-poste="${c.poste || ""}" data-days="${days}">
            <div class="followup-info">
              <strong>${c.entreprise || "?"}</strong>
              <span>${c.poste || ""} · <span class="followup-days">${days}j</span></span>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="followup-email-btn quick-status-select" title="Générer email de relance" style="background:#1a73e8;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:pointer;">📧</button>
              <select class="quick-status-select" data-id="${c.id}">
                <option value="">Statut</option>
                <option value="Interviewé">Interviewé</option>
                <option value="Job refusé">Job refusé</option>
                <option value="Job accepté">Job accepté</option>
              </select>
            </div>
          </div>`;
      }).join("");

      list.querySelectorAll(".quick-status-select").forEach((sel) => {
        if (sel.tagName === "SELECT") {
          sel.addEventListener("change", async function () {
            if (!this.value) return;
            await updateCandidature(this.dataset.id, { statut: this.value });
          });
        }
      });

      list.querySelectorAll(".followup-email-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const item = this.closest(".followup-item");
          const entreprise = item.dataset.entreprise;
          const poste = item.dataset.poste;
          const days = item.dataset.days;
          btn.textContent = "⏳";
          btn.disabled = true;
          try {
            const res = await fetch("/api/ai/follow-up-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ entreprise, poste, daysSince: days, profile: getProfile() }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            showEmailModal(entreprise, poste, data.email);
          } catch (err) {
            showNotification("Erreur : " + err.message, true);
          } finally {
            btn.textContent = "📧";
            btn.disabled = false;
          }
        });
      });
    }

    section.style.display = "block";
  }

  // Objectif quotidien modifiable
  document.getElementById("edit-goal-btn")?.addEventListener("click", () => {
    const current = localStorage.getItem("dailyGoal") || "5";
    const val = prompt("Objectif quotidien de candidatures :", current);
    if (val && !isNaN(val) && parseInt(val) > 0) {
      localStorage.setItem("dailyGoal", parseInt(val));
      fetchCandidatures().then(loadPriorities);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────

  // Mettre à jour les statistiques avec les candidatures
  // ── Filtrage avancé des candidatures ──────────────────────────────────────
  function applyAdvancedFilters(candidatures) {
    const cvType = document.getElementById("filter-cv-type")?.value || "all";
    const cvVersion = document.getElementById("filter-cv-version")?.value || "all";
    const contactMethod = document.getElementById("filter-contact-method")?.value || "all";
    const priority = document.getElementById("filter-priority")?.value || "all";
    const followUpWeek = document.getElementById("filter-follow-up-week")?.checked || false;

    return candidatures.filter((c) => {
      if (cvType !== "all" && c.cv_type !== cvType) return false;
      if (cvVersion !== "all" && c.cv_version !== cvVersion) return false;
      if (contactMethod !== "all" && c.contact_method !== contactMethod) return false;
      if (priority !== "all" && c.priority !== priority) return false;
      if (followUpWeek) {
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        if (!c.follow_up_date || new Date(c.follow_up_date) > weekFromNow) return false;
      }
      return true;
    });
  }

  // Listeners pour les nouveaux filtres — rechargent les stats
  ["filter-cv-type", "filter-cv-version", "filter-contact-method", "filter-priority"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      fetchCandidatures().then(updateStats).catch(console.error);
    });
  });
  document.getElementById("filter-follow-up-week")?.addEventListener("change", () => {
    fetchCandidatures().then(updateStats).catch(console.error);
  });

  // ── Nouvelles métriques ────────────────────────────────────────────────────
  function updateNewMetrics(candidatures) {
    // Total relances
    const totalFollowups = candidatures.reduce((sum, c) => sum + (c.follow_up_count || 0), 0);
    const el1 = document.getElementById("total-followups");
    if (el1) el1.textContent = totalFollowups;

    // Délai moyen de réponse
    const hasResponse = (c) => {
      const s = (c.statut || c.status || "").toLowerCase();
      return ["interviewé", "job refusé", "job accepté"].includes(s);
    };
    const responded = candidatures.filter(hasResponse);
    const delays = responded
      .map((c) => {
        if (!c.response_date || !c.date) return null;
        const diff = (new Date(c.response_date) - new Date(c.date)) / 86400000;
        return diff > 0 && diff < 90 ? diff : null;
      })
      .filter((d) => d !== null);
    const el2 = document.getElementById("avg-response-time");
    if (el2) el2.textContent = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) + " jours" : "—";

    // Entretiens planifiés
    const interviews = candidatures.filter((c) => c.interview_date && new Date(c.interview_date) >= new Date());
    const el3 = document.getElementById("planned-interviews");
    if (el3) el3.textContent = interviews.length;

    // Haute priorité
    const highPriority = candidatures.filter((c) => c.priority === "HIGH");
    const el4 = document.getElementById("high-priority-count");
    if (el4) el4.textContent = highPriority.length;

    // Charts : réponses par méthode de contact
    generateResponseByMethodChart(candidatures);
    generateResponseByCvChart(candidatures);
  }

  function generateResponseByMethodChart(candidatures) {
    const canvas = document.getElementById("response-by-method-chart");
    if (!canvas) return;

    const hasResponse = (c) => ["interviewé", "job refusé", "job accepté"].includes((c.statut || "").toLowerCase());
    const methods = {};
    candidatures.forEach((c) => {
      const m = c.contact_method || "Non défini";
      if (!methods[m]) methods[m] = { total: 0, responded: 0 };
      methods[m].total++;
      if (hasResponse(c)) methods[m].responded++;
    });

    const labels = Object.keys(methods);
    const rates = labels.map((l) => methods[l].total > 0 ? ((methods[l].responded / methods[l].total) * 100).toFixed(1) : 0);

    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels.map((l) => l === "LINKEDIN_EASY_APPLY" ? "LinkedIn" : l === "MAIL_DIRECT" ? "Mail direct" : l === "SITE_CARRIÈRE" ? "Site carrière" : l),
        datasets: [{
          label: "Taux de réponse (%)",
          data: rates,
          backgroundColor: ["rgba(10,102,195,0.7)", "rgba(40,167,69,0.7)", "rgba(255,193,7,0.7)", "rgba(108,117,125,0.7)"],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } },
    });
  }

  function generateResponseByCvChart(candidatures) {
    const canvas = document.getElementById("response-by-cv-chart");
    if (!canvas) return;

    const hasResponse = (c) => ["interviewé", "job refusé", "job accepté"].includes((c.statut || "").toLowerCase());
    const types = {};
    candidatures.forEach((c) => {
      const t = c.cv_type || "Non défini";
      if (!types[t]) types[t] = { total: 0, responded: 0 };
      types[t].total++;
      if (hasResponse(c)) types[t].responded++;
    });

    const labels = Object.keys(types);
    const rates = labels.map((l) => types[l].total > 0 ? ((types[l].responded / types[l].total) * 100).toFixed(1) : 0);

    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels.map((l) => l === "IT_SUPPORT" ? "IT Support" : l === "DATA_ANALYSIS" ? "Data Analysis" : l),
        datasets: [{
          label: "Taux de réponse (%)",
          data: rates,
          backgroundColor: ["rgba(10,102,195,0.7)", "rgba(40,167,69,0.7)", "rgba(255,193,7,0.7)", "rgba(108,117,125,0.7)"],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } },
    });
  }

  function updateStats(candidatures) {
    console.log("Mise à jour des statistiques avec", candidatures.length, "candidatures");
    const filtered = applyAdvancedFilters(candidatures);
    loadPriorities(candidatures); // priorités sur toutes les candidatures
    updateStatCounters(filtered);
    generateStatusChart(filtered);
    generateTimelineChart(filtered);
    generateSourceChart(filtered);
    updateStatusDetails(filtered);
    updateAdvancedStats(filtered);
    updateNewMetrics(filtered);
  }
});

// Fonction de déconnexion globale (accessible depuis l'extérieur de DOMContentLoaded)
async function logout() {
  // Récupérer l'élément loader au début
  const loader = document.getElementById("loader");
  try {
    console.log("Tentative de déconnexion...");

    // Afficher un indicateur de chargement s'il existe
    if (loader) loader.style.display = "block";

    // Essayer d'abord en GET, puis en POST si le GET échoue
    let response;
    let successfulLogout = false;
    const logoutUrl = "/api/auth/logout"; // URL centralisée

    try {
      console.log(`Essai de déconnexion avec méthode GET sur ${logoutUrl}...`);
      response = await fetch(logoutUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        successfulLogout = true;
        console.log("Déconnexion réussie avec GET");
      } else {
        console.warn(`Échec de la déconnexion GET, statut: ${response.status}`);
      }
    } catch (e) {
      console.warn("Erreur réseau lors de la déconnexion avec GET:", e);
    }

    // Si le GET a échoué, essayer en POST
    if (!successfulLogout) {
      try {
        console.log(
          `Essai de déconnexion avec méthode POST sur ${logoutUrl}...`
        );
        response = await fetch(logoutUrl, {
          method: "POST",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/json", // Pas de corps, mais l'en-tête peut être utile
          },
        });

        if (response.ok) {
          successfulLogout = true;
          console.log("Déconnexion réussie avec POST");
        } else {
          console.warn(
            `Échec de la déconnexion POST, statut: ${response.status}`
          );
        }
      } catch (e) {
        console.error("Erreur réseau lors de la déconnexion avec POST:", e);
      }
    }

    if (successfulLogout) {
      // Nettoyer le stockage local et les cookies
      console.log("Nettoyage du stockage local et des cookies...");
      localStorage.clear();
      sessionStorage.clear();
      // Supprimer le cookie token en le faisant expirer
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      // Tentative de suppression d'autres cookies potentiels (si nécessaire)
      // document.cookie = "autre_cookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

      console.log("Redirection vers la page de connexion...");
      window.location.href = "/login"; // Rediriger vers /login après déconnexion
    } else {
      // Échec de la déconnexion après les deux tentatives
      const status = response ? response.status : "inconnu";
      const errorMessage = `Échec de la déconnexion après tentatives GET et POST. Dernier statut: ${status}`;
      console.error(errorMessage);
      // Afficher une alerte simple à l'utilisateur
      alert(
        "Erreur lors de la déconnexion. Impossible de joindre le serveur. Veuillez réessayer ou rafraîchir la page."
      );
      // Ne lance pas d'exception ici pour que le finally s'exécute
    }
  } catch (error) {
    // Erreur inattendue dans la logique de déconnexion elle-même
    console.error("Erreur inattendue lors de la déconnexion:", error);
    alert("Une erreur inattendue est survenue lors de la déconnexion.");
  } finally {
    // Masquer l'indicateur de chargement s'il existe, quoi qu'il arrive
    if (loader) loader.style.display = "none";
    console.log("Fin de la tentative de déconnexion.");
  }
}

// Rendre showNotification accessible globalement (optionnel, mais peut aider pour le débogage)
// Attention: cela pollue le scope global
let showNotificationGlobal;
document.addEventListener("DOMContentLoaded", function () {
  showNotificationGlobal = function (message, isError = false) {
    const notificationElement = document.getElementById("notification");
    if (notificationElement) {
      notificationElement.textContent = message;
      notificationElement.className = isError
        ? "notification error show"
        : "notification show";

      setTimeout(() => {
        notificationElement.className = notificationElement.className.replace(
          "show",
          ""
        );
      }, 3000);
    } else {
      console.warn("Élément de notification non trouvé");
      alert(message);
    }
  };
});
