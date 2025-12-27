import { BrowserMediumClient } from '../src/browser-client';

async function testPublishArticle() {
  console.log('🧪 Testing publishArticle() method...\n');

  const client = new BrowserMediumClient();

  try {
    // Initialize browser (non-headless for observation)
    console.log('🌐 Initializing browser (non-headless for observation)...');
    await client.initialize(false);

    // Test data
    const testArticle = {
      title: `Test Article ${new Date().toISOString()}`,
      content: `This is a test article created by the automation system.

This article is being used to test the publishArticle() method.

It should work correctly if Medium's UI hasn't changed.

## Test Details
- Created: ${new Date().toLocaleString()}
- Purpose: Testing publish flow
- Status: Draft (for safety)`,
      tags: ['testing', 'automation'],
      isDraft: true // Save as draft for safety
    };

    console.log('\n📝 Test article:');
    console.log('  Title:', testArticle.title);
    console.log('  Content length:', testArticle.content.length, 'chars');
    console.log('  Tags:', testArticle.tags.join(', '));
    console.log('  Save as draft:', testArticle.isDraft);

    console.log('\n🚀 Publishing article...');
    const result = await client.publishArticle(testArticle);

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Article published.');
      if (result.url) {
        console.log('   URL:', result.url);
      }
    } else {
      console.log('\n❌ FAILED! Error:', result.error);
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

testPublishArticle().catch(console.error);
