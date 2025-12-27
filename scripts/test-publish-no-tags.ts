import { BrowserMediumClient } from '../src/browser-client';

async function testPublishNoTags() {
  console.log('🧪 Testing publishArticle() without tags...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser (non-headless for observation)...\n');
    await client.initialize(false);

    const testArticle = {
      title: `Test Article ${new Date().toISOString()}`,
      content: `This is a test article to verify the publishArticle() method works with the updated selectors.

This article has multiple paragraphs to test content insertion.

The new selectors are:
- Title: [data-testid="editorTitleParagraph"]
- Content: [data-testid="editorParagraphText"]`,
      isDraft: true
      // NO TAGS - to test basic flow
    };

    console.log('📝 Test article:');
    console.log(`  Title: ${testArticle.title}`);
    console.log(`  Content length: ${testArticle.content.length} chars`);
    console.log(`  Save as draft: ${testArticle.isDraft}`);
    console.log();

    console.log('🚀 Publishing article...\n');
    const result = await client.publishArticle(testArticle);

    console.log('📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log();

    if (result.success) {
      console.log('✅ SUCCESS! Article saved as draft');
      if (result.url) console.log(`   URL: ${result.url}`);
    } else {
      console.log(`❌ FAILED! Error: ${result.error}`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    console.log('\n🔒 Closing browser...');
    await client.close();
    console.log('✅ Done!');
  }
}

testPublishNoTags().catch(console.error);
