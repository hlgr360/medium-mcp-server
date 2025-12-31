import { BrowserMediumClient } from '../../src/browser-client';

async function testListArticles() {
  console.log('🧪 Testing getListArticles() method...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser...');
    await client.initialize(false);

    // First, get lists to find one with articles
    console.log('📋 Fetching lists to find one with articles...\n');
    const lists = await client.getLists();

    if (lists.length === 0) {
      console.log('❌ No lists found. Please create lists first.');
      return;
    }

    // Find a list with articles
    const listWithArticles = lists.find(list => list.articleCount && list.articleCount > 0);

    if (!listWithArticles) {
      console.log('❌ No lists with articles found.');
      console.log('Available lists:');
      lists.forEach(list => {
        console.log(`  - ${list.name} (${list.articleCount || 0} articles)`);
      });
      return;
    }

    console.log(`📚 Testing with list: "${listWithArticles.name}"`);
    console.log(`   ID: ${listWithArticles.id}`);
    console.log(`   Article count: ${listWithArticles.articleCount}\n`);

    // Fetch articles from the list
    const limit = Math.min(listWithArticles.articleCount || 5, 5); // Test with up to 5 articles
    console.log(`🔍 Fetching first ${limit} articles from this list...\n`);

    const articles = await client.getListArticles(listWithArticles.id, limit);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 FOUND ${articles.length} ARTICLE(S)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (articles.length === 0) {
      console.log('⚠️  No articles retrieved from the list.');
      console.log('   This could mean:');
      console.log('   - The list is actually empty');
      console.log('   - The selectors need updating');
      console.log('   - The page structure has changed\n');
    } else {
      articles.forEach((article, index) => {
        console.log(`📄 Article ${index + 1}:`);
        console.log(`   Title: ${article.title}`);
        console.log(`   Excerpt: ${article.excerpt.substring(0, 100)}${article.excerpt.length > 100 ? '...' : ''}`);
        console.log(`   URL: ${article.url}`);

        // Validate URL pattern
        const isArticleUrl = article.url.includes('-') && !article.url.match(/\/@[^\/]+\/?$/);
        const urlType = isArticleUrl ? '✅ ARTICLE URL' : '❌ PUBLICATION/PROFILE URL';
        console.log(`   Type: ${urlType}`);

        if (article.author) {
          console.log(`   Author: ${article.author}`);
        }
        if (article.publishDate) {
          console.log(`   Published: ${article.publishDate}`);
        }
        if (article.readTime) {
          console.log(`   Read time: ${article.readTime}`);
        }
        console.log('');
      });

      // Summary
      const validUrls = articles.filter(a => a.url.includes('-') && !a.url.match(/\/@[^\/]+\/?$/));
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 VALIDATION SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Total articles retrieved: ${articles.length}`);
      console.log(`Valid article URLs: ${validUrls.length}`);
      console.log(`Invalid URLs (publication/profile): ${articles.length - validUrls.length}`);

      if (validUrls.length === articles.length) {
        console.log('\n✅ SUCCESS! All URLs are valid article URLs!');
        console.log('💡 These URLs can be used with get-article-content tool\n');
      } else {
        console.log('\n⚠️  Some URLs are not article URLs. Review the output above.\n');
      }
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

testListArticles().catch(console.error);
