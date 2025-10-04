import { test, expect } from '@playwright/test';

test.describe('Chrome Extension E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用ページに移動
    await page.goto('file://' + process.cwd() + '/test-pages/sample.html');
  });

  test('should load extension and display floating button', async ({ page }) => {
    // フローティングボタンが表示されることを確認
    const floatingButton = page.locator('[data-testid="floating-button"]');
    await expect(floatingButton).toBeVisible();
  });

  test('should track click events', async ({ page }) => {
    // クリックイベントを実行
    await page.click('#primary-btn');
    
    // ログエリアにクリックイベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('プライマリボタンがクリックされました');
  });

  test('should track keyboard events', async ({ page }) => {
    // テキスト入力フィールドにフォーカス
    await page.click('#text-input');
    
    // キーボード入力を実行
    await page.keyboard.type('test input');
    
    // ログエリアに入力イベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('テキスト入力: test input');
  });

  test('should track focus events', async ({ page }) => {
    // フォーカスイベントを実行
    await page.click('#email-input');
    
    // ログエリアにフォーカスイベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('email-input にフォーカスしました');
  });

  test('should track mouse events', async ({ page }) => {
    // マウスエリアにホバー
    const mouseArea = page.locator('#mouse-area');
    await mouseArea.hover();
    
    // ログエリアにマウスイベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('マウスエリアに入りました');
  });

  test('should track console log events', async ({ page }) => {
    // コンソールログボタンをクリック
    await page.click('#log-info');
    
    // ログエリアにコンソールログが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('Infoログを出力しました');
  });

  test('should track network events', async ({ page }) => {
    // ネットワークリクエストボタンをクリック
    await page.click('#network-success');
    
    // ログエリアにネットワークイベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('ネットワークリクエスト成功');
  });

  test('should handle extension popup', async ({ page, context }) => {
    // 拡張機能のポップアップを開く
    const extensionPage = await context.newPage();
    await extensionPage.goto('chrome-extension://[extension-id]/popup.html');
    
    // ポップアップの要素が表示されることを確認
    const popupTitle = extensionPage.locator('h1');
    await expect(popupTitle).toBeVisible();
  });

  test('should maintain session state', async ({ page }) => {
    // セッション開始のシミュレーション
    await page.click('#primary-btn');
    await page.click('#secondary-btn');
    
    // ログエリアに複数のイベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('プライマリボタンがクリックされました');
    await expect(logArea).toContainText('セカンダリボタンがクリックされました');
  });

  test('should handle page unload', async ({ page }) => {
    // ページアンロードイベントをシミュレート
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    
    // ログエリアにアンロードイベントが記録されることを確認
    const logArea = page.locator('#log-area');
    await expect(logArea).toContainText('ページがアンロードされます');
  });
});
