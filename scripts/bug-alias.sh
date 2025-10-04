#!/bin/bash

# 不具合報告用エイリアスコマンド
# 使用方法: source scripts/bug-alias.sh

# 不具合報告のエイリアス
alias bug="npm run bug-report"
alias 不具合="npm run bug-report"
alias bug-report="npm run bug-report"

# 不具合報告のヘルプ
alias bug-help="echo '🐛 不具合報告コマンド:
- bug: 不具合報告を開始
- 不具合: 不具合報告を開始  
- bug-report: 不具合報告を開始
- bug-help: このヘルプを表示

使用方法: bug または 不具合'"

echo "🐛 不具合報告エイリアスが設定されました！
使用可能なコマンド:
- bug: 不具合報告を開始
- 不具合: 不具合報告を開始
- bug-report: 不具合報告を開始
- bug-help: ヘルプを表示"
