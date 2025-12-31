import { BrowserMediumClient } from '../../src/browser-client';

async function testGetArticles() {
  console.log('🧪 Testing getUserArticles() with new selectors...\n');

  const client = new BrowserMediumClient();

  try {
    // Initialize browser
    console.log('🌐 Initializing browser...');
    await client.initialize();

    // Get user articles
    console.log('📚 Fetching user articles...');
    const articles = await client.getUserArticles();

    console.log('\n✅ Success! Found articles:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (articles.length === 0) {
      console.log('⚠️  No articles found. This could mean:');
      console.log('   - You have no published articles');
      console.log('   - The selectors still need adjustment');
      console.log('   - You need to check the "Drafts" or "Responses" tabs');
    } else {
      articles.forEach((article, index) => {
        console.log(`Article #${index + 1}:`);
        console.log(`  Title: ${article.title}`);
        console.log(`  URL: ${article.url}`);
        console.log(`  Publish Date: ${article.publishDate || 'N/A'}`);
        console.log(`  Tags: ${article.tags?.join(', ') || 'None'}`);
        console.log('');
      });

      console.log(`Total: ${articles.length} article(s) found\n`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    console.log('🔒 Closing browser...');
    await client.close();
    console.log('✅ Done!');
  }
}

testGetArticles().catch(console.error);
