# ブランチ保護設定

## mainブランチの保護設定

以下の設定をGitHubのWeb UIで行ってください：

### 設定手順

1. リポジトリの **Settings** タブに移動
2. 左サイドバーの **Branches** をクリック
3. **Add rule** または **Add branch protection rule** をクリック
4. **Branch name pattern** に `main` を入力

### 推奨設定

#### ✅ 必須設定
- [ ] **Require a pull request before merging**
  - [ ] **Require approvals**: 1人以上
  - [ ] **Dismiss stale PR approvals when new commits are pushed**
  - [ ] **Require review from code owners**

- [ ] **Require status checks to pass before merging**
  - [ ] **Require branches to be up to date before merging**
  - [ ] 必須ステータスチェック: `security` ジョブを追加

- [ ] **Require linear history**
- [ ] **Include administrators**

#### 🔒 セキュリティ設定
- [ ] **Restrict pushes that create files**
- [ ] **Require conversation resolution before merging**

#### 🚫 制限設定
- [ ] **Restrict pushes that create files**
- [ ] **Do not allow bypassing the above settings**

### 設定後の確認

設定完了後、以下のコマンドでmainブランチへの直接プッシュがブロックされることを確認：

```bash
# これは失敗するはず
git push origin main
```

### 正しいワークフロー

1. フィーチャーブランチを作成
2. 変更をコミット・プッシュ
3. プルリクエストを作成
4. レビューを受ける
5. 必須チェック（security）が通ることを確認
6. マージ

## 注意事項

- 管理者でも直接mainブランチにプッシュできなくなります
- 緊急時は、GitHubのWeb UIから一時的に保護を無効化できます
- 保護設定は即座に有効になります
