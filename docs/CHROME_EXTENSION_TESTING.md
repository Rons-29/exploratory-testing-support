# Chrome拡張機能テスト手順

## 概要
<<<<<<< HEAD
このドキュメントでは、開発したChrome拡張機能を実際のブラウザでテストする手順を説明します。

## 前提条件
=======

このドキュメントでは、開発したChrome拡張機能を実際のブラウザでテストする手順を説明します。

## 前提条件

>>>>>>> origin/main
- Chrome ブラウザ（最新版推奨）
- 拡張機能がビルド済み（`npm run build:extension` 実行済み）

## 手順

### 1. 拡張機能のビルド
<<<<<<< HEAD
=======

>>>>>>> origin/main
```bash
npm run build:extension
```

### 2. Chrome拡張機能の読み込み

1. **Chrome拡張機能管理画面を開く**
   - Chrome ブラウザで `chrome://extensions/` にアクセス
   - または メニュー → その他のツール → 拡張機能

2. **デベロッパーモードを有効化**
   - 右上の「デベロッパーモード」トグルをON

3. **拡張機能を読み込み**
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` フォルダを選択

### 3. 動作確認項目

#### 3.1 基本動作確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] 拡張機能が正常に読み込まれている
- [ ] エラーが発生していない
- [ ] アイコンが表示されている

#### 3.2 ポップアップの動作確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] 拡張機能アイコンをクリックしてポップアップが表示される
- [ ] ポップアップのUIが正常に表示される
- [ ] ボタンがクリック可能

#### 3.3 コンテンツスクリプトの動作確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] 任意のWebページでフローティングボタンが表示される
- [ ] フローティングボタンがクリック可能
- [ ] イベント追跡が動作する

#### 3.4 バックグラウンドスクリプトの動作確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] コンソールでエラーが発生していない
- [ ] メッセージの送受信が正常に動作する

### 4. デバッグ方法

#### 4.1 拡張機能のデバッグ
<<<<<<< HEAD
=======

>>>>>>> origin/main
1. `chrome://extensions/` で拡張機能の「詳細」をクリック
2. 「バックグラウンドページを検査」をクリック
3. デベロッパーツールでログを確認

#### 4.2 コンテンツスクリプトのデバッグ
<<<<<<< HEAD
=======

>>>>>>> origin/main
1. 任意のWebページでF12を押してデベロッパーツールを開く
2. Console タブでログを確認
3. Sources タブでブレークポイントを設定可能

#### 4.3 ポップアップのデバッグ
<<<<<<< HEAD
=======

>>>>>>> origin/main
1. ポップアップを開いた状態で右クリック
2. 「検証」を選択
3. デベロッパーツールでデバッグ可能

### 5. よくある問題と解決方法

#### 5.1 拡張機能が読み込まれない
<<<<<<< HEAD
=======

>>>>>>> origin/main
- **原因**: manifest.jsonの構文エラー
- **解決**: `npm run build:extension` を再実行

#### 5.2 コンテンツスクリプトが動作しない
<<<<<<< HEAD
=======

>>>>>>> origin/main
- **原因**: 権限設定の問題
- **解決**: manifest.jsonのpermissionsを確認

#### 5.3 ポップアップが表示されない
<<<<<<< HEAD
=======

>>>>>>> origin/main
- **原因**: popup.htmlのパスが間違っている
- **解決**: manifest.jsonのdefault_popupを確認

### 6. テスト用のサンプルページ

以下のHTMLファイルを作成してテストに使用できます：

```html
<!DOCTYPE html>
<html>
<<<<<<< HEAD
<head>
    <title>拡張機能テスト用ページ</title>
</head>
<body>
    <h1>拡張機能テスト用ページ</h1>
    <button id="test-button">テストボタン</button>
    <input id="test-input" type="text" placeholder="テスト入力">
    <div id="test-div">テスト用のdiv要素</div>
    
    <script>
        // テスト用のイベント
        document.getElementById('test-button').addEventListener('click', () => {
            console.log('ボタンがクリックされました');
        });
        
        document.getElementById('test-input').addEventListener('input', (e) => {
            console.log('入力値:', e.target.value);
        });
    </script>
</body>
=======
  <head>
    <title>拡張機能テスト用ページ</title>
  </head>
  <body>
    <h1>拡張機能テスト用ページ</h1>
    <button id="test-button">テストボタン</button>
    <input id="test-input" type="text" placeholder="テスト入力" />
    <div id="test-div">テスト用のdiv要素</div>

    <script>
      // テスト用のイベント
      document.getElementById('test-button').addEventListener('click', () => {
        console.log('ボタンがクリックされました');
      });

      document.getElementById('test-input').addEventListener('input', e => {
        console.log('入力値:', e.target.value);
      });
    </script>
  </body>
>>>>>>> origin/main
</html>
```

### 7. パフォーマンステスト

#### 7.1 メモリ使用量の確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
1. `chrome://extensions/` で拡張機能の詳細を開く
2. 「バックグラウンドページを検査」をクリック
3. Memory タブでメモリ使用量を確認

#### 7.2 CPU使用量の確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
1. `chrome://extensions/` で拡張機能の詳細を開く
2. 「バックグラウンドページを検査」をクリック
3. Performance タブでCPU使用量を確認

### 8. セキュリティテスト

#### 8.1 権限の確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] 必要最小限の権限のみが設定されている
- [ ] 機密情報が適切に保護されている

#### 8.2 データの確認
<<<<<<< HEAD
=======

>>>>>>> origin/main
- [ ] ローカルストレージの使用が適切
- [ ] 外部通信が安全に行われている

## 注意事項

- 本番環境では適切な証明書を使用してください
- 機密情報は拡張機能に含めないでください
- ユーザーのプライバシーを尊重してください
<<<<<<< HEAD

=======
>>>>>>> origin/main
