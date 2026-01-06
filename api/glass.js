export default async function handler(req, res) {
  try {
    // 1. On appelle l'API de Montpellier depuis le serveur Vercel
    const response = await fetch('https://portail-api.montpellier3m.fr/wastecontainer?limit=500');
    
    // 2. Si ça échoue, on renvoie l'erreur
    if (!response.ok) {
      throw new Error(`Erreur API Montpellier: ${response.statusText}`);
    }

    // 3. On récupère les données JSON
    const data = await response.json();

    // 4. On configure les en-têtes pour autoriser votre site à lire la réponse
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // Cache de 5 min pour être rapide

    // 5. On renvoie les données propres au frontend
    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    // En cas de panne totale, on renvoie une erreur propre
    res.status(500).json({ error: 'Impossible de récupérer les données', details: error.message });
  }
}