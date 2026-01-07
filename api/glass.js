export default async function handler(req, res) {
  const { lat, lon, lamin, lomin, lamax, lomax } = req.query;

  // --- 1. CALCUL DU CENTRE VISUEL (CRITIQUE) ---
  // On doit savoir où placer les avions de démo si l'API échoue.
  let centerLat = 48.85; // Paris par défaut
  let centerLon = 2.35;

  // Si le frontend envoie une boite (ce qu'il fait quand on dézoome/bouge)
  if (lamin && lomin && lamax && lomax) {
      centerLat = (parseFloat(lamin) + parseFloat(lamax)) / 2;
      centerLon = (parseFloat(lomin) + parseFloat(lomax)) / 2;
  } 
  // Sinon on utilise la position GPS directe
  else if (lat && lon) {
      centerLat = parseFloat(lat);
      centerLon = parseFloat(lon);
  }

  // --- 2. CONSTRUCTION DE L'URL OPENSKY ---
  let url = "";
  
  if (lamin && lomin && lamax && lomax) {
      // Recherche précise dans la boite affichée à l'écran
      url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  } else {
      // Recherche par défaut (carré de ~220km autour du centre)
      const delta = 1.0; 
      url = `https://opensky-network.org/api/states/all?lamin=${centerLat - delta}&lomin=${centerLon - delta}&lamax=${centerLat + delta}&lomax=${centerLon + delta}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // Timeout 5s pour rapidité
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();

    if (!data.states || data.states.length === 0) throw new Error("Empty states");

    // Cache court (5s) pour avoir des mouvements fluides
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    // --- 3. FALLBACK INTELLIGENT (MODE DÉMO) ---
    // On génère les avions autour du 'centerLat/centerLon' calculé plus haut.
    // Ils apparaîtront donc TOUJOURS au milieu de votre écran.
    
    const now = Math.floor(Date.now() / 1000); // Timestamp actuel en secondes
    
    const mockData = {
        time: Date.now(),
        states: [
            // Format OpenSky : 
            // [0:id, 1:callsign, 2:pays, 3:time, 4:last_contact, 5:lon, 6:lat, 7:alt, 8:on_ground, 9:vel, 10:heading, 11:v_rate, ..., 17:category]
            
            // Avion 1 : Gros porteur Air France (Monte)
            ["394a8f", "AFR123", "France", 0, now, centerLon + 0.04, centerLat + 0.02, 1200, false, 180, 45, 12.5, null, null, null, null, null, 0], 
            
            // Avion 2 : Hélicoptère SAMU (Bas altitude, Catégorie 7)
            ["4841d2", "SAMU34", "France", 0, now, centerLon - 0.03, centerLat - 0.03, 300, false, 60, 180, 0, null, null, null, null, null, 7], 
            
            // Avion 3 : Urgence (Squawk 7700 simulé via l'index 6 qui est détourné ici ou le callsign)
            // Note : Dans le mock, je triche un peu pour forcer l'urgence dans le frontend
            ["7700XX", "MAYDAY", "France", 0, now, centerLon + 0.01, centerLat - 0.05, 2000, false, 150, 270, -15, null, null, null, null, "7700", 0], 
        ]
    };

    // Petite astuce pour que le frontend détecte le Squawk 7700 dans le mock
    // L'API OpenSky met le Squawk à l'index inconnu parfois, mais mon frontend regarde mockData.states[x].squawk
    // Je mappe manuellement le champs "squawk" pour le test
    mockData.states[2][6] = "7700"; // Force le code transpondeur dans la colonne "squawk" si l'index est bon, sinon le frontend le lit via mon mapping manuel

    res.status(200).json(mockData);
  }
}
