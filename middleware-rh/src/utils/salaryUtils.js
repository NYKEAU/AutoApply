/**
 * Utilitaires pour le traitement des salaires
 */

/**
 * Extrait la valeur numérique d'un salaire à partir d'une chaîne de caractères
 * @param {string} salaryStr - Chaîne de caractères représentant un salaire
 * @returns {number} - Valeur numérique du salaire
 */
function extractSalaryValue(salaryStr) {
  if (!salaryStr) return 0;

  // Normaliser les espaces insécables ( ) et nettoyage
  const cleanedSalaryStr = salaryStr.replace(/[\u00A0\u202F]/g, ' ').replace(/[^0-9.,$\-–]/g, "").trim();

  if (!cleanedSalaryStr) {
    return 0;
  }

  // Traiter les différents formats de salaire
  if (salaryStr.includes("-") || salaryStr.includes("–")) {
    // Format plage: "38,46 $CA/h - 60,90 $CA/h" ou "$95,000–$125,000"
    const separator = salaryStr.includes("-") ? "-" : "–";
    const parts = cleanedSalaryStr.split(separator).map((part) => part.trim());

    // Extraire les valeurs numériques de chaque partie
    const values = parts.map((part) => {
      // Remplacer la virgule par un point pour les nombres décimaux
      let normalized = part;

      // Détecter si c'est un format avec séparateur de milliers
      if (part.match(/\d{1,3},\d{3}/)) {
        // Supprimer les séparateurs de milliers
        normalized = part.replace(/,/g, "");
      } else {
        // Sinon, c'est probablement un décimal, remplacer la virgule par un point
        normalized = part.replace(",", ".");
      }

      // Extraire uniquement les chiffres et le point décimal
      const matches = normalized.match(/[\d.]+/g);
      return matches ? parseFloat(matches[0]) : 0;
    });

    // Calculer la moyenne des valeurs
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  } else {
    // Format simple: "$95,000"
    let normalized = cleanedSalaryStr;

    // Détecter si c'est un format avec séparateur de milliers
    if (cleanedSalaryStr.match(/\d{1,3},\d{3}/)) {
      // Supprimer les séparateurs de milliers
      normalized = cleanedSalaryStr.replace(/,/g, "");
    } else {
      // Sinon, c'est probablement un décimal, remplacer la virgule par un point
      normalized = cleanedSalaryStr.replace(",", ".");
    }

    const matches = normalized.match(/[\d.]+/g);
    return matches ? parseFloat(matches[0]) : 0;
  }
}

/**
 * Détermine l'unité d'un salaire à partir d'une chaîne de caractères
 * @param {string} salaryStr - Chaîne de caractères représentant un salaire
 * @returns {Object} - Objet contenant la valeur et l'unité du salaire
 */
function determineSalaryUnit(salaryStr) {
  if (!salaryStr) return { value: 0, unit: "month" };

  const salaryLower = salaryStr.toLowerCase();
  let value = 0;

  // Nettoyer la chaîne de caractères pour supprimer les lettres et espaces
  const cleanedSalaryStr = salaryStr.replace(/[^0-9.,$]/g, "").trim();

  // Vérifier si la chaîne est vide après nettoyage
  if (!cleanedSalaryStr) {
    return { value: 0, unit: "month" }; // Ou une autre valeur par défaut
  }

  // Traiter les différents formats de salaire
  if (salaryLower.includes("-") || salaryLower.includes("–")) {
    // Format plage: "38,46 $CA/h - 60,90 $CA/h" ou "$95,000–$125,000"
    const separator = salaryLower.includes("-") ? "-" : "–";
    const parts = cleanedSalaryStr.split(separator).map((part) => part.trim());

    // Extraire les valeurs numériques de chaque partie
    const values = parts.map((part) => {
      // Remplacer la virgule par un point pour les nombres décimaux
      let normalized = part;

      // Détecter si c'est un format avec séparateur de milliers (comme 95,000)
      if (part.match(/\d{1,3},\d{3}/)) {
        // Supprimer les séparateurs de milliers
        normalized = part.replace(/,/g, "");
      } else {
        // Sinon, c'est probablement un décimal, remplacer la virgule par un point
        normalized = part.replace(",", ".");
      }

      // Extraire uniquement les chiffres et le point décimal
      const matches = normalized.match(/[\d.]+/g);
      return matches ? parseFloat(matches[0]) : 0;
    });

    // Calculer la moyenne des valeurs
    value = values.reduce((sum, val) => sum + val, 0) / values.length;
  } else {
    // Format simple: "$95,000"
    let normalized = cleanedSalaryStr;

    // Détecter si c'est un format avec séparateur de milliers
    if (cleanedSalaryStr.match(/\d{1,3},\d{3}/)) {
      // Supprimer les séparateurs de milliers
      normalized = cleanedSalaryStr.replace(/,/g, "");
    } else {
      // Sinon, c'est probablement un décimal, remplacer la virgule par un point
      normalized = cleanedSalaryStr.replace(",", ".");
    }

    const matches = normalized.match(/[\d.]+/g);
    value = matches ? parseFloat(matches[0]) : 0;
  }

  // Vérifier si le salaire est en milliers (k)
  if (salaryLower.includes("k")) {
    value *= 1000;
  }

  // Déterminer l'unité
  if (salaryLower.includes("/h") || salaryLower.includes("h") || salaryLower.includes("de l'heure") || salaryLower.includes("/hr")) {
    return { value, unit: "hour" };
  } else if (
    salaryLower.includes("/y") ||
    salaryLower.includes("year") ||
    salaryLower.includes("annual") ||
    salaryLower.includes("par an") ||
    salaryLower.includes("/an") ||
    (salaryLower.includes("$") && value > 10000) // Supposer que les grands montants en $ sont annuels
  ) {
    return { value, unit: "year" };
  } else if (
    salaryLower.includes("/m") ||
    salaryLower.includes("month") ||
    salaryLower.includes("par mois")
  ) {
    return { value, unit: "month" };
  } else {
    return { value, unit: "month" };
  }
}

/**
 * Convertit un salaire en salaire mensuel
 * @param {string} salaryStr - Chaîne de caractères représentant un salaire
 * @returns {number} - Salaire mensuel
 */
function calculateMonthlySalary(salaryStr) {
  if (!salaryStr) return 0;

  const salaryLower = salaryStr.toLowerCase();
  const value = extractSalaryValue(salaryStr);

  if (value <= 0) {
    return 0;
  }

  // Vérifier si le salaire est en milliers (k)
  let adjustedValue = value;
  if (salaryLower.includes("k")) {
    adjustedValue *= 1000;
  }

  // Déterminer l'unité et convertir en mensuel
  if (salaryLower.includes("/h") || salaryLower.includes("h") || salaryLower.includes("de l'heure") || salaryLower.includes("/hr")) {
    // Salaire horaire: convertir en mensuel (40h/semaine, 4 semaines/mois)
    return adjustedValue * 40 * 4;
  } else if (
    salaryLower.includes("/y") ||
    salaryLower.includes("year") ||
    salaryLower.includes("annual") ||
    salaryLower.includes("par an") ||
    salaryLower.includes("/an") ||
    (salaryLower.includes("$") && adjustedValue > 10000) // Supposer que les grands montants en $ sont annuels
  ) {
    // Salaire annuel: convertir en mensuel
    return adjustedValue / 12;
  } else {
    // Déjà mensuel
    return adjustedValue;
  }
}

/**
 * Calcule la moyenne des salaires d'une liste de candidatures
 * @param {Array} candidatures - Liste des candidatures
 * @returns {string} - Moyenne des salaires formatée
 */
function calculateAverageSalary(candidatures) {
  if (!candidatures || candidatures.length === 0) {
    return "Non défini";
  }

  // Filtrer les candidatures avec des salaires valides
  const validCandidatures = candidatures.filter((candidature) => {
    // Vérifier si le salaire existe
    if (!candidature.salary) return false;

    // Essayer de convertir le salaire en nombre
    const salaryValue = extractSalaryValue(candidature.salary);
    return salaryValue > 0;
  });

  if (validCandidatures.length === 0) {
    return "Non défini";
  }

  // Calculer la somme des salaires mensuels
  let totalSalary = 0;

  validCandidatures.forEach((candidature) => {
    const monthlySalary = calculateMonthlySalary(candidature.salary);

    // Ignorer les salaires invalides
    if (monthlySalary > 0) {
      totalSalary += monthlySalary;
    }
  });

  // Calculer la moyenne
  const averageSalary = totalSalary / validCandidatures.length;

  return averageSalary.toFixed(2);
}

export default {
  extractSalaryValue,
  determineSalaryUnit,
  calculateMonthlySalary,
  calculateAverageSalary,
};
