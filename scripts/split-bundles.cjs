const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const BACKEND_DATA_DIR = path.join(ROOT_DIR, 'backend', 'data');

// Ensure target directories exist
fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });

console.log('Loading source curriculum data...');
const lexicon = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lexicon.json'), 'utf8'));
const reading = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'reading.json'), 'utf8'));
const writing = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'writing.json'), 'utf8'));
const speaking = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'speaking.json'), 'utf8'));

console.log(`Original counts:
- Lexicon: ${lexicon.length}
- Reading: ${reading.length}
- Writing: ${writing.length}
- Speaking Topic Bank: ${speaking.topic_bank.length}
- Listening Sets: ${speaking.listening_practice?.sets?.length || 0}`);

// 1. Partition Lexicon (250 Free / 912 VIP)
const freeLexicon = lexicon.slice(0, 250);
const vipLexicon = lexicon.slice(250);

// 2. Partition Reading (3 Free / 20 VIP)
const freeReading = reading.slice(0, 3);
const vipReading = reading.slice(3);

// 3. Partition Writing (5 Free / 35 VIP)
const freeWriting = writing.slice(0, 5);
const vipWriting = writing.slice(5);

// 4. Partition Speaking & Listening
const freeSpeaking = {
  frameworks: speaking.frameworks || [],
  video_scripts: speaking.video_scripts || [],
  sentence_patterns: speaking.sentence_patterns || [],
  idioms: speaking.idioms || [],
  word_families: speaking.word_families || [],
  vocab_upgrades: speaking.vocab_upgrades || [],
  synonym_sets: speaking.synonym_sets || [],
  topic_bank: speaking.topic_bank || [],
  listening_practice: {
    signposting: speaking.listening_practice?.signposting || [],
    spellingTraps: speaking.listening_practice?.spellingTraps || [],
    sets: (speaking.listening_practice?.sets || []).slice(0, 1)
  }
};

const vipSpeaking = {
  topic_bank: speaking.topic_bank || [],
  listening_practice: {
    sets: (speaking.listening_practice?.sets || []).slice(1)
  }
};

const freeBundle = {
  lexicon: freeLexicon,
  reading: freeReading,
  writing: freeWriting,
  speaking: freeSpeaking
};

const vipBundle = {
  lexicon: vipLexicon,
  reading: vipReading,
  writing: vipWriting,
  speaking: vipSpeaking
};

// Write public/data/free-bundle.json and duplicate to data/free-bundle.json for root path safety
const freeBundleJson = JSON.stringify(freeBundle);
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'free-bundle.json'), freeBundleJson, 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'free-bundle.json'), freeBundleJson, 'utf8');

// Write vip-bundle.json to backend, public/data and data for universal availability
const vipBundleJson = JSON.stringify(vipBundle);
fs.writeFileSync(path.join(BACKEND_DATA_DIR, 'vip-bundle.json'), vipBundleJson, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'vip-bundle.json'), vipBundleJson, 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'vip-bundle.json'), vipBundleJson, 'utf8');

console.log('✅ Bundle splitting complete:');
console.log(`- public/data/free-bundle.json: ${(freeBundleJson.length / 1024).toFixed(1)} KB`);
console.log(`  * Lexicon: ${freeBundle.lexicon.length}`);
console.log(`  * Reading: ${freeBundle.reading.length}`);
console.log(`  * Writing: ${freeBundle.writing.length}`);
console.log(`  * Speaking Topics: ${freeBundle.speaking.topic_bank.length}`);
console.log(`  * Listening Sets: ${freeBundle.speaking.listening_practice.sets.length}`);
console.log(`- backend/data/vip-bundle.json: ${(vipBundleJson.length / 1024).toFixed(1)} KB`);
console.log(`  * Lexicon: ${vipBundle.lexicon.length}`);
console.log(`  * Reading: ${vipBundle.reading.length}`);
console.log(`  * Writing: ${vipBundle.writing.length}`);
console.log(`  * Speaking Topics: ${vipBundle.speaking.topic_bank.length}`);
console.log(`  * Listening Sets: ${vipBundle.speaking.listening_practice.sets.length}`);
