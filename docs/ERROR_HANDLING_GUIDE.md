# エラー解消ガイド

## 概要
<<<<<<< HEAD
=======

>>>>>>> origin/main
このドキュメントでは、プロジェクトで発生するエラーの解消方法とベストプラクティスを説明します。

## 型安全性の確保

### 1. `any`型の使用禁止
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ❌ 悪い例
const data: any = getData();
data.someMethod(); // 型チェックなし

// ✅ 良い例
const data: unknown = getData();
if (typeof data === 'object' && data !== null && 'someMethod' in data) {
  (data as { someMethod: Function }).someMethod();
}
```

### 2. `unknown`型の活用
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ 型安全な方法
function processData(input: unknown): string {
  if (typeof input === 'string') {
    return input.toUpperCase();
  }
  if (typeof input === 'number') {
    return input.toString();
  }
  throw new Error('Unsupported input type');
}
```

## Jestテストでのエラー解消

### 1. モックの適切な設定
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ 完全なモック設定
const mockService = {
  method1: jest.fn().mockResolvedValue('result'),
  method2: jest.fn().mockRejectedValue(new Error('Test error')),
  // 必要なメソッドを全て定義
};
```

### 2. 非同期テストの適切な処理
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ 非同期テストの正しい書き方
it('should handle async operations', async () => {
  await service.startSession();
  await service.flushEvents();
<<<<<<< HEAD
  
=======

>>>>>>> origin/main
  expect(mockService.addEvent).toHaveBeenCalled();
});
```

### 3. エラーハンドリングのテスト
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ エラーハンドリングのテスト
it('should throw error for invalid input', async () => {
  await expect(service.invalidOperation()).rejects.toThrow('Expected error message');
});
```

## Chrome Extensionでのエラー解消

### 1. 権限の適切な設定
<<<<<<< HEAD
=======

>>>>>>> origin/main
```json
// manifest.json
{
  "permissions": ["activeTab", "storage", "debugger"],
  "host_permissions": ["<all_urls>"]
}
```

### 2. 非同期処理の適切な管理
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ 適切な非同期処理
class ServiceManager {
  private async initialize(): Promise<void> {
    try {
      await this.setupStorage();
      await this.registerListeners();
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }
}
```

### 3. エラーログの実装
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ 構造化されたエラーログ
class Logger {
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error?.message,
      stack: error?.stack,
<<<<<<< HEAD
      context
=======
      context,
>>>>>>> origin/main
    });
  }
}
```

## デバッグ戦略

### 1. 段階的デバッグ
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ 段階的なデバッグ
function complexOperation(data: unknown): string {
  console.log('Step 1: Input validation');
  if (!data) throw new Error('Data is required');
<<<<<<< HEAD
  
  console.log('Step 2: Type checking');
  if (typeof data !== 'string') throw new Error('Data must be string');
  
=======

  console.log('Step 2: Type checking');
  if (typeof data !== 'string') throw new Error('Data must be string');

>>>>>>> origin/main
  console.log('Step 3: Processing');
  return data.toUpperCase();
}
```

### 2. テスト駆動デバッグ
<<<<<<< HEAD
=======

>>>>>>> origin/main
```typescript
// ✅ テストでデバッグ
describe('Debugging complex function', () => {
  it('should handle each step correctly', () => {
    // 各ステップを個別にテスト
    expect(() => complexOperation(null)).toThrow('Data is required');
    expect(() => complexOperation(123)).toThrow('Data must be string');
    expect(complexOperation('hello')).toBe('HELLO');
  });
});
```

## エラー解消のチェックリスト

### 型エラーの場合
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] `any`型を`unknown`型に変更
- [ ] 適切な型ガードを実装
- [ ] 型アサーションを最小限に抑制

### テストエラーの場合
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] モックが完全に設定されているか確認
- [ ] 非同期処理が適切に待機されているか確認
- [ ] エラーメッセージが正確か確認

### ランタイムエラーの場合
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] エラーログを確認
- [ ] 権限設定を確認
- [ ] 非同期処理の順序を確認

## 予防策

### 1. 型安全性の確保
<<<<<<< HEAD
=======

>>>>>>> origin/main
- TypeScript strict mode の使用
- ESLint ルールの厳格な設定
- 定期的な型チェック

### 2. テストの充実
<<<<<<< HEAD
=======

>>>>>>> origin/main
- 単体テストの網羅的な実装
- 統合テストの実装
- エラーケースのテスト

### 3. コードレビュー
<<<<<<< HEAD
=======

>>>>>>> origin/main
- 型安全性の確認
- エラーハンドリングの確認
- テストカバレッジの確認

## 参考資料
<<<<<<< HEAD
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)




=======

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
>>>>>>> origin/main
