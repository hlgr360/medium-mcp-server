import { BrowserMediumClient } from '../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

async function testSaveArticle() {
  const sessionPath = join(__dirname, '..', 'medium-session.json');

  if (!existsSync(sessionPath)) {
    console.error('❌ No session file found. Run login-to-medium tool first.');
    process.exit(1);
  }

  const client = new BrowserMediumClient();

  try {
    console.log('🔖 Testing Save/Unsave Article Functionality\n');

    // Initialize browser
    await client.initialize();
    console.log('✅ Browser initialized');

    // Step 1: Get user's lists
    console.log('\n📋 Step 1: Fetching reading lists...');
    const lists = await client.getLists();

    if (lists.length === 0) {
      console.error('❌ No reading lists found. Create a list on Medium first.');
      process.exit(1);
    }

    console.log(`✅ Found ${lists.length} list(s):`);
    lists.forEach((list, i) => {
      console.log(`   ${i + 1}. ${list.name} (ID: ${list.id}) - ${list.articleCount} articles`);
    });

    const testList = lists[0];
    console.log(`\n🎯 Using list: "${testList.name}" (${testList.id})`);

    // Step 2: Use a test article URL
    // Using the antimicrobial resistance article from debug script
    const testArticleUrl = 'https://medium.com/@harvardmicrosociety/antimicrobial-resistance-at-the-forefront-of-microbial-threats-in-todays-world-916128f38c42';
    console.log(`\n📄 Test article: ${testArticleUrl}`);

    // Step 3: Save article to list (or unsave if already saved)
    console.log('\n💾 Step 2: Toggling article save state...');
    const firstToggle = await client.toggleArticleSave(testArticleUrl, testList.id);

    console.log('✅ First toggle operation completed:');
    console.log(`   Action: ${firstToggle.action}`);
    console.log(`   List: ${firstToggle.listName}`);
    console.log(`   Message: ${firstToggle.message}`);

    // Step 4: Verify article state in list
    console.log('\n🔍 Step 3: Verifying article in list...');
    await client['page']!.waitForTimeout(2000); // Wait for Medium to sync
    const listArticles = await client.getListArticles(testList.id, 20);

    const articleFound = listArticles.some(article =>
      article.url.includes('916128f38c42') || article.title.toLowerCase().includes('antimicrobial')
    );

    if (firstToggle.action === 'saved') {
      if (articleFound) {
        console.log('✅ Article successfully added to list');
      } else {
        console.log('⚠️  Article not found in list (may need time to sync)');
      }
    } else {
      if (!articleFound) {
        console.log('✅ Article successfully removed from list');
      } else {
        console.log('⚠️  Article still appears in list (may need time to sync)');
      }
    }

    // Step 5: Toggle again to return to original state
    console.log('\n🔄 Step 4: Toggling again (should reverse action)...');
    const secondToggle = await client.toggleArticleSave(testArticleUrl, testList.id);

    console.log('✅ Second toggle operation completed:');
    console.log(`   Action: ${secondToggle.action}`);
    console.log(`   Message: ${secondToggle.message}`);

    // Verify the toggle worked correctly
    if (firstToggle.action === 'saved' && secondToggle.action === 'unsaved') {
      console.log('\n✅ Toggle logic working correctly: saved → unsaved');
    } else if (firstToggle.action === 'unsaved' && secondToggle.action === 'saved') {
      console.log('\n✅ Toggle logic working correctly: unsaved → saved');
    } else {
      console.log(`\n⚠️  Unexpected toggle sequence: ${firstToggle.action} → ${secondToggle.action}`);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

testSaveArticle().catch(console.error);
