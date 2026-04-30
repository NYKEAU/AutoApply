// Exemple d'utilisation de updateUsageStats
async function handleUserRequest(userInput) {
  // Logique pour traiter la requête de l'utilisateur
  const response = await fetch("/api/your-endpoint", {
    method: "POST",
    body: JSON.stringify({ input: userInput }),
  });

  if (response.ok) {
    const data = await response.json();

    // Mettez à jour les statistiques d'utilisation
    updateUsageStats(data.inputTokens, data.outputTokens, 1); // Mettez à jour avec les valeurs appropriées

    // Affichez les statistiques mises à jour
    const usageStats = getUsageStats();
    // Stats mises à jour (voir logs pour les détails)
  }
}
