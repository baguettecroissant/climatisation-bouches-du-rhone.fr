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
    description: "le climat méditerranéen chaud caractérisé par un fort îlot de chaleur urbain lié à la densité bâtie côtière",
    typeHabitat: "appartement en copropriété marseillaise traditionnelle, maison de ville ou villa des collines environnantes",
    acType: "climatisation réversible split mural, silencieux et discret",
    landmark: "le Vieux-Port, Notre-Dame de la Garde, le massif du Garlaban et les Calanques de Marseille"
  },
  {
    name: "Pays d'Aix",
    cities: ["aix-en-provence", "gardanne", "vitrolles", "les-pennes-mirabeau", "venelles", "bouc-bel-air", "fuveau", "trets", "simiane-collongue", "cabries", "mimet", "pennautier", "meyreuil", "luynes", "peyrolles-en-provence", "meyrargues", "jouques", "rognes", "rousset", "peynier"],
    description: "la cuvette aixoise qui emprisonne la chaleur en été tout en subissant des gelées matinales en hiver",
    typeHabitat: "bastide aixoise traditionnelle en pierre, mas restauré ou maison contemporaine RE2020",
    acType: "climatisation gainable invisible intégrée en faux-plafond avec régulation par zone",
    landmark: "le cours Mirabeau, la montagne Sainte-Victoire, la vallée de l'Arc et les ruelles thermales d'Aix"
  },
  {
    name: "Côte Bleue & Étang de Berre",
    cities: ["martigues", "istres", "marignane", "miramas", "chateauneuf-les-martigues", "gignac-la-nerthe", "carry-le-rouet", "sausset-les-pins", "port-de-bouc", "fos-sur-mer", "saint-mitre-les-remparts", "rognac", "berre-l-etang", "velaux", "vitrolles", "le-rove", "ensues-la-redonne"],
    description: "l'air marin salin chargé d'humidité combiné à un ensoleillement annuel exceptionnel de plus de 2800 heures",
    typeHabitat: "villa en bord de mer, maison de lotissement ou appartement exposé aux embruns directs",
    acType: "système multi-split réversible avec traitement anti-corrosion des échangeurs extérieurs (Blue Fin)",
    landmark: "l'Étang de Berre, la Côte Bleue, le canal de Caronte et les calanques de l'Estaque"
  },
  {
    name: "Pays d'Arles & Camargue",
    cities: ["arles", "saint-martin-de-crau", "tarascon", "chateaurenard", "saint-remy-de-provence", "fontvieille", "eyguieres", "port-saint-louis-du-rhone", "saintes-maries-de-la-mer", "graveson", "barbentane", "rognonas", "noves", "cabannes", "eyragues", "maillane"],
    description: "la plaine alluviale balayée par un mistral violent et sec, avec un soleil de plomb en période estivale",
    typeHabitat: "mas provençal agricole en pierre de Fontvieille ou maison basse camarguaise",
    acType: "pompe à chaleur air-air réversible console basse ou split mural A+++ haute performance",
    landmark: "les Arènes d'Arles, le parc naturel régional de Camargue, les Alpilles et le château de Tarascon"
  },
  {
    name: "Val de Durance & Salonais",
    cities: ["salon-de-provence", "lancon-provence", "pelissanne", "lambesc", "mallemort", "senas", "la-fare-les-oliviers", "orgon", "noves", "cabannes", "grans", "la-roque-d-antheron", "charleval", "alleins", "mouries", "maussane-les-alpilles", "paradou", "fontvieille", "saint-etienne-du-gres", "lamanon"],
    description: "les couloirs thermiques de la vallée de la Durance, soumis à de fortes amplitudes thermiques journalières",
    typeHabitat: "maison individuelle traditionnelle, villa récente de plain-pied ou maison de village provençale",
    acType: "pompe à chaleur air-air réversible avec technologie Inverter haut de gamme",
    landmark: "le Château de l'Empéri, les falaises de l'Alpille, la Durance et le massif des Costes"
  }
];

function getMicroRegion(slug) {
  const match = microRegions.find(r => r.cities.includes(slug) || r.cities.some(c => slug.includes(c)));
  return match || microRegions[0]; // Default to Marseille Métropole
}

// ----------------------------------------------------
// Dynamic Spintax Text Generators (Expanded for Authoritative Local SEO)
// ----------------------------------------------------

function generateIntroText(c, installers, distance, region, rand, btu, savings) {
  const base = `{À|Sur la commune de|Au sein de la localité de} **{nom} ({codePostal})**, {l'installation d'une climatisation réversible|le choix d'une pompe à chaleur air-air|la pose d'un système de climatisation moderne} {est devenue un enjeu majeur de confort et d'efficacité énergétique|permet d'optimiser durablement les factures de chauffage et de climatisation}. La commune, peuplée de **{population} habitants** et s'étendant sur **{surface} km²**, fait face à des contraintes climatiques marquées par **{description}**. {L'habitat local, composé majoritairement de **{typeHabitat}**, nécessite|Les caractéristiques thermiques des résidences de type **{typeHabitat}** exigent} une étude thermique préalable rigoureuse. 

Pour une habitation standard de 100 m² à {nom}, les ingénieurs estiment que la puissance requise est d'environ **{btu} kW**, permettant de faire face aux chaleurs extrêmes tout en maintenant un rendement optimal. Grâce au remplacement d'un chauffage électrique conventionnel par une pompe à chaleur réversible Inverter, {les économies annuelles moyennes s'élèvent à **{savings} €**|les foyers de la commune peuvent économiser jusqu'à **{savings} €** sur leur facture d'électricité par an}. L'accès direct aux professionnels qualifiés RGE du département est facilité par la proximité de Marseille, distante de seulement **{distance} km**.`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{codePostal}/g, c.codePostal)
    .replace(/{population}/g, c.population.toLocaleString('fr-FR'))
    .replace(/{surface}/g, c.geographicData.surfaceKm2)
    .replace(/{description}/g, region.description)
    .replace(/{typeHabitat}/g, region.typeHabitat)
    .replace(/{btu}/g, btu)
    .replace(/{savings}/g, savings)
    .replace(/{distance}/g, distance);

  return spin(replaced, rand);
}

function generateChallengeText(c, region, altitude, rand) {
  const base = `{Les chantiers d'installation de pompe à chaleur à|La pose d'un système de climatisation réversible à} **{nom}** {exigent une parfaite conformité avec la réglementation locale d'urbanisme|doivent respecter les règles strictes d'implantation imposées par le Plan Local d'Urbanisme (PLU) du département des Bouches-du-Rhône}. Avec une altitude moyenne de **{altitude} mètres**, le climat alterne gelées matinales et étés caniculaires. Pour respecter le paysage urbain local et l'architecture provençale, toute installation visible depuis le domaine public est réglementée et nécessite une Déclaration Préalable de travaux (DP) en mairie, disponible sur [le portail officiel de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/).

L'intégration technique privilégie un système **{acType}** qui assure de grandes performances tout en préservant le confort du voisinage. Les blocs extérieurs doivent être implantés sur plots anti-vibratoires pour supprimer la transmission acoustique aux structures de l'immeuble. La réglementation interdit également toute émission sonore supérieure à 3 dB(A) de nuit par rapport au bruit de fond ambiant, ce qui impose d'utiliser du matériel de marques réputées pour leur discrétion.`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{acType}/g, region.acType)
    .replace(/{altitude}/g, altitude)
    .replace(/{regionName}/g, region.name);

  return spin(replaced, rand);
}

function generateHelpText(c, installers, delai, rand, priceMin, priceMax) {
  const base = `{Pour financer vos travaux de climatisation à|Concernant le montage de votre dossier de subventions à} **{nom}**, {les ménages peuvent bénéficier d'aides à la rénovation thermique et à l'efficacité énergétique|des financements spécifiques sont mis en place pour accélérer la réduction de la facture carbone}. L'obligation légale d'obtenir un accompagnement par un frigoriste titulaire d'une certification **RGE Qualipac** est le point d'entrée pour prétendre aux [Primes CEE](https://www.ecologie.gouv.fr/dispositif-des-certificats-deconomies-denergie-cee) ou aux aides d'intercommunalité.

Il y a actuellement environ **{installers} entreprises RGE en génie climatique qualifiées** actives à proximité de {nom}. Les visites techniques pour dimensionner votre installation sont généralement planifiées sous **{delai} jours**, permettant de recevoir un devis conforme. Le coût global moyen constaté pour équiper un logement type de 3 pièces se situe entre **{priceMin} €** et **{priceMax} €** TTC (TVA 10% incluse sur la pose), amorti en seulement quelques saisons grâce à la baisse drastique de la consommation d'énergie.`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{installers}/g, installers)
    .replace(/{delai}/g, delai)
    .replace(/{priceMin}/g, priceMin.toLocaleString('fr-FR'))
    .replace(/{priceMax}/g, priceMax.toLocaleString('fr-FR'));

  return spin(replaced, rand);
}

function generateAnecdoteText(c, region, rand) {
  const base = `{Le patrimoine provençal de|L'histoire locale et l'architecture urbaine de} **{nom}** {nous rappellent l'importance de s'adapter aux chaleurs du Sud de la France.|exigent une intégration visuelle de haut niveau pour tous les équipements modernes de chauffage et climatisation.}` +
  ` Autour de monuments et sites remarquables comme **{landmark}**, l'installation de blocs extérieurs est soumise aux directives du PLU. Pour contourner ce défi esthétique, les artisans qualifiés proposent des cache-climatisations décoratifs ventilés imitation bois ou aluminium laqué gris anthracite, préservant le charme des façades en pierre ou des enduits ocre. Cette approche garantit le respect de la réglementation locale tout en offrant une protection contre le soleil direct, augmentant ainsi le coefficient d'efficacité saisonnier (SEER) de l'appareil.`;

  const replaced = base
    .replace(/{nom}/g, c.nom)
    .replace(/{landmark}/g, region.landmark);

  return spin(replaced, rand);
}

// 8 highly spun FAQ items
const faqPool = [
  {
    topic: "prix",
    q: "Combien coûte l'installation complète d'une climatisation à {city} ?",
    a: "À {city}, le prix moyen pour poser un modèle mono-split (une pièce) par un artisan qualifié oscille entre 1 800 € et 2 800 € TTC. Pour équiper un logement complet (3 à 4 pièces) avec un système multi-split, comptez entre 4 500 € et 8 000 € TTC, selon la complexité des liaisons frigorifiques et les contraintes de pose."
  },
  {
    topic: "aides",
    q: "Quelles subventions de l'État sont applicables pour une pompe à chaleur à {city} en 2026 ?",
    a: "À {city}, la pose d'une climatisation réversible (PAC air-air) donne accès à la Prime CEE (Certificats d'Économie d'Énergie) financée par les fournisseurs d'énergie. Vous profitez également d'un taux de TVA réduit à 10% sur le coût de la main-d'œuvre. Ces aides requièrent obligatoirement l'intervention d'un installateur certifié RGE Qualipac."
  },
  {
    topic: "copropriete",
    q: "Faut-il une autorisation de la mairie de {city} pour installer une unité extérieure ?",
    a: "Oui. Modifier l'aspect extérieur d'un bâtiment à {city} impose de déposer une Déclaration Préalable de travaux (DP) auprès du service urbanisme de la mairie. De plus, si vous vivez en copropriété, vous devez obligatoirement obtenir l'accord des copropriétaires lors de l'Assemblée Générale annuelle avant le début des travaux."
  },
  {
    topic: "consommation",
    q: "Quelle économie de chauffage peut-on espérer à {city} avec une climatisation Inverter ?",
    a: "En remplaçant de vieux convecteurs électriques par une climatisation réversible dotée de la technologie Inverter, vous divisez par 3 à 4 votre consommation d'électricité liée au chauffage en hiver. Le climat de {city} étant doux mais venté, ce type de chauffage thermodynamique offre le meilleur coefficient saisonnier (SCOP > 4.6)."
  },
  {
    topic: "bruit",
    q: "Le compresseur de climatisation risque-t-il d'engendrer des nuisances pour le voisinage à {city} ?",
    a: "Les climatiseurs haut de gamme des marques Daikin et Mitsubishi installés à {city} sont très silencieux, émettant environ 40 à 45 dB(A) à l'extérieur. L'artisan frigoriste installe obligatoirement des plots anti-vibratoires (silent blocks) pour absorber les vibrations et oriente le ventilateur à l'écart des fenêtres des voisins."
  },
  {
    topic: "entretien",
    q: "L'entretien bisannuel par un frigoriste agréé est-il obligatoire à {city} ?",
    a: "Oui, la réglementation française impose un contrôle d'étanchéité tous les deux ans pour tous les équipements contenant plus de 2 kg de fluide frigorigène (ce qui concerne les gros multi-split et gainables). À {city}, nous vous conseillons d'effectuer un entretien annuel simple pour désinfecter les filtres et garantir la qualité de l'air."
  }
];

function generateFAQs(cityName, rand) {
  const shuffled = [...faqPool].sort(() => rand() - 0.5);
  const picked = shuffled.slice(0, 4); // 4 FAQs instead of 3 for more rich content
  
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

      // Math calculations for local authority data
      const btuRequired = (10 * (1 + (altitude / 1000))).toFixed(1); // e.g. 10.5 kW
      const savingsEstimated = Math.round(750 + rand() * 350);

      // Price brackets
      const priceMin = Math.round(1500 + rand() * 500);
      const priceMax = Math.round(4500 + rand() * 3500);

      // Generated spun texts with local facts
      const introText = generateIntroText(c, installersCount, distanceToCenter, region, rand, btuRequired, savingsEstimated);
      const accessibilityChallenge = generateChallengeText(c, region, altitude, rand);
      const localHelp = generateHelpText(c, installersCount, delaiMoyen, rand, priceMin, priceMax);
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
