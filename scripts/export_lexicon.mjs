import fs from 'fs';
import { CURATED_ACADEMIC_LEXICON } from '../academic_engine.mjs';

const code = `/**
 * IELTS Prep Studio — High-Yield Curated Academic Lexicon
 * Band 8.5/9.0 Lexical Resource & Academic Collocation Engine
 */
(function() {
  var LEXICON = ${JSON.stringify(CURATED_ACADEMIC_LEXICON, null, 2)};
  if (typeof window !== 'undefined') {
    window.CURATED_ACADEMIC_LEXICON = LEXICON;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CURATED_ACADEMIC_LEXICON: LEXICON };
  }
})();
`;

fs.writeFileSync('js/academic-lexicon.js', code, 'utf8');
console.log('js/academic-lexicon.js generated successfully! Size:', code.length);
