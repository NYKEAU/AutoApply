document.addEventListener("DOMContentLoaded", function () {
  // Initialisation du thème
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

  // Gestion du formulaire d'inscription
  const registerForm = document.getElementById("register-form");
  const errorMessage = document.getElementById("error-message");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = document.getElementById("displayName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
      errorMessage.textContent = "Les mots de passe ne correspondent pas";
      errorMessage.style.display = "block";
      return;
    }

    try {
      // Désactiver le bouton pendant la requête
      const submitButton = registerForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription en cours...';

      // Envoyer la requête à l'API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, email, password }),
        credentials: "include", // Important pour les cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      // Rediriger vers le dashboard en cas de succès
      window.location.href = "/dashboard";
    } catch (error) {
      // Afficher le message d'erreur
      errorMessage.textContent = error.message;
      errorMessage.style.display = "block";

      // Réactiver le bouton
      const submitButton = registerForm.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.textContent = "Créer un compte";
    }
  });

  // Inscription avec Google
  const googleRegisterButton = document.getElementById("google-register");
  googleRegisterButton.addEventListener("click", async () => {
    try {
      // Rediriger vers l'API pour l'inscription Google
      window.location.href = "/api/auth/google";
    } catch (error) {
      // Afficher le message d'erreur
      errorMessage.textContent = "Erreur lors de l'inscription avec Google";
      errorMessage.style.display = "block";
    }
  });
});
