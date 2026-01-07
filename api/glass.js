export default async function handler(req, res) {
  const { lat, lon, lamin, lomin, lamax, lomax } = req.query;

  // 1. On détermine la zone de recherche (Bounds ou Rayon)
  let url = "";
  
  if (lamin && lomin && lamax && lomax) {
      // Recherche précise (Zone écran)
      url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  } else {
      // Recherche rayon (Démarrage)
      const centerLat = lat ? parseFloat(lat) : 48.85;
      const centerLon = lon ? parseFloat(lon) : 2.35;
      const delta = 1.0; 
      url = `https://opensky-network.org/api/states/all?lamin=${centerLat - delta}&lomin=${centerLon - delta}&lamax=${centerLat + delta}&lomax=${centerLon + delta}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 sec max
    
    // On appelle OpenSky
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
        throw new Error(`OpenSky API Error: ${response.status}`);
    }

    const data = await response.json();

    // Cache court (5s)
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
    
    // On renvoie les données réelles telles quelles
    res.status(200).json(data);

  } catch (error) {
    console.error("Erreur API:", error.message);
    
    // --- PLUS DE SIMULATION ICI ---
    // On renvoie une erreur explicite au Frontend pour qu'il sache que ça a planté
    res.status(502).json({ 
        error: "Impossible de récupérer les données en temps réel.",
        details: error.message
    });
  }
}
