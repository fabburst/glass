export default async function handler(req, res) {
  try {
    // 1. Récupération des paramètres GPS envoyés par le frontend
    const { lat, lon } = req.query;

    // Validation basique
    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude et longitude requises" });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    // 2. Calcul de la "Bounding Box" (Zone de recherche)
    // On cherche environ à +/- 1 degré autour de l'utilisateur (environ 110km de rayon)
    // C'est idéal pour une vue mobile : ni trop peu, ni trop de données à charger.
    const delta = 1.0; 

    const lamin = userLat - delta;
    const lomin = userLon - delta;
    const lamax = userLat + delta;
    const lomax = userLon + delta;

    // 3. Appel à l'API OpenSky
    // On utilise l'endpoint 'all' avec les coordonnées géographiques pour filtrer
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    // Note : OpenSky est parfois lent ou surchargé. On ajoute un timeout implicite via fetch si besoin,
    // mais ici on reste standard.
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
      // OpenSky renvoie souvent 502 ou 429 si trop de requêtes.
      // On gère ça proprement pour que l'app ne crashe pas.
      throw new Error(`OpenSky API Error: ${response.status}`);
    }

    const data = await response.json();

    // 4. Configuration du Cache (Performance Mobile)
    // 's-maxage=10' : Le serveur cache la réponse 10 secondes.
    // 'stale-while-revalidate' : Si le cache est vieux, on sert la vieille version tout en rechargeant la nouvelle en arrière-plan.
    // C'est ce qui donne cette sensation de fluidité sur mobile.
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    
    // 5. Renvoi des données brutes
    // Le frontend (React) s'occupe du formatage final.
    res.status(200).json(data);

  } catch (error) {
    console.error("Erreur Backend:", error);
    // On renvoie un objet vide ou une erreur JSON propre pour que l'UI affiche un message sympa
    res.status(500).json({ error: 'Service momentanément indisponible', details: error.message });
  }
}
