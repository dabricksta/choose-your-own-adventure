// Static content and constants for The Initiate's Hunt.
// Everything a model may classify lives here as a closed label set.

export const SAVE_KEY = 'frostmarch-hunt-save-v2';
export const LEGACY_SAVE_KEY = 'frostmarch-hunt-save-v1';
export const SAVE_VERSION = 2;
export const MAX_LOG_ENTRIES = 600;
export const CLASSIFIER_TIMEOUT_MS = 45000;

export const SPECIALTIES = [
  'strong', 'quick', 'enduring', 'observant', 'cunning', 'healer', 'tracker', 'leader', 'other'
];

export const APPROACHES = ['prepare', 'ask_for_help', 'leave_quickly', 'other'];
export const TACTICS = ['attack', 'evade', 'use_environment', 'use_gear', 'negotiate', 'retreat', 'other'];
export const ESSENCE_ACTIONS = ['keep', 'consume', 'offer', 'destroy', 'leave', 'other'];
export const CARCASS_ACTIONS = ['harvest', 'leave', 'other'];
export const STANCES = ['truthful', 'boastful', 'guarded', 'apologetic', 'other'];

export const MONSTER_KINDS = ['goliath', 'giant', 'dragonborn', 'wild'];
export const OUTCOMES = ['victory', 'retreat', 'collapse', 'parley'];

export const PHASES = new Set([
  'gender', 'specialty', 'hunt', 'direction', 'fight', 'loot',
  'audience', 'audience-name', 'talk', 'end'
]);

export const LOG_CLASSES = new Set(['scene', 'scene player', 'annotation', 'bridge', 'end']);

export const DIRECTIONS = {
  north: {
    name: 'north',
    region: 'Graycap Range',
    species: 'Goliaths',
    monster: 'Goliath delver',
    kind: 'goliath',
    vitality: 3,
    threat: 1,
    essences: ['stone', 'earth', 'ice'],
    conflict: 'Goliath prospectors claim mountain dungeons and valuable mineral seams. Their claims put them in direct competition with Keld’s miners.',
    scene: 'North of Keld, the Graycap Range rises above the treeline. At a marked cavern near an old dungeon entrance, a Goliath delver tests a fresh mineral seam.'
  },
  northwest: {
    name: 'northwest',
    region: 'Giant’s Pass',
    species: 'Frost Giants',
    monster: 'Frost Giant raider',
    kind: 'giant',
    vitality: 4,
    threat: 2,
    essences: ['martial', 'earth', 'ice'],
    conflict: 'Frost Giants travel the high passes in nomadic bands. They compete for dungeon sites and sometimes raid human villages for supplies.',
    scene: 'Northwest of Keld, the old Giant’s Pass cuts between the Graycap foothills and the western crags. A Frost Giant raider has left the band’s trail and is carrying village stores toward the pass.'
  },
  east: {
    name: 'east',
    region: 'Birchway',
    species: 'White Dragonborn',
    monster: 'White Dragonborn hoarder',
    kind: 'dragonborn',
    vitality: 3,
    threat: 1,
    essences: ['martial', 'fire', 'ice'],
    conflict: 'White Dragonborn compete for dungeons. Their hoarding brings them into conflict with humans over wealth, stored goods, and trade.',
    scene: 'East of Keld, the Birchway follows the Rimewood supply road. A White Dragonborn has stopped a village-bound sled and is sorting valuables from its cargo; fresh marks point toward a nearby dungeon.'
  },
  south: {
    name: 'south',
    region: 'Mammoth Grounds',
    species: 'mammoth herds',
    monster: 'mammoth',
    kind: 'wild',
    vitality: 3,
    threat: 1,
    essences: ['beast', 'ice'],
    conflict: 'Keld’s people hunt mammoths for food and materials, but the herds defend themselves when threatened.',
    scene: 'South of Keld, the Mammoth Grounds spread across open tundra. A herd has bunched around its calves, and the adults turn toward you as you approach.'
  },
  southwest: {
    name: 'southwest',
    region: 'Direwolf Wood',
    species: 'direwolf packs',
    monster: 'direwolf pack',
    kind: 'wild',
    vitality: 2,
    threat: 2,
    essences: ['beast', 'ice'],
    conflict: 'Keld’s people hunt wild animals, while direwolf packs hunt lone travelers and small groups moving through the western wood.',
    scene: 'Southwest of Keld, scrub pine thickens into Direwolf Wood. A pack has caught your scent and begins to circle downwind, testing whether you are alone.'
  }
};

export const ROUTES = Object.keys(DIRECTIONS);

export const WILD_MUTATIONS = ['stone', 'fire', 'lightning', 'shadow', 'venom', 'regrowth'];

export const PROVIDER_PRESETS = {
  demo: {
    model: 'local-demo',
    endpoint: '',
    help: 'Demo mode classifies locally with simple keyword rules. It needs no model account and sends no text anywhere.'
  },
  'claude-app': {
    model: 'Claude (in-app)',
    endpoint: '',
    help: 'Uses the host app’s Claude integration. This depends on app-session access and may use Claude quota.'
  },
  anthropic: {
    model: 'claude-haiku-5-5',
    endpoint: 'https://api.anthropic.com/v1/messages',
    help: 'Calls Anthropic directly with your API key. The key stays in this tab; browser CORS or account settings may prevent direct calls.'
  },
  openai: {
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1',
    help: 'Calls OpenAI’s chat completions API with your key. The key stays in this tab.'
  },
  qwen: {
    model: 'qwen-plus',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    help: 'Calls Qwen’s OpenAI-compatible endpoint. Change the endpoint for your region if needed.'
  },
  local: {
    model: 'qwen2.5:7b-instruct',
    endpoint: 'http://localhost:11434/v1',
    help: 'OpenAI-compatible local endpoint (for example Ollama at localhost:11434/v1 or LM Studio at localhost:1234/v1). CORS must allow this page origin.'
  },
  jev: {
    model: 'jev-latest',
    endpoint: 'https://api.typesafe.ai',
    help: 'Uses Jev’s typed choice API. Supply a TypeSafe API key. Jev classifies choices; local code resolves story consequences.'
  }
};

// Human-readable labels for the manual fallback chips.
export const LABEL_TEXT = {
  strong: 'Strong',
  quick: 'Quick',
  enduring: 'Enduring',
  observant: 'Observant',
  cunning: 'Cunning',
  healer: 'Healer',
  tracker: 'Tracker',
  leader: 'Leader',
  other: 'Something else',
  prepare: 'Prepare',
  ask_for_help: 'Ask for help',
  leave_quickly: 'Leave quickly',
  attack: 'Attack',
  evade: 'Evade',
  use_environment: 'Use the terrain',
  use_gear: 'Use gear',
  negotiate: 'Negotiate',
  retreat: 'Retreat',
  keep: 'Keep',
  consume: 'Consume',
  offer: 'Offer',
  destroy: 'Destroy',
  leave: 'Leave',
  harvest: 'Harvest',
  truthful: 'Truthful',
  boastful: 'Boastful',
  guarded: 'Guarded',
  apologetic: 'Apologetic',
  unclear: 'Not sure',
  north: 'North',
  northwest: 'Northwest',
  east: 'East',
  south: 'South',
  southwest: 'Southwest'
};

export const FIELD_LABELS = {
  specialty: 'Specialty',
  approach: 'Approach',
  direction: 'Route',
  tactic: 'Tactic',
  essence: 'Essence',
  carcass: 'Remains',
  stance: 'Manner'
};
