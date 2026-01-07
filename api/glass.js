export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const userLat = lat ? parseFloat(lat) : 48.85;
  const userLon = lon ? parseFloat(lon) : 2.35;

  const delta = 1.0; 
  const lamin = userLat - delta;
  const lomin = userLon - delta;
  const lamax = userLat + delta;
  const lomax = userLon + delta;

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); 
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();

    if (!data.states || data.states.length === 0) throw new Error("Empty states");

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    // FALLBACK minimaliste en cas de panne API (mais sans inventer de trajet)
    // On garde juste des avions fictifs pour tester l'UI si l'API est down.
    const mockData = {
        time: Date.now(),
        states: [
            // id, callsign, country, x, x, lon, lat, alt, on_ground, velocity, heading, vertical_rate
            ["394a8f", "AFR123", "France", 0, 0, userLon + 0.02, userLat + 0.02, 1200, false, 180, 45, 12.5], // En montée (+12.5 m/s)
            ["4841d2", "KLM885", "Pays-Bas", 0, 0, userLon - 0.03, userLat - 0.01, 8500, false, 240, 135, 0], // Croisière (0 m/s)
            ["3c66a1", "EZY452", "Royaume-Uni", 0, 0, userLon + 0.01, userLat - 0.04, 3000, false, 160, 270, -8.2], // Descente (-8.2 m/s)
        ]
    };

    res.status(200).json(mockData);
  }
}
