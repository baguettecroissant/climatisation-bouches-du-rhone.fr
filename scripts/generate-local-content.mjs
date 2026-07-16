import fs from 'fs';
import path from 'path';

const INPUT_FILE = path.resolve('src/data/communes.json');

// Haversine distance formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Seeded random for deterministic variations per city
function createSeededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Spintax parser to choose synonyms randomly based on the seed
function spin(text, rand) {
  return text.replace(/{([^{}]+)}/g, (match, choices) => {
    const options = choices.split('|');
    return options[Math.floor(rand() * options.length)];
  });
}

const microRegions = [
  {
    name: "Marseille Métropole",
    cities: ["marseille", "aubagne", "allauch", "plan-de-cuques", "la-penne-sur-huveaune", "septemes-les-vallons", "roquevaire", "auriol"],
    description: "le climat méditerranéen chaud avec le fort îlot de chaleur urbain marseillais",
    typeHabitat: "appartement en copropriété marseillaise ou villa des hauteurs (Roucas-Blanc, Allauch)",
    acType: "climatisation réversible split mural, silencieux et discret",
    landmark: "le Vieux-Port, Notre-Dame de la Garde et les Calanques de Marseille"
  },
  {
    name: "Pays d'Aix",
    cities: ["aix-en-provence", "gardanne", "vitrolles", "les-pennes-mirabeau", "venelles", "bouc-bel-air", "fuveau", "trets", "simiane-collongue", "cabries", "mimet", "pennautier", "meyreuil", "luynes"],
    description: "la cuvette aixoise qui emprisonne la chaleur en période de canicule",
    typeHabitat: "bastide aixoise traditionnelle ou maison contemporaine",
    acType: "climatisation gainable invisible intégrée en faux-plafond",
    landmark: "le cours Mirabeau, la montagne Sainte-Victoire et les ruelles thermales d'Aix"
  },
  {
    name: "Côte Bleue & Étang de Berre",
    cities: ["martigues", "istres", "marignane", "miramas", "chateauneuf-les-martigues", "gignac-la-nerthe", "carry-le-rouet", "sausset-les-pins", "port-de-bouc", "fos-sur-mer", "saint-mitre-les-remparts", "rognac", "berre-l-etang", "velaux"],
    description: "l'air marin humide combiné à un ensoleillement maximal",
    typeHabitat: "villa en bord de mer ou maison de lotissement résidentiel",
    acType: "système multi-split réversible traité anti-corrosion marine",
    landmark: "l'Étang de Berre, la Côte Bleue et le port de Martigues"
  },
  {
    name: "Pays d'Arles & Camargue",
    cities: ["arles", "saint-martin-de-crau", "tarascon", "chateaurenard", "saint-remy-de-provence", "fontvieille", "eyguieres", "port-saint-louis-du-rhone", "saintes-maries-de-la-mer"],
    description: "le grand mistral sec et le soleil de plomb de la plaine de la Crau",
    typeHabitat: "mas provençal en pierre ou maison traditionnelle",
    acType: "climatisation réversible Inverter A+++ haute performance",
    landmark: "les Arènes d'Arles, la Camargue sauvage et les Alpilles"
  },
  {
    name: "Val de Durance & Salonais",
    cities: ["salon-de-provence", "lancon-provence", "pelissanne", "lambesc", "mallemort", "senas", "rognes", "la-fare-les-oliviers", "orgon", "noves", "cabannes"],
    description: "les vents thermiques du couloir de la Durance et les fortes amplitudes d'été",
    typeHabitat: "maison individuelle ou pavillon de lotissement",
    acType: "pompe à chaleur air-air réversible avec régulation Inverter",
    landmark: "le Château de l'Empéri, le Val de Durance et Salon-de-Provence"
  }
];

function getMicroRegion(slug) {
  const match = microRegions.find(r => r.cities.includes(slug) || r.cities.some(c => slug.includes(c)));
  return match || microRegions[0]; // Default to Marseille Métropole
}

// ----------------------------------------------------
// Dynamic Spintax Text Generators
// ----------------------------------------------------

function generateIntroText(c, installers, distance, region, rand) {
  const base = `{À|Sur la commune de|Au sein de la localité de} **{nom} ({codePostal})**, {installer une climatisation réversible|s'équiper d'une pompe à chaleur air-air|équiper son logement en climatisation} {est devenu indispensable pour faire face aux étés étouffants|représente un choix de confort et d'économie majeur|constitue une priorité face aux canicules répétées}. Avec un climat caractérisé par **{description}**, les habitations de type **{typeHabitat}** {nécessitent un confort thermique maîtrisé|exigent un dimensionnement rigoureux de climatisation}. {Les installateurs RGE du 13|Les frigoristes certifiés de la région} proposent l'installation de solutions de climatisation réversible adaptées pour un coût moyen situé entre **{priceMin}€** et **{priceMax}€** TTC, avec des aides de l'État (CEE, TVA réduite) réduisant le reste à charge. {La commune étant implantée à environ|Située à {distance} km de} Marseille, l'intervention locale est {très réactive|garantie sous 48h|planifiée rapidement}.`;
  
  const priceMin = Math.round(1200 + rand() * 800);
  const priceMax = Math.round(4500 + rand() * 3500);

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{codePostal}/g, c.codePostal)
    .replace(/{description}/g, region.description)
    .replace(/{typeHabitat}/g, region.typeHabitat)
    .replace(/{distance}/g, distance)
    .replace(/{priceMin}/g, priceMin.toLocaleString('fr-FR'))
    .replace(/{priceMax}/g, priceMax.toLocaleString('fr-FR'));

  return spin(replaced, rand);
}

function generateChallengeText(c, region, altitude, rand) {
  const base = `{La pose d'une climatisation à|Les chantiers d'installation à} **{nom}** {implique de respecter des contraintes architecturales et réglementaires|exige de s'adapter aux règles locales d'urbanisme}. Pour les logements soumis aux règles de **{regionName}**, l'installation d'une unité extérieure doit {respecter le calme du voisinage|être validée par le syndic en copropriété|s'accorder avec les exigences des Bâtiments de France (ABF) en centre historique}. Les professionnels privilégient l'installation d'un **{acType}** qui {garantit une efficacité maximale pour un minimum de nuisances sonores|s'intègre de manière invisible ou ultra-silencieuse}. Le matériel sélectionné (fluide vert R32, compresseur Inverter) doit également résister aux fortes chaleurs tout en conservant un excellent coefficient de performance (COP de 4.5).`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{acType}/g, region.acType)
    .replace(/{regionName}/g, region.name);

  return spin(replaced, rand);
}

function generateHelpText(c, installers, delai, rand) {
  const base = `{En matière d'aides financières,|Pour optimiser le coût de votre climatisation,} les résidents de **{nom}** {bénéficient de dispositifs d'aide à la rénovation énergétique en 2026|disposent de subventions pour les pompes à chaleur air-air}. {Le recours à un professionnel certifié RGE (Qualipac ou Qualibat)|L'installation par un frigoriste agréé RGE} est obligatoire pour {débloquer les certificats d'économie d'énergie (CEE)|prétendre à la prime énergie de la Métropole d'Aix-Marseille-Provence|bénéficier de la TVA réduite à 10% sur la pose}. Grâce aux **{installers} professionnels qualifiés** opérant sur le secteur de **{nom}**, {les visites techniques gratuites à domicile sont planifiées sous {delai} jours|vous recevez vos devis comparatifs sous 24 à 48 heures}.`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{installers}/g, installers)
    .replace(/{delai}/g, delai);

  return spin(replaced, rand);
}

function generateAnecdoteText(c, region, rand) {
  const base = `{L'histoire et le patrimoine de|Vivre sur la zone de} **{nom}** {nous rappellent l'importance de s'adapter à la chaleur estivale provencale|est intimement lié aux spécificités de la Provence}. Près de lieux emblématiques comme **{landmark}**, l'architecture historique côtoie les constructions modernes. {Afin de préserver l'esthétique des façades typiques de {nom}|Pour ne pas dénaturer le charme des bastides ou façades marseillaises}, les installateurs utilisent des cache-climatisations décoratifs en bois ou en alu laqué, {ce qui rend l'installation totalement harmonieuse|s'adaptant parfaitement aux boiseries locales}. {L'installation d'une pompe à chaleur réversible réconcilie confort moderne et respect du patrimoine architectural.|Ce choix technique assure la fraîcheur en été sans nuire à la beauté du paysage local.}`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{landmark}/g, region.landmark);

  return spin(replaced, rand);
}

// 8 highly spun FAQ items
const faqPool = [
  {
    topic: "prix",
    q: "Quel est le prix moyen d'une climatisation réversible à {city} ?",
    a: "À {city}, comptez entre 1 500 € et 2 800 € TTC pour un split mural mono-split de 2.5 à 3.5 kW posé. Pour un multi-split équipé de 3 unités intérieures, le budget moyen oscille entre 4 500 € et 7 000 € TTC. Les systèmes gainables intégrés débutent quant à eux à 6 000 €."
  },
  {
    topic: "aides",
    q: "Quelles sont les aides disponibles pour installer une climatisation à {city} (13) ?",
    a: "À {city}, la pompe à chaleur air-air (climatisation réversible) donne droit à la prime CEE (Certificats d'Économie d'Énergie) versée par les fournisseurs d'énergie. Vous pouvez également bénéficier d'une TVA réduite à 10% sur la main d'œuvre de pose s'il s'agit d'un logement de plus de 2 ans, et de l'aide Énergie de la Métropole."
  },
  {
    topic: "copropriete",
    q: "Comment installer une climatisation en copropriété à {city} ?",
    a: "Pour installer l'unité extérieure de votre climatiseur sur une façade ou un balcon à {city}, vous devez obtenir l'accord de la copropriété lors d'une assemblée générale (AG). Il est également recommandé de vérifier les règles d'urbanisme (PLU) en mairie, surtout en zone protégée près de monuments historiques."
  },
  {
    topic: "consommation",
    q: "Quelle est la consommation électrique d'une climatisation réversible moderne à {city} ?",
    a: "Grâce à la technologie Inverter et aux coefficients SEER supérieurs à 6 (classe A+++), un split mural moderne consomme environ 30 à 45 € par mois en plein été à {city} pour rafraîchir une pièce principale de 30m². En hiver, elle consomme 3 fois moins qu'un radiateur électrique classique."
  },
  {
    topic: "bruit",
    q: "La climatisation extérieure risque-t-elle de gêner les voisins à {city} ?",
    a: "Les unités extérieures des marques leaders (Daikin, Mitsubishi, Panasonic) émettent moins de 45 dB(A) à 1 mètre, soit l'équivalent d'un murmure. À {city}, l'installateur RGE veillera à placer l'unité sur des plots anti-vibratiles et à l'orienter de manière à éviter toute résonance ou nuisance acoustique pour le voisinage."
  },
  {
    topic: "entretien",
    q: "L'entretien d'une climatisation réversible est-il obligatoire à {city} ?",
    a: "La réglementation impose un contrôle d'étanchéité du circuit de fluide frigorigène tous les 2 ans pour les climatiseurs contenant plus de 2 kg de fluide (généralement les gros multi-split ou gainables). À {city}, un entretien annuel (100 à 180 €) incluant la désinfection des filtres et du bac à condensats assure performance et qualité de l'air."
  }
];

function generateFAQs(cityName, rand) {
  const shuffled = [...faqPool].sort(() => rand() - 0.5);
  const picked = shuffled.slice(0, 3);
  
  return picked.map(item => {
    const qSpun = spin(item.q, rand);
    const aSpun = spin(item.a, rand);
    return {
      q: qSpun.replace(/{city}/g, cityName),
      a: aSpun.replace(/{city}/g, cityName)
    };
  });
}

// ----------------------------------------------------
// Main Processing Loop
// ----------------------------------------------------
async function generateLocalContent() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`File ${INPUT_FILE} does not exist. Run fetch-cities first.`);
    }

    const communes = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`Generating unique combinatorial texts for ${communes.length} Bouches-du-Rhône communes...`);

    // Center coordinates Marseille: lat 43.2965, lon 5.3698
    const centerLat = 43.2965;
    const centerLon = 5.3698;

    const enriched = communes.map((c) => {
      const rand = createSeededRandom(c.slug);
      const region = getMicroRegion(c.slug);

      const lat = c.coordinates?.lat || centerLat;
      const lon = c.coordinates?.lon || centerLon;
      const distanceToCenter = Math.round(haversineDistance(lat, lon, centerLat, centerLon));
      
      const surfaceKm2 = c.surface ? parseFloat((c.surface / 100).toFixed(1)) : 0;
      const density = surfaceKm2 > 0 ? Math.round(c.population / surfaceKm2) : 0;
      
      // Altitude Bouches-du-Rhône
      let altitude = Math.round(10 + rand() * 120);
      if (region.name.includes("Aix") || region.name.includes("Salonais")) {
        altitude = Math.round(80 + rand() * 220);
      }

      // Climate & Market variables
      const installersCount = Math.round(5 + rand() * 8); // 5 to 13 installers
      const delaiMoyen = Math.round(1 + rand() * 3); // 1 to 4 days
      const hotDays = Math.round(20 + rand() * 25); // 20 to 45 days > 35°C in BDR 2026

      // Generated spun texts with local facts
      const introText = generateIntroText(c, installersCount, distanceToCenter, region, rand);
      const accessibilityChallenge = generateChallengeText(c, region, altitude, rand);
      const localHelp = generateHelpText(c, installersCount, delaiMoyen, rand);
      const anecdotePatrimoine = generateAnecdoteText(c, region, rand);

      const geoportailLink = `https://www.geoportail.gouv.fr/carte?c=${lon},${lat}&z=14&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
      const inseeLink = `https://www.insee.fr/fr/statistiques/dossier_complet/commune/${c.codeInsee}`;
      const departmentLink = `https://www.departement13.fr`;

      // Unique spun FAQs
      const faq = generateFAQs(c.nom, rand);

      // Stable technical characteristics
      const brandPreference = rand() > 0.5 ? "Mitsubishi Electric / Daikin (Haute performance)" : "Panasonic / Toshiba (Excellent rapport qualité-prix)";
      const fluidType = "Fluide écologique R32 (Prêt pour la réglementation F-Gas 2026)";
      const copRatio = `COP 4.5 à 5.1 / SEER A+++ (Technologie Hyper Inverter)`;
      const certifiedLevel = "Installateur RGE Qualipac / Attestation de capacité Fluides obligatoires";

      return {
        ...c,
        intercommunalite: c.intercommunalite || `${region.name}`,
        marketData: {
          hotDays,
          installateursAgrees: installersCount,
          delaiMoyenJours: delaiMoyen
        },
        geographicData: {
          distanceToCenter,
          surfaceKm2,
          density,
          lat,
          lon,
          geoportailLink,
          inseeLink,
          departmentLink
        },
        altitude,
        introText,
        accessibilityChallenge,
        localHelp,
        anecdotePatrimoine,
        climCharacteristics: {
          brandPreference,
          fluidType,
          copRatio,
          certifiedLevel
        },
        faq
      };
    });

    fs.writeFileSync(INPUT_FILE, JSON.stringify(enriched, null, 2), 'utf-8');
    console.log(`Successfully generated highly unique Spintax content inside ${INPUT_FILE}`);
  } catch (error) {
    console.error('Error generating local content:', error);
    process.exit(1);
  }
}

generateLocalContent();
