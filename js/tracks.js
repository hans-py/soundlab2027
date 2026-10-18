/*
 * サイト情報と曲データ。曲を足す・直すときは、基本このファイルだけ触ればよい。
 * 下の曲は動作確認用のダミー（assets/audio/demo-*.mp3 は単なる電子音）。
 */
window.SITE = {
  circle: "Sound.Lab.",
  event: "碧風祭2027「llllink」",
  copyright: "© 2027 Sound.Lab.",
  notice: "無断転載・無断使用禁止",
  // url が空のものは「準備中」で表示される
  links: [
    { label: "X", url: "" },
    { label: "Instagram", url: "" },
    { label: "YouTube", url: "" },
    { label: "Webサイト", url: "" },
  ],
};

/*
 * id        : URL の ?track=○ に使う。変えるとQRコードのURLも変わるので注意
 * title     : 曲名
 * audio     : mp3 のパス（必須）
 * video     : MV の mp4 のパス（なければ省略。MVタブが押せなくなる）
 * duration  : "3:24" のような表示用の長さ（省略可。再生すると自動で入る）
 * download  : false にするとダウンロードボタンを隠す
 * downloadName : 保存されるファイル名（省略時は自動）
 * artwork   : ロック画面に出す画像（省略時は assets/img/artwork-*.png）
 * credits   : 担当者。先頭の1人が曲名の下とロック画面に出る。url があればリンクになる
 * lyrics    : 歌詞（省略すると歌詞欄ごと隠れる）
 */
window.TRACKS = [
  {
    id: "01",
    title: "曲タイトル 01",
    audio: "assets/audio/demo-01.mp3",
    video: "assets/video/demo-01.mp4",
    duration: "0:24",
    credits: [
      { role: "作詞・作曲", name: "担当者 A" },
      { role: "歌", name: "担当者 B" },
      { role: "イラスト", name: "担当者 C" },
      { role: "MV", name: "担当者 D" },
    ],
    lyrics: `（ここに歌詞が入ります）
一行目の歌詞
二行目の歌詞
三行目の歌詞

（サビの歌詞がここに入ります）
一行目の歌詞
二行目の歌詞
三行目の歌詞`,
  },
  {
    id: "02",
    title: "曲タイトル 02",
    audio: "assets/audio/demo-02.mp3",
    video: "assets/video/demo-02.mp4",
    duration: "0:31",
    credits: [
      { role: "作詞・作曲", name: "担当者 B" },
      { role: "イラスト", name: "担当者 C" },
      { role: "MV", name: "担当者 D" },
    ],
    lyrics: `（ここに歌詞が入ります）
一行目の歌詞
二行目の歌詞`,
  },
  {
    id: "03",
    title: "曲タイトル 03",
    audio: "assets/audio/demo-03.mp3",
    duration: "0:18",
    credits: [
      { role: "作詞・作曲", name: "担当者 C" },
      { role: "イラスト", name: "担当者 C" },
    ],
  },
];
