import { BrowserMediumClient } from '../../src/browser-client';

async function testGetLists() {
  console.log('🧪 Testing getLists() method...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser...');
    await client.initialize(false); // Non-headless to see what's happening

    console.log('📋 Fetching reading lists...\n');
    const lists = await client.getLists();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 FOUND ${lists.length} READING LIST(S)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (lists.length === 0) {
      console.log('ℹ️  No reading lists found.');
      console.log('   This could mean:');
      console.log('   - You haven\'t created any lists on Medium yet');
      console.log('   - The page structure has changed (selectors need updating)');
      console.log('   - You need to create lists at https://medium.com/me/lists\n');
    } else {
      lists.forEach((list, index) => {
        console.log(`📋 List ${index + 1}:`);
        console.log(`   ID: ${list.id}`);
        console.log(`   Name: ${list.name}`);
        if (list.description) {
          console.log(`   Description: ${list.description.substring(0, 100)}${list.description.length > 100 ? '...' : ''}`);
        }
        if (list.articleCount !== undefined) {
          console.log(`   Articles: ${list.articleCount}`);
        }
        if (list.url) {
          console.log(`   URL: ${list.url}`);
        }
        console.log('');
      });

      console.log('✅ All lists retrieved successfully!\n');
      console.log('💡 You can use these list IDs with get-list-articles:');
      lists.forEach(list => {
        console.log(`   getListArticles("${list.id}") → Get articles from "${list.name}"`);
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

testGetLists().catch(console.error);
