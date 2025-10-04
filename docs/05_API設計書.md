# AIテストパートナー API設計書

**作成日**: 2025年10月2日  
**バージョン**: v1.0

## 1. API概要

### 1.1 基本情報

- **ベースURL**: `https://api.test-partner.com/v1`
- **認証方式**: Bearer Token (JWT)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 共通仕様

- **HTTPメソッド**: RESTful準拠
- **ステータスコード**: HTTP標準準拠
- **エラーレスポンス**: 統一フォーマット
- **レート制限**: 1000リクエスト/時間/ユーザー

## 2. 認証API

### 2.1 Google OAuth認証

#### 2.1.1 認証開始

```http
GET /auth/google
```

**説明**: Google OAuth認証を開始する

**レスポンス**:

```http
HTTP/1.1 302 Found
Location: https://accounts.google.com/oauth/authorize?client_id=...
```

#### 2.1.2 認証コールバック

```http
GET /auth/google/callback?code={code}&state={state}
```

**説明**: Google OAuth認証のコールバック処理

**パラメータ**:

- `code` (string, required): 認証コード
- `state` (string, required): ステートパラメータ

**レスポンス**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "ユーザー名",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  }
}
```

### 2.2 トークン管理

#### 2.2.1 トークン更新

```http
POST /auth/refresh
```

**説明**: リフレッシュトークンを使用してアクセストークンを更新

**リクエストボディ**:

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

#### 2.2.2 ログアウト

```http
POST /auth/logout
```

**説明**: ユーザーをログアウトし、トークンを無効化

**ヘッダー**:

```
Authorization: Bearer {access_token}
```

**レスポンス**:

```json
{
  "message": "ログアウトしました"
}
```

## 3. セッション管理API

### 3.1 セッション作成

#### 3.1.1 新しいセッションを作成

```http
POST /sessions
```

**説明**: 新しいテストセッションを作成する

**ヘッダー**:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**リクエストボディ**:

```json
{
  "target_url": "https://example.com",
  "session_name": "ログイン機能テスト",
  "description": "ログイン機能の探索的テストを実施"
}
```

**レスポンス**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "target_url": "https://example.com",
  "session_name": "ログイン機能テスト",
  "status": "active",
  "start_time": "2025-10-02T14:30:00Z",
  "end_time": null,
  "created_at": "2025-10-02T14:30:00Z",
  "updated_at": "2025-10-02T14:30:00Z"
}
```

### 3.2 セッション更新

#### 3.2.1 セッション状態を更新

```http
PATCH /sessions/{session_id}
```

**説明**: セッションの状態を更新する（一時停止、再開、終了）

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**リクエストボディ**:

```json
{
  "status": "completed",
  "end_time": "2025-10-02T15:30:00Z"
}
```

**レスポンス**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "end_time": "2025-10-02T15:30:00Z",
  "updated_at": "2025-10-02T15:30:00Z"
}
```

### 3.3 セッション取得

#### 3.3.1 セッション詳細を取得

```http
GET /sessions/{session_id}
```

**説明**: 特定のセッションの詳細情報を取得する

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
```

**レスポンス**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "target_url": "https://example.com",
  "session_name": "ログイン機能テスト",
  "status": "completed",
  "start_time": "2025-10-02T14:30:00Z",
  "end_time": "2025-10-02T15:30:00Z",
  "duration_seconds": 3600,
  "event_count": 127,
  "flag_count": 3,
  "error_count": 2,
  "created_at": "2025-10-02T14:30:00Z",
  "updated_at": "2025-10-02T15:30:00Z"
}
```

#### 3.3.2 セッション一覧を取得

```http
GET /sessions
```

**説明**: ユーザーのセッション一覧を取得する

**ヘッダー**:

```
Authorization: Bearer {access_token}
```

**クエリパラメータ**:

- `page` (integer, optional): ページ番号（デフォルト: 1）
- `limit` (integer, optional): 1ページあたりの件数（デフォルト: 20、最大: 100）
- `status` (string, optional): ステータスでフィルタ（active, paused, completed）
- `sort` (string, optional): ソート順（created_at, updated_at, start_time）

**レスポンス**:

```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "target_url": "https://example.com",
      "session_name": "ログイン機能テスト",
      "status": "completed",
      "start_time": "2025-10-02T14:30:00Z",
      "end_time": "2025-10-02T15:30:00Z",
      "duration_seconds": 3600,
      "event_count": 127,
      "flag_count": 3,
      "error_count": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

## 4. イベント管理API

### 4.1 イベント送信

#### 4.1.1 イベントをバッチ送信

```http
POST /sessions/{session_id}/events
```

**説明**: 複数のイベントを一度に送信する（バッチ処理）

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**リクエストボディ**:

```json
{
  "events": [
    {
      "timestamp": "2025-10-02T14:30:15Z",
      "type": "click",
      "payload": {
        "element": "button#login",
        "x": 100,
        "y": 200,
        "tag_name": "BUTTON",
        "text_content": "ログイン"
      }
    },
    {
      "timestamp": "2025-10-02T14:30:16Z",
      "type": "input",
      "payload": {
        "element": "input#email",
        "value": "user@example.com",
        "input_type": "email"
      }
    },
    {
      "timestamp": "2025-10-02T14:30:17Z",
      "type": "console_error",
      "payload": {
        "message": "ReferenceError: undefined is not defined",
        "level": "error",
        "source": "app.js:123",
        "line": 123,
        "column": 5
      }
    },
    {
      "timestamp": "2025-10-02T14:30:18Z",
      "type": "network_error",
      "payload": {
        "url": "https://api.example.com/login",
        "method": "POST",
        "status_code": 500,
        "status_text": "Internal Server Error",
        "response_time": 1200
      }
    },
    {
      "timestamp": "2025-10-02T14:30:19Z",
      "type": "flag",
      "payload": {
        "message": "価格が0円と表示される",
        "priority": "high",
        "category": "ui_bug"
      }
    }
  ]
}
```

**レスポンス**:

```json
{
  "processed_count": 5,
  "failed_count": 0,
  "event_ids": [
    "550e8400-e29b-41d4-a716-446655440010",
    "550e8400-e29b-41d4-a716-446655440011",
    "550e8400-e29b-41d4-a716-446655440012",
    "550e8400-e29b-41d4-a716-446655440013",
    "550e8400-e29b-41d4-a716-446655440014"
  ]
}
```

### 4.2 イベント取得

#### 4.2.1 セッションのイベント一覧を取得

```http
GET /sessions/{session_id}/events
```

**説明**: セッションのイベント一覧を取得する（ページネーション対応）

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
```

**クエリパラメータ**:

- `page` (integer, optional): ページ番号（デフォルト: 1）
- `limit` (integer, optional): 1ページあたりの件数（デフォルト: 100、最大: 1000）
- `type` (string, optional): イベントタイプでフィルタ
- `start_time` (string, optional): 開始時刻（ISO 8601形式）
- `end_time` (string, optional): 終了時刻（ISO 8601形式）

**レスポンス**:

```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-10-02T14:30:15Z",
      "type": "click",
      "payload": {
        "element": "button#login",
        "x": 100,
        "y": 200,
        "tag_name": "BUTTON",
        "text_content": "ログイン"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 127,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  }
}
```

## 5. スクリーンショットAPI

### 5.1 スクリーンショットアップロード

#### 5.1.1 スクリーンショットをアップロード

```http
POST /sessions/{session_id}/screenshots
```

**説明**: スクリーンショットをアップロードする

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**リクエストボディ**:

```
file: [バイナリデータ]
event_id: "550e8400-e29b-41d4-a716-446655440010" (optional)
description: "ログイン画面のスクリーンショット" (optional)
```

**レスポンス**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "550e8400-e29b-41d4-a716-446655440010",
  "url": "https://storage.googleapis.com/test-partner-screenshots/screenshot_20251002_143015.jpg",
  "file_size": 245760,
  "mime_type": "image/jpeg",
  "width": 1920,
  "height": 1080,
  "created_at": "2025-10-02T14:30:15Z"
}
```

### 5.2 スクリーンショット取得

#### 5.2.1 セッションのスクリーンショット一覧を取得

```http
GET /sessions/{session_id}/screenshots
```

**説明**: セッションのスクリーンショット一覧を取得する

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
```

**レスポンス**:

```json
{
  "screenshots": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "event_id": "550e8400-e29b-41d4-a716-446655440010",
      "url": "https://storage.googleapis.com/test-partner-screenshots/screenshot_20251002_143015.jpg",
      "file_size": 245760,
      "width": 1920,
      "height": 1080,
      "created_at": "2025-10-02T14:30:15Z"
    }
  ]
}
```

## 6. レポートAPI

### 6.1 レポート生成

#### 6.1.1 セッションのレポートを生成

```http
POST /sessions/{session_id}/reports
```

**説明**: セッションのレポートを生成する

**パラメータ**:

- `session_id` (string, required): セッションID

**ヘッダー**:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**リクエストボディ**:

```json
{
  "format": "markdown",
  "include_screenshots": true,
  "include_console_logs": true,
  "include_network_logs": true,
  "filter_events": ["click", "input", "flag", "console_error", "network_error"]
}
```

**レスポンス**:

```json
{
  "report_id": "550e8400-e29b-41d4-a716-446655440030",
  "format": "markdown",
  "content": "# テストレポート\n\n## セッション情報\n- 対象URL: https://example.com\n- 開始時刻: 2025-10-02T14:30:00Z\n- 終了時刻: 2025-10-02T15:30:00Z\n- 実行時間: 1時間0分\n\n## 発見された問題\n\n### 1. 価格表示の問題\n- **時刻**: 2025-10-02T14:30:19Z\n- **説明**: 価格が0円と表示される\n- **スクリーンショット**: [リンク]\n\n## 詳細ログ\n...",
  "download_url": "https://storage.googleapis.com/test-partner-reports/report_20251002_143000.md",
  "created_at": "2025-10-02T15:30:00Z"
}
```

## 7. エラーレスポンス

### 7.1 エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "リクエストの形式が正しくありません",
    "details": [
      {
        "field": "target_url",
        "message": "有効なURLを入力してください"
      }
    ],
    "request_id": "req_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 7.2 エラーコード一覧

| コード                | HTTPステータス | 説明                               |
| --------------------- | -------------- | ---------------------------------- |
| `VALIDATION_ERROR`    | 400            | リクエストの形式が正しくありません |
| `UNAUTHORIZED`        | 401            | 認証が必要です                     |
| `FORBIDDEN`           | 403            | アクセス権限がありません           |
| `NOT_FOUND`           | 404            | リソースが見つかりません           |
| `RATE_LIMIT_EXCEEDED` | 429            | レート制限を超えました             |
| `INTERNAL_ERROR`      | 500            | 内部サーバーエラーが発生しました   |

## 8. レート制限

### 8.1 制限値

- **認証API**: 100リクエスト/時間
- **セッションAPI**: 1000リクエスト/時間
- **イベントAPI**: 10000リクエスト/時間
- **スクリーンショットAPI**: 100リクエスト/時間

### 8.2 レート制限ヘッダー

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

## 9. Webhook（将来実装）

### 9.1 Webhook設定

```http
POST /webhooks
```

**説明**: Webhookエンドポイントを設定する

**リクエストボディ**:

```json
{
  "url": "https://example.com/webhook",
  "events": ["session.completed", "flag.created"],
  "secret": "webhook_secret_key"
}
```

### 9.2 Webhookペイロード例

```json
{
  "event": "session.completed",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "target_url": "https://example.com",
    "duration_seconds": 3600,
    "event_count": 127,
    "flag_count": 3,
    "error_count": 2
  },
  "timestamp": "2025-10-02T15:30:00Z"
}
```
