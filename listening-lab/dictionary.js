const dictionaryRoot = document.getElementById('dictionaryRoot');

const QUIZ_CONFIG = {
  'B vs. V': { questionsPath: 'data/quiz/b-v.json', subtitle: 'B vs. V' },
  'R vs. L': { questionsPath: 'data/quiz/r-l.json', subtitle: 'R vs. L' },
  'EE vs. IH': { questionsPath: 'data/quiz/ee-ih.json', subtitle: 'EE vs. IH' },
  'UU vs. OO': { questionsPath: 'data/quiz/uu-oo.json', subtitle: 'UU vs. OO' }
};

const DECK_GROUPS = {
  "B vs. V": {
    "Initial": [
      ["bale", "veil"],
      ["ban", "van"],
      ["bane", "vain"],
      ["bat", "vat"],
      ["beer", "veer"],
      ["berry", "very"],
      ["best", "vest"],
      ["bet", "vet"],
      ["bid", "vid"],
      ["bile", "vile"],
      ["biz", "viz"],
      ["boat", "vote"],
      ["bolt", "volt"],
      ["bow", "vow"],
      ["bowel", "vowel"],
      ["bowl", "vole"],
      ["broom", "vroom"]
    ],
    "Medial": [
      ["dribble", "drivel"],
      ["fiber", "fiver"],
      ["gibbon", "given"],
      ["lobes", "loaves"],
      ["rebel", "revel"]
    ],
    "Final": [
      ["carb", "carve"],
      ["curb", "curve"],
      ["dub", "dove"],
      ["jibe", "jive"],
      ["serb", "serve"],
      ["verb", "verve"]
    ]
  },
  "R vs. L": {
    "Initial": [
      ["lamb", "ram"],
      ["lack", "rack"],
      ["lace", "race"],
      ["lake", "rake"],
      ["lair", "rare"],
      ["lead", "read"],
      ["leak", "reek"],
      ["leap", "reap"],
      ["leech", "reach"],
      ["leer", "rear"],
      ["link", "rink"],
      ["lick", "rick"],
      ["limb", "rim"],
      ["light", "right"],
      ["lime", "rhyme"],
      ["law", "raw"],
      ["lob", "rob"],
      ["lobe", "robe"],
      ["lope", "rope"],
      ["loaves", "roves"],
      ["look", "rook"],
      ["luck", "ruck"],
      ["lug", "rug"],
      ["lump", "rump"],
      ["lung", "rung"],
      ["lush", "rush"],
      ["lust", "rust"],
      ["loom", "room"]
    ],
    "Cluster": [
      ["blacken", "bracken"],
      ["blight", "bright"],
      ["blue", "brew"],
      ["clash", "crash"],
      ["flee", "free"],
      ["fleas", "freeze"],
      ["glow", "grow"]
    ]
  },
  "EE vs. IH": {
    "": [
      ["each", "itch"],
      ["eel", "ill"],
      ["beach", "bitch"],
      ["bead", "bid"],
      ["bean", "bin"],
      ["beat", "bit"],
      ["bees", "biz"],
      ["bleep", "blip"],
      ["breeches", "britches"],
      ["cheap", "chip"],
      ["cheek", "chick"],
      ["deed", "did"],
      ["dean", "din"],
      ["deep", "dip"],
      ["feel", "fill"],
      ["feast", "fist"],
      ["fees", "fizz"],
      ["feet", "fit"],
      ["fleet", "flit"],
      ["gene", "gin"],
      ["greed", "grid"],
      ["green", "grin"],
      ["heap", "hip"],
      ["heat", "hit"],
      ["heed", "hid"],
      ["he'll", "hill"],
      ["keep", "kip"],
      ["keyed", "kid"],
      ["leak", "lick"],
      ["leap", "lip"],
      ["meal", "mill"],
      ["meet", "mitt"],
      ["neat", "knit"],
      ["peace", "piss"],
      ["peach", "pitch"],
      ["peep", "pip"],
      ["peel", "pill"],
      ["peat", "pit"],
      ["peek", "pick"],
      ["reason", "risen"],
      ["scheme", "skim"],
      ["seam", "sim"],
      ["seat", "sit"],
      ["seek", "sick"],
      ["seen", "sin"],
      ["seep", "sip"],
      ["sheen", "shin"],
      ["skied", "skid"],
      ["skeet", "skit"],
      ["sleek", "slick"],
      ["sleep", "slip"],
      ["sleet", "slit"],
      ["steal", "still"],
      ["teal", "till"],
      ["teak", "tick"],
      ["teen", "tin"]
    ]
  },
  "UU vs. OO": {
    "": [
      ["luke", "look"],
      ["who'd", "hood"],
      ["fool", "full"],
      ["gooed", "good"],
      ["kook", "cook"],
      ["soot", "suit"],
      ["stewed", "stood"],
      ["cooed", "could"],
      ["wooed", "wood"],
      ["shooed", "should"]
    ]
  }
};


const audioPlayer = new Audio();

audioPlayer.preload = 'auto';

audioPlayer.addEventListener('error', () => {
  console.warn('Audio failed to load.');
});

function createDeckSection(deckName, items) {
  const section = document.createElement('section');
  section.className = 'dictionary-section';

  const groups = DECK_GROUPS[deckName];
  if (groups) {
    Object.entries(groups).forEach(([groupTitle, pairs]) => {
      if (groupTitle) {
        const title = document.createElement('h2');
        title.className = 'deck-title';
        title.textContent = groupTitle;
        section.appendChild(title);
      }

      pairs.forEach(([leftLabel, rightLabel]) => {
        const pairRow = document.createElement('div');
        pairRow.className = 'answer-group';
        pairRow.style.marginBottom = '16px';

        pairRow.appendChild(createWordButton(leftLabel, items));
        pairRow.appendChild(createWordButton(rightLabel, items));
        section.appendChild(pairRow);
      });
    });
    return section;
  }

  const pairMap = new Map();
  items.forEach((item) => {
    if (!Array.isArray(item.choices) || item.choices.length < 2) return;
    const choices = item.choices.map((choice) => choice.toLowerCase());
    const key = [...choices].sort().join('||');
    const group = pairMap.get(key) || { labels: [...choices].sort(), items: [] };
    group.items.push(item);
    pairMap.set(key, group);
  });

  pairMap.forEach((group) => {
    const [leftLabel, rightLabel] = group.labels;
    const pairRow = document.createElement('div');
    pairRow.className = 'answer-group';
    pairRow.style.marginBottom = '16px';

    const leftButton = createWordButton(leftLabel, group.items);
    const rightButton = createWordButton(rightLabel, group.items);

    pairRow.appendChild(leftButton);
    pairRow.appendChild(rightButton);
    section.appendChild(pairRow);
  });

  return section;
}

function createWordButton(word, items) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'answer-button';
  button.textContent = word;

  const matched = items.find((item) => item.correct.toLowerCase() === word);
  if (matched) {
    button.addEventListener('click', () => playWord(word, matched.audio));
  } else {
    button.disabled = true;
  }

  return button;
}

function playWord(label, audioFile) {
  const normalizedAudio = encodeURI(`audio/words/${audioFile}`);
  audioPlayer.src = normalizedAudio;
  audioPlayer.play().catch((err) => {
    console.error('Audio playback failed:', err);
  });
}

const deckButtons = document.querySelectorAll('.quiz-buttons .quiz-button');
let loadedDecks = {};
let currentDeck = 'B vs. V';

function renderDeck(deckName) {
  const items = loadedDecks[deckName] || [];
  dictionaryRoot.innerHTML = '';
  if (!items.length) {
    const message = document.createElement('p');
    message.className = 'dictionary-hint';
    message.textContent = 'No word pairs available for this deck.';
    dictionaryRoot.appendChild(message);
    return;
  }
  const section = createDeckSection(deckName, items);
  dictionaryRoot.appendChild(section);
}

function setActiveDeckButton(deckName) {
  deckButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.quiz === deckName);
  });
}

function selectDeck(deckName) {
  currentDeck = deckName;
  setActiveDeckButton(deckName);
  renderDeck(deckName);
}

async function loadDictionary() {
  const promises = Object.entries(QUIZ_CONFIG).map(async ([deckName, config]) => {
    try {
      const res = await fetch(config.questionsPath);
      if (!res.ok) throw new Error(`Failed to load ${config.questionsPath}`);
      const data = await res.json();
      return { deckName, items: data };
    } catch (err) {
      console.error(err);
      return { deckName, items: [] };
    }
  });

  const decks = await Promise.all(promises);
  decks.forEach(({ deckName, items }) => {
    loadedDecks[deckName] = items;
  });

  deckButtons.forEach((button) => {
    button.addEventListener('click', () => selectDeck(button.dataset.quiz));
  });

  selectDeck(currentDeck);
}

loadDictionary();
