# Sound.Lab. サウンドカード（碧風祭2027「llllink」）

QRコードから開く、曲とMVのページ。静的なHTML/CSS/JSだけで、ビルドは不要です。
デザインは Figma「Sound.Lab. llllink SoundCard」の **v2** に合わせています。

## 構成

```
index.html          ページ本体
css/style.css       見た目
js/tracks.js        サイト情報と曲データ（曲の追加・修正はここ）
js/app.js           プレイヤー・ロック画面操作・ローディング
assets/audio/       mp3（現在は動作確認用のダミー電子音）
assets/video/       MVのmp4（現在はダミー）
assets/img/         メインビジュアル、ロック画面用アートワーク、アイコン、OGP
```

## 曲を追加・差し替える

1. mp3 を `assets/audio/`、MV を `assets/video/` に入れる。
2. `js/tracks.js` の `TRACKS` に1曲ぶん追記する（既存の曲をコピーして直すのが早い）。
   - `title` / `audio` / `video`（MVがなければ省略）/ `credits`（担当者）/ `lyrics`（歌詞）
   - `credits` の先頭の人が、曲名の下とロック画面に出る。
3. ダミー（`demo-*.mp3` / `demo-*.mp4`）と、`TRACKS` 内のダミー曲を消す。
4. SNS は `SITE.links` の `url` を埋める。空のままなら「準備中」と表示される。

`id` は URL に使われる（`?track=02`）。QRコードに入れたあとで変えるとリンク切れになるので注意。

### 音源・MVの推奨

- 音源: mp3、128〜192kbps（1曲 3〜6MB 程度）
- MV: mp4（H.264 + AAC）、720p、`faststart` 付き、1本 10〜30MB 程度

```bash
ffmpeg -i 元動画.mov -vf scale=1280:720 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k -movflags +faststart assets/video/曲名.mp4
```

GitHub Pages はファイル1つ100MBまで、サイト全体で1GB程度が目安。来場者のスマホの通信量にも響くので、MVは軽めに。

## GitHub Pages で公開する

1. GitHub で新しいリポジトリを作る（Public）。
2. このフォルダの中身をリポジトリに入れて push する。

   ```bash
   git init
   git add .
   git commit -m "サウンドカード公開"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

3. リポジトリの Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `/ (root)` にして保存。
4. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で開ける。
5. `index.html` の `og:url` と `og:image` は絶対URLが必要（SNSで共有したときのサムネイル用）。現在は `https://hans-py.github.io/soundlab2027/` で設定済み。リポジトリ名やアカウントを変えたら、この2か所も直す。

### QRコード

- 全体: 公開URLそのもの
- 曲ごと: `公開URL/?track=01`、`?track=02` …（カード1枚＝1曲にできる）

## ローカルで確認する

`index.html` をダブルクリックしても動きますが、**音声・動画のシークは Range リクエストに対応したサーバーが必要**です。
VS Code の Live Server か、次のコマンドが使えます。

```bash
npx serve .
```

Python 標準の `python3 -m http.server` は Range に未対応なので、動画のシークが効きません（GitHub Pages では問題ありません）。

## 仕様メモ

- **ロック画面操作**: 再生/一時停止、前後の曲、シークバーに対応（Media Session API）。曲名・担当者・アートワークが表示される。10秒送り戻しは、iOS で「前後の曲」ボタンが消えるので登録していない。iOS は Safari、Android は Chrome で実機確認が必要。
- **曲 / MV の切り替え**: 再生位置を引き継ぐ。MV がない曲では MV タブが押せない。
- **ローディング**: 最短1.4秒、最長6秒。動きを減らす設定の端末では、帯の演出をやめてフェードにする。
- **歌詞のコピー抑止**: 選択・コピー・長押しメニュー・印刷を止めているだけ。スクリーンショットやソース表示までは防げない。
- **ダウンロード**: 公開した時点で誰でも mp3 を保存できる。再配布の可否など、使ってほしい範囲はクレジットやカードに書いておくと安心。
- 既存曲のカバーや市販音源を使う場合は、ネットに公開する前に権利を確認すること。
- 書体は Google Fonts（Zen Kaku Gothic New）を読み込む。
