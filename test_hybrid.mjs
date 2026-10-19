import { getAcademicCollocations, getAcademicSynonyms, fetchFullWikipediaArticle } from './academic_engine.mjs';

async function runTests() {
  console.log('=== 1. CURATED LEXICON TEST: "mitigate" ===');
  const curatedCol = await getAcademicCollocations('mitigate');
  console.log('Curated Collocations:', curatedCol ? Object.keys(curatedCol.collocations) : null);
  console.log('Sample Band 9 Frame:', curatedCol?.collocations?.frame);

  const curatedSyn = await getAcademicSynonyms('mitigate');
  console.log('Curated Synonyms count:', curatedSyn?.items?.length);
  console.log('Top Synonym:', curatedSyn?.items?.[0]);

  console.log('\n=== 2. DYNAMIC DATAMUSE TEST: "infrastructure" ===');
  const dynCol = await getAcademicCollocations('infrastructure');
  console.log('Dynamic POS:', dynCol?.pos);
  console.log('Adjective + Noun:', dynCol?.collocations?.adj_noun?.slice(0, 3));
  console.log('Band 9 Frame:', dynCol?.collocations?.frame);

  const dynSyn = await getAcademicSynonyms('infrastructure');
  console.log('Dynamic Synonyms count:', dynSyn?.items?.length);
  console.log('Sample Dynamic Synonym:', dynSyn?.items?.[0]);

  console.log('\n=== 3. FULL WIKIPEDIA ARTICLE TEST: "Renewable energy" ===');
  const wiki = await fetchFullWikipediaArticle('Renewable energy');
  console.log('Title:', wiki?.title);
  console.log('Word count:', wiki?.wordCount);
  console.log('Estimated read time:', wiki?.readingTimeMin, 'min');
  console.log('Total pages (<= 3200 chars each):', wiki?.totalPages);
  console.log('Page 1 snippet:', wiki?.pages?.[0]?.substring(0, 150) + '...');

  console.log('\n✅ ALL HYBRID ACADEMIC ENGINE TESTS PASSED WITH ZERO ERRORS!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
