export default async function handler(req, res) {
  // On récupère soit une position centrale (lat/lon), soit une boite précise (bounds)
  const { lat, lon, lamin, lomin, lamax, lomax } = req.query;

  let url = "";

  // CAS 1 : Le Frontend envoie les coins exacts de la carte (Zoom/Déplacement)
  if (lamin && lomin && lamax && lomax) {
    url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  } 
  // CAS 2 : Démarrage ou localisation simple (Fallback)
  else {
    const userLat = lat ? parseFloat(lat) : 48.85;
    const userLon = lon ? parseFloat(lon) : 2.35;
    // Par défaut on cherche assez large (2 degrés ~ 220km)
    const delta = 2.0; 
    url = `https://opensky-network.org/api/states/all?lamin=${userLat - delta}&lomin=${userLon - delta}&lamax=${userLat + delta}&lomax=${userLon + delta}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 sec max pour charger une grosse zone
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();

    if (!data.states || data.states.length === 0) throw new Error("Empty states");

    // Cache un peu plus long (10s) car charger une grande zone coûte cher
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    // FALLBACK : Données de démo si l'API échoue ou zone vide
    const mockLat = lat ? parseFloat(lat) : 48.85;
    const mockLon = lon ? parseFloat(lon) : 2.35;
    
    const mockData = {
        time: Date.now(),
        states: [
            // id, callsign, country, x, last_contact, lon, lat, alt, on_ground, vel, heading, v_rate, ..., cat
            ["394a8f", "AFR123", "France", 0, Date.now()/1000, mockLon + 0.1, mockLat + 0.1, 1200, false, 180, 45, 12.5, null, null, null, null, 0], 
            ["4841d2", "SAMU34", "France", 0, Date.now()/1000, mockLon - 0.05, mockLat - 0.05, 300, false, 60, 180, 0, null, null, null, null, 7],
            ["7700XX", "MAYDAY", "France", 0, Date.now()/1000, mockLon + 0.02, mockLat - 0.08, 2000, false, 150, 90, -15, null, null, null, null, 0], 
        ]
    };
    // Force Squawk 7700
    mockData.states[2][6] = "7700";

    res.status(200).json(mockData);
  }
}
