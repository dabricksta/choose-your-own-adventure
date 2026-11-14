// Browser smoke suite. Drives the real game in an iframe, in demo mode.
// No build step and no framework: open /tests/smoke.html and read the list.
//
// Each test starts a fresh seeded run, types actions into the real textarea,
// clicks the real buttons, and asserts on the game's public debug surface.

const frame = document.querySelector('#game');
const list = document.querySelector('#results');
const summary = document.querySelector('#summary');

const game = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const phase = () => game().__frostmarch.debug().phase;
const logLength = () => game().__frostmarch.debug().logLength;
const state = () => JSON.parse(JSON.stringify(game().__frostmarch.debug().state));
const transcript = () => doc().querySelector('#transcript').innerText;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function until(predicate, label, timeout = 4000) {
  const start = performance.now();
  for (;;) {
    try {
      if (predicate()) return;
    } catch {
      // The frame is mid-reload; keep polling.
    }
    if (performance.now() - start > timeout) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

async function act(text) {
  const input = doc().querySelector('#answer');
  if (!input) throw new Error(`No textarea. Composer reads: ${doc().querySelector('#composer').innerText}`);
  const before = logLength();
  input.value = text;
  const EventCtor = game().Event;
  input.dispatchEvent(new EventCtor('input', { bubbles: true }));
  doc().querySelector('#go').click();
  await until(() => logLength() > before, `a response to “${text}”`);
}

async function choose(id) {
  const button = doc().querySelector(`#composer [data-id="${id}"]`);
  if (!button) throw new Error(`No choice “${id}”. Composer reads: ${doc().querySelector('#composer').innerText}`);
  const before = logLength();
  button.click();
  await until(() => logLength() > before, `the “${id}” choice`);
}

async function begin(seed) {
  game().__frostmarch.begin(seed);
  await until(() => phase() === 'gender', 'a new run');
}

// Create a character, set out, and arrive at the route's approach beat.
async function setup(seed, specialty, hunt, route) {
  await begin(seed);
  await act('a hunter of Keld');
  await act(specialty);
  await act(hunt);
  await act(route);
  assert(phase() === 'beat', `expected the approach beat after ${route}, got "${phase()}".`);
}

const tests = [
  ['victory, loot, and ending', async () => {
    await setup('smoke-victory', 'I am strong', 'I prepare rope and a spear', 'east');
    assert(state().gear === 2, `preparation gave ${state().gear} gear charges.`);
    await act('I watch how it sorts the cargo before I show myself');
    await act('I stab it');
    assert(state().outcome === 'victory', `outcome was ${state().outcome}.`);
    assert(phase() === 'loot', `phase was ${phase()}.`);    await act('I keep the essence and harvest the materials');
    assert(state().inventory.essences.includes('martial'), 'kept essence was not added to the pack.');
    assert(state().loot.materialsTaken, 'materials were not taken.');
    await choose('healer');
    await act('I tell the truth, including the cost');
    assert(phase() === 'end', `phase was ${phase()}.`);
    assert(doc().querySelector('.end'), 'no ending text was rendered.');
  }],

  ['parley with an intelligent foe', async () => {
    await setup('smoke-parley', 'I am a persuasive leader', 'I ask a hunter to come with me', 'east');
    assert(state().companion, 'the hunter did not join the hunt.');
    await act('I watch how it sorts the cargo');
    await act('I lower my weapon and offer terms for the sled');
    const s = state();
    assert(s.outcome === 'parley', `outcome was ${s.outcome}.`);
    assert(s.reputation === 1, `reputation was ${s.reputation}.`);
    assert(s.factionStanding['White Dragonborn'] === 2, `standing was ${s.factionStanding['White Dragonborn']}.`);
    assert(s.essencesFound.length === 0, 'parley left essence behind.');
    assert(!s.loot.materialsTaken && !s.loot.meatTaken, 'parley granted loot.');
    assert(phase() === 'audience', `phase was ${phase()}.`);
  }],

  ['parley is refused once blood is drawn', async () => {
    await setup('smoke-blood', 'I am observant', 'I leave now', 'east');
    await act('I charge it head-on');
    await act('I stab it');
    const before = state().reputation;
    await act('I offer terms');
    const s = state();
    assert(s.outcome !== 'parley', 'parley succeeded after blood was drawn.');
    assert(s.reputation === before, 'a refused parley still granted reputation.');
    assert(s.combat.negotiated === false, 'the refusal was recorded as a successful negotiation.');
    assert(phase() === 'fight', `phase was ${phase()}.`);
  }],

  ['faction standing lets you talk after blood', async () => {
    await setup('smoke-standing', 'I am observant', 'I leave now', 'east');
    await act('I watch how it sorts the cargo');
    await act('I stab it');
    assert(state().combat.bloodDrawn, 'the attack did not register as blood drawn.');
    await act('I offer terms');
    assert(state().outcome === 'parley', `outcome was ${state().outcome}.`);
    assert(state().factionStanding['White Dragonborn'] === 2, 'standing was not carried into the parley.');
  }],

  ['retreat returns you to the village', async () => {
    await setup('smoke-retreat', 'I am quick', 'I leave now', 'north');
    await act('I study the cavern');
    await act('I retreat before it can close with me');
    assert(state().outcome === 'retreat', `outcome was ${state().outcome}.`);
    assert(state().essencesFound.length === 0, 'retreat kept essence.');
    assert(phase() === 'audience', `phase was ${phase()}.`);
  }],

  ['collapse is a distinct outcome', async () => {
    await setup('smoke-collapse', 'I am strong', 'I leave now', 'north');
    await act('I study the cavern');
    await act('I reach for gear I did not bring');
    await act('I reach for gear I did not bring');
    await act('I reach for gear I did not bring');
    assert(state().outcome === 'collapse', `outcome was ${state().outcome}.`);
    assert(state().health === 1, `health after rescue was ${state().health}.`);
    assert(phase() === 'audience', `phase was ${phase()}.`);
  }],

  ['enduring specialty: endure absorbs a wound', async () => {
    await setup('smoke-endure', 'I am enduring', 'I leave now', 'north');
    await act('I study the cavern');
    await act('I brace myself');
    assert(state().combat.braced, 'the brace flag was not set.');
    await act('I reach for gear I did not bring');
    assert(state().health === 3, `health was ${state().health} after the braced blow.`);
    assert(state().combat.braced === false, 'the brace was not spent.');
    await act('I reach for gear I did not bring');
    assert(state().health === 2, `health was ${state().health} on the unbraced blow.`);
  }],

  ['healer specialty: mend removes a wound', async () => {
    await setup('smoke-mend', 'I am a healer', 'I leave now', 'north');
    await act('I study the cavern');
    await act('I reach for gear I did not bring');
    assert(state().health === 2, `health was ${state().health} before mending.`);
    await act('I bind my wound');
    assert(state().health === 3, `health was ${state().health} after mending.`);
    assert(state().injuries.length === 0, 'the injury was not removed.');
  }],

  ['clever approach adds an essence', async () => {
    await setup('smoke-clever', 'I am cunning', 'I leave now', 'north');
    await act('I pry a mineral nodule free');
    assert(state().essencesFound.includes('metal'), `essences were ${state().essencesFound.join(', ')}.`);
    assert(phase() === 'fight', `phase was ${phase()}.`);
  }],

  ['a save restores the approach beat', async () => {
    await setup('smoke-reload', 'I am quick', 'I prepare rope', 'east');
    const variant = state().beat.variant;
    frame.contentWindow.location.reload();
    await until(() => game().__frostmarch && phase() === 'beat', 'the restored beat');
    assert(state().seed === 'smoke-reload', `seed was ${state().seed}.`);
    assert(state().beat.variant === variant, 'the beat variant changed across the reload.');
    assert(doc().querySelector('#composer').innerText.includes('before you close'), 'the beat prompt was not restored.');
  }],

  ['killing a faction lowers standing and reaches the audience', async () => {
    await setup('smoke-faction', 'I am observant', 'I leave now', 'east');
    await act('I charge it head-on');
    await act('I stab it');
    await act('I stab it');
    assert(state().outcome === 'victory', `outcome was ${state().outcome}.`);
    const standing = state().factionStanding['White Dragonborn'];
    assert(standing === -1, `standing was ${standing}.`);
    await act('I leave everything');
    assert(transcript().includes('killer of their people'), 'the audience did not react to negative standing.');
  }],

  ['provider panel is collapsed and aligned with the other disclosures', async () => {
    const panel = doc().querySelector('#provider-panel');
    assert(panel, 'the provider panel is missing.');
    assert(!panel.open, 'the provider panel should be collapsed by default.');
    assert(doc().querySelector('#provider-name').textContent.includes('Local demo'), 'the summary does not show the active provider.');
    const lefts = [...doc().querySelectorAll('.run-tools > summary, .realm-map > summary, .provider > summary')]
      .map(element => Math.round(element.getBoundingClientRect().left));
    assert(lefts.length === 3, `expected 3 disclosure summaries, found ${lefts.length}.`);
    assert(new Set(lefts).size === 1, `disclosure summaries start at ${lefts.join(', ')}.`);
  }]
];

function render(results) {
  const failed = results.filter(result => !result.ok).length;
  const passed = results.length - failed;
  const finished = results.length === tests.length;
  summary.textContent = `${passed} passed, ${failed} failed${finished ? ' — finished' : ''}`;
  summary.className = failed ? 'fail' : 'pass';
  list.innerHTML = results.map(result => `<li class="${result.ok ? 'pass' : 'fail'}">${result.name}${result.ok ? '' : `<pre>${result.error}</pre>`}</li>`).join('');
  window.__smoke = { total: results.length, passed, failed, results };
  document.title = `${failed ? 'FAIL' : 'PASS'} — smoke tests`;
}

const results = [];
const SAVE_KEYS = ['frostmarch-hunt-save-v1', 'frostmarch-hunt-save-v2'];
const savedSaves = new Map(SAVE_KEYS.map(key => [key, localStorage.getItem(key)]));

await until(() => game().__frostmarch, 'the game to boot');
try {
  for (const [name, run] of tests) {
    try {
      await run();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: error.message || String(error) });
    }
    render(results);
  }
} finally {
  // Playing the tests overwrites the real save; put the player's runs back
  // and reload the frame so its in-memory state matches storage again.
  for (const [key, value] of savedSaves) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }
  frame.contentWindow.location.reload();
}
render(results);
