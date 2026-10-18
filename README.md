# Sound.Lab. サウンドカード（碧風祭2027「llllink」）

QRコードから開く、曲とMVのページ。静的なHTML/CSS/JSだけで、ビルドは不要です。
デザインは Figma「Sound.Lab. llllink SoundCard」の **v2** に合わせています。

## 構成

```
index.html          ページ本体
css/style.css       見た目
js/config.js        サイト全体の設定（サークル名、SNSのURL、曲の枠の数）
js/app.js           プレイヤー・ロック画面操作・ローディング
tracks/01 〜 07/    曲のフォルダ（1曲目〜7曲目）。曲・MV・歌詞・担当者を入れる
assets/img/         ロゴ（logo.png）、メインビジュアル、ロック画面用アートワーク、アイコン、OGP
```

## 曲を追加・差し替える

曲は `tracks/01` 〜 `tracks/07` のフォルダに入れるだけです。フォルダ番号が曲の順番で、`?track=02` のURLにもなります。
各フォルダには、次のファイルを入れます（ファイル名は半角でこの通りに）。

| ファイル | 中身 | 必要か |
|---|---|---|
| `info.txt` | 曲名。`曲名:` を空にすると、その曲は表示されない | 必須 |
| `audio.mp3` | 曲 | 必須（ないと表示されない） |
| `video.mp4` | MV | なくてOK（MVタブが押せなくなる） |
| `lyrics.txt` | 歌詞 | なくてOK（歌詞の欄が消える） |
| `credits.txt` | 作曲・イラスト・MV などの担当者 | なくてOK |

`info.txt` と `credits.txt` の書き方（例）:

```
# info.txt
曲名: 曲タイトル 01
```

```
# credits.txt
作曲: 担当者 A
イラスト: 担当者 B | https://x.com/example
MV: 担当者 C
```

- `credits.txt` は「役割: 名前」の形で、役割の名前は自由です。名前が空の行は表示されません。
- 先頭の1行が、曲名の下とロック画面に出ます。
- 名前の後ろに `| URL` を付けると、その人のリンクになります。
- `info.txt` に `長さ: 3:24` を書くと、再生前から長さを表示できます。`ダウンロード: なし` を書くと、その曲のダウンロードボタンを隠せます。

入れたら GitHub に push します。数分でサイトに反映されます。

- 4曲目以降の枠も作ってあります。8曲以上にしたいときは、`tracks/08` などのフォルダを足し、`js/config.js` の `slots` の数を増やす。
- 現在の 01〜03 はダミー（電子音・ダミーのMV・仮の担当者名）。実際のファイルで上書きする。
- SNS は `js/config.js` の `links` の `url` を埋める。空のままなら「準備中」と表示される。

### 音源・MVの推奨

- 音源: mp3、128〜192kbps（1曲 3〜6MB 程度）
- MV: mp4（H.264 + AAC）、720p、`faststart` 付き、1本 10〜30MB 程度

```bash
ffmpeg -i 元動画.mov -vf scale=1280:720 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k -movflags +faststart tracks/01/video.mp4
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
- **ローディング**: 読み込みが速ければ約2秒（最短1秒 + 帯が抜ける約1秒）、遅くても最長6秒で開く。動きを減らす設定の端末では、帯の演出をやめてフェードにする。
- **画面下の固定バー**: 本体の再生ボタンが画面の外にあるあいだだけ、画面の下に再生・一時停止と曲名のバーが出る。曲名を押すとプレイヤーの位置まで移動する。
- **歌詞のコピー抑止**: 選択・コピー・長押しメニュー・印刷を止めているだけ。スクリーンショットやソース表示までは防げない。
- **ダウンロード**: 公開した時点で誰でも mp3 を保存できる。再配布の可否など、使ってほしい範囲はクレジットやカードに書いておくと安心。
- 既存曲のカバーや市販音源を使う場合は、ネットに公開する前に権利を確認すること。
- 書体は Google Fonts（Zen Kaku Gothic New）を読み込む。
