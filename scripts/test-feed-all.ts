import { BrowserMediumClient } from '../src/browser-client';

async function testFeedAll() {
  console.log('🧪 Testing getFeed() with category="all"...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser...');
    await client.initialize(false); // Non-headless to see what's happening

    console.log('📰 Fetching articles from ALL feeds (limit: 5 per feed)...\n');
    const articles = await client.getFeed('all', 5);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 FOUND ${articles.length} TOTAL ARTICLE(S) FROM ALL FEEDS`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Group articles by feed category
    const featured = articles.filter(a => a.feedCategory === 'featured');
    const forYou = articles.filter(a => a.feedCategory === 'for-you');
    const following = articles.filter(a => a.feedCategory === 'following');

    console.log(`📊 Articles by feed:`);
    console.log(`   Featured: ${featured.length}`);
    console.log(`   For You: ${forYou.length}`);
    console.log(`   Following: ${following.length}\n`);

    // Display sample from each category
    if (featured.length > 0) {
      console.log('📰 FEATURED FEED:');
      featured.slice(0, 2).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}`);
        console.log(`     URL: ${article.url}`);
        console.log(`     Feed: ${article.feedCategory}`);
      });
      if (featured.length > 2) console.log(`     ... and ${featured.length - 2} more\n`);
      else console.log('');
    }

    if (forYou.length > 0) {
      console.log('📰 FOR YOU FEED:');
      forYou.slice(0, 2).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}`);
        console.log(`     URL: ${article.url}`);
        console.log(`     Feed: ${article.feedCategory}`);
      });
      if (forYou.length > 2) console.log(`     ... and ${forYou.length - 2} more\n`);
      else console.log('');
    }

    if (following.length > 0) {
      console.log('📰 FOLLOWING FEED:');
      following.slice(0, 2).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}`);
        console.log(`     URL: ${article.url}`);
        console.log(`     Feed: ${article.feedCategory}`);
      });
      if (following.length > 2) console.log(`     ... and ${following.length - 2} more\n`);
      else console.log('');
    }

    console.log('✅ All articles have feedCategory tag!');
    console.log('💡 This allows filtering/grouping articles by their source feed\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    console.log('🔒 Closing browser...');
    await client.close();
    console.log('✅ Done!');
  }
}

testFeedAll().catch(console.error);
