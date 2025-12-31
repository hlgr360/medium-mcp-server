import { BrowserMediumClient } from '../../src/browser-client';

async function testAllArticles() {
  console.log('🧪 Testing getUserArticles() with tab-based scraping...\n');

  const client = new BrowserMediumClient();

  try {
    // Initialize browser with stealth mode (should bypass Cloudflare in headless)
    console.log('🌐 Initializing browser with stealth plugin...');
    await client.initialize(); // Use default headless mode with stealth

    // Get ALL user articles
    console.log('📚 Fetching all articles from all tabs...\n');
    const articles = await client.getUserArticles();

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));

    if (articles.length === 0) {
      console.log('❌ No articles found!');
    } else {
      // Group by status
      const byStatus: { [key: string]: typeof articles } = {};
      articles.forEach(article => {
        const status = article.status || 'unknown';
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(article);
      });

      console.log(`\n✅ Found ${articles.length} total article(s)\n`);

      Object.entries(byStatus).forEach(([status, statusArticles]) => {
        console.log(`\n📑 ${status.toUpperCase()} (${statusArticles.length}):`);
        console.log('-'.repeat(80));

        statusArticles.forEach((article, i) => {
          console.log(`\n  ${i + 1}. ${article.title}`);
          console.log(`     URL: ${article.url}`);
          console.log(`     Date: ${article.publishDate || 'N/A'}`);
          console.log(`     Status: ${article.status}`);
        });
      });

      console.log('\n' + '='.repeat(80));
      console.log('Summary:');
      Object.entries(byStatus).forEach(([status, statusArticles]) => {
        console.log(`  ${status}: ${statusArticles.length}`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    console.log('\n🔒 Closing browser...');
    await client.close();
    console.log('✅ Done!');
  }
}

testAllArticles().catch(console.error);
