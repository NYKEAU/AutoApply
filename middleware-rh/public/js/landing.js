/**
 * Script pour la page d'accueil (landing page)
 * Gère le thème sombre/clair et les animations au défilement
 */

// Gestion du thème sombre/clair
const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  const themeIcon = themeToggle.querySelector("i");

  // Vérifier si un thème est déjà enregistré dans localStorage
  const currentTheme = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", currentTheme);

  // Mettre à jour l'icône en fonction du thème actuel
  if (themeIcon && currentTheme === "dark") {
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
    if (themeIcon) {
      themeIcon.classList.toggle("fa-moon");
      themeIcon.classList.toggle("fa-sun");
    }
  });
}

// Fonction pour limiter la fréquence d'exécution d'une fonction
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Animation au défilement
const animateOnScroll = throttle(() => {
  const elements = document.querySelectorAll(
    ".feature-item, .landing-feature, .extension-content, .feature-image"
  );

  elements.forEach((element) => {
    const elementPosition = element.getBoundingClientRect().top;
    const screenPosition = window.innerHeight / 1.3;

    if (elementPosition < screenPosition) {
      element.classList.add("animate-in");
    }
  });
}, 100); // Limiter à une exécution toutes les 100ms

// Initialiser les animations
document.addEventListener("DOMContentLoaded", () => {
  // Ajouter la classe pour l'animation
  document
    .querySelectorAll(
      ".feature-item, .landing-feature, .extension-content, .feature-image"
    )
    .forEach((element) => {
      element.classList.add("animate-element");
    });

  // Déclencher l'animation au chargement
  setTimeout(animateOnScroll, 100);

  // Écouter l'événement de défilement
  window.addEventListener("scroll", animateOnScroll);
});
