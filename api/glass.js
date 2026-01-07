export default async function handler(req, res) {
  const { lat, lon } = req.query;
  
  // Coordonnées par défaut (Paris) si pas fournies
  const userLat = lat ? parseFloat(lat) : 48.85;
  const userLon = lon ? parseFloat(lon) : 2.35;

  // Zone de recherche (~100km autour)
  const delta = 1.0; 
  const lamin = userLat - delta;
  const lomin = userLon - delta;
  const lamax = userLat + delta;
  const lomax = userLon + delta;

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  try {
    // Timeout pour éviter que Vercel ne coupe trop vite
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 secondes max

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`API Error ${response.status}`);
    }

    const data = await response.json();

    // Si le tableau "states" est vide ou null, on passe en erreur pour déclencher le mode démo
    if (!data.states || data.states.length === 0) {
        throw new Error("Pas d'avions trouvés (Passage en mode démo)");
    }

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    console.warn("API OpenSky échouée ou vide, envoi de données simulées:", error.message);

    // --- DONNÉES DE DÉMO (SIMULATION) ---
    // Génération de 3 avions fictifs autour de la position demandée
    const mockData = {
        time: Date.now(),
        states: [
            // [ICAO, CALLSIGN, PAYS, ..., LON, LAT, ALT, ..., VELOCITY, HEADING]
            ["394a8f", "AFR123  ", "France", 0, 0, userLon + 0.02, userLat + 0.02, 8500, false, 220, 90, 0, null, 0, null, false, 0],
            ["4841d2", "KLM885  ", "Netherlands", 0, 0, userLon - 0.03, userLat - 0.01, 1500, false, 140, 270, 0, null, 0, null, false, 0],
            ["3c66a1", "LH452   ", "Germany", 0, 0, userLon + 0.01, userLat - 0.04, 11000, false, 250, 180, 0, null, 0, null, false, 0]
        ]
    };

    res.status(200).json(mockData);
  }
}
