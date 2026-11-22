のみ記録 v6.1（Magic Link対応・クラウド同期版）

重要：初期設定前に既存のGitHub Pagesを上書きしないでください。
cloud-config.jsが未設定だとアプリは入力を停止します。

【Supabaseでの初回設定】
1. https://supabase.com で本人のアカウントを作成し、Freeプロジェクトを作成。
2. SQL Editorで同梱のschema.sqlを実行。
3. Authentication > Providers > Emailを有効化。
4. Authentication > Sign In / Providers > EmailでMagic links and email OTPを有効にします。
   Email Templatesは変更不要。標準のMagic Linkメールを使用します。
   Supabaseの標準メール送信は、プロジェクトチームの登録アドレス宛などに制限されます。
5. Authentication > URL ConfigurationでSite URLとRedirect URLsを
   https://shirokuma4614-ui.github.io/nomi-kiroku/ に設定。
6. Project Settings > APIなどからProject URLと公開用publishable keyを確認。
   同梱のcloud-config.jsの空欄に2つの値を設定。
   絶対にservice_role / secret keyを書かないでください。
7. index.html、cloud.js、cloud.css、cloud-config.js、sw.js、
   manifest.webmanifest、icon.png、icon-512.pngをGitHubのルートへアップロード。
   schema.sqlはGitHubに公開する必要はありません。

【利用と移行】
- 初回ログイン時、端末に残っている既存の飲酒記録をクラウドへ移行します。
- 記録を追加・削除すると即時同期を試みます。通信不可なら未同期の変更を保持。
- 「☁ 保存済み・同期完了」を確認してからアプリを閉じてください。
- 同じメールでログインすれば、新しいiPhoneでクラウド記録を取得できます。
- メール内「Sign in」リンクで開いた画面で同期状態を確認してください。
- iPhoneのホーム画面アプリとSafariは保存領域が異なる場合があります。
  Safariでログインできてもホーム画面アプリがログイン済みとは限りません。
- CSVの書き出し・読み込みは引き続き利用できます。
- すでに消失した記録は自動復元できません。

【注意】
- 無料のクラウドサービスには休止や制限があるため、CSVバックアップも必要です。
- 未同期表示中はアプリやSafariのデータを削除しないでください。
