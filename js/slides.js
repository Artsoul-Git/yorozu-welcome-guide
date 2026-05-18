(function () {

  function H(title) {
    return '<header class="slide-header"><h2 class="slide-h2">' + title + '</h2></header>';
  }

  /* ===================== SLIDES ===================== */

  /* --- COVER --- */
  function slide01() {
    return '<section class="slide slide-cover" data-section="cover" data-title="表紙" data-notes="本日はよろず支援拠点をご利用いただきありがとうございます。（少し間）相談に入る前に、このご案内を5〜10分ほどで読み上げさせていただきます。よくあるご質問と、ご利用規約についてお伝えします。">' +
      '<div class="slide-cover-bar">' +
        '<div class="slide-cover-tag">よろず支援拠点 岡山</div>' +
        '<h1 class="slide-cover-title">はじめてご利用の方へ</h1>' +
      '</div>' +
      '<div class="slide-cover-body">' +
        '<p class="slide-cover-sub">よくあるご質問 ＋ ご利用規約のご説明</p>' +
        '<div class="slide-cover-meta">CO読上げ用 ｜ 初回利用者向け案内</div>' +
      '</div>' +
    '</section>';
  }

  /* --- SECTION: Q&A --- */
  function slide02() {
    return '<section class="slide slide-section" data-section="qa" data-title="よくあるご質問（Q&amp;A）" data-notes="">' +
      '<div class="slide-content">' +
        '<div class="s-section-accent-bar"></div>' +
        '<div class="s-section-chapter">SECTION 01</div>' +
        '<h1 class="s-section-title">よくあるご質問</h1>' +
        '<p class="s-section-lead">Q&amp;A — 9項目</p>' +
      '</div>' +
    '</section>';
  }

  /* --- Q1 --- */
  function slide03() {
    return '<section class="slide" data-section="qa" data-title="Q1. よろずとは" data-notes="まず最初に、よろず支援拠点についてご説明させてください。（少し間）よろず支援拠点は、経済産業省の中小企業庁が全国に設置している、中小企業や小規模事業者の方向けの無料の経営相談所です。経営に関する幅広いお悩みに対して、専門のコーディネーターが対応させていただきます。">' +
      H('Q1. よろず支援拠点とは何ですか？') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">経済産業省・中小企業庁が全国に設置した<br>無料の経営相談所</li>' +
          '<li class="s-list-arrow">中小企業・小規模事業者の方が対象</li>' +
          '<li class="s-list-arrow">専門コーディネーターが幅広い経営の悩みに対応</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- Q2 --- */
  function slide04() {
    return '<section class="slide" data-section="qa" data-title="Q2. 料金・時間・回数" data-notes="相談料についてですが、こちらは何度ご利用いただいても無料となっております。（少し間）ただし、1回のご相談は原則1日1時間までとさせていただいております。もし1時間で終わらない場合は、次回に続けてご相談いただく形になります。回数の制限はありませんので、必要に応じて何度でもご利用いただけます。ただし、同時に複数の予約を取ることはできませんので、1回の相談が終わってから次回のご予約をお願いしております。">' +
      H('Q2. 料金・時間・回数制限について') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">何度利用しても無料</li>' +
          '<li class="s-list-arrow">1回のご相談は原則1時間まで</li>' +
          '<li class="s-list-arrow">回数制限なし — 必要な限り何度でも</li>' +
          '<li class="s-list-arrow">同時に複数予約は不可（1件終了後に次回予約）</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- Q3 --- */
  function slide05() {
    return '<section class="slide" data-section="qa" data-title="Q3. 相談方法" data-notes="ご相談の方法についてですが、基本的にはWEBでのご相談が中心となります。ご自宅や会社などから接続していただく形になります。また、対面の場合は各相談会場にお越しいただく形で、訪問での対応は行っておりません。">' +
      H('Q3. 相談方法（WEB / 対面）') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">WEBでのご相談が中心（ご自宅・会社から接続）</li>' +
          '<li class="s-list-arrow">対面の場合は各相談会場へお越しください</li>' +
          '<li class="s-list-arrow">訪問対応はありません</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- Q4 --- */
  function slide06() {
    return '<section class="slide" data-section="qa" data-title="Q4. 場所・駐車場" data-notes="場所について補足ですが、岡山オフィスには専用の駐車場がないため、近隣のコインパーキングをご利用いただく必要があります。一方で、津山のサテライト会場には駐車場がございます。">' +
      H('Q4. 場所・駐車場') +
      '<div class="slide-content">' +
        '<div class="s-2col">' +
          '<div class="s-2col-left">' +
            '<ul class="s-list">' +
              '<li class="s-list-head">岡山オフィス</li>' +
              '<li class="s-list-arrow">専用駐車場なし</li>' +
              '<li class="s-list-sub">近隣コインパーキングをご利用ください</li>' +
            '</ul>' +
          '</div>' +
          '<div class="s-2col-right">' +
            '<ul class="s-list">' +
              '<li class="s-list-head">津山サテライト</li>' +
              '<li class="s-list-arrow">駐車場あり</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* --- Q5 --- */
  function slide07() {
    return '<section class="slide" data-section="qa" data-title="Q5. CO担当日・場所" data-notes="また、コーディネーターの出勤日や場所はあらかじめ決まっておりますので、ご希望の日時と担当者の組み合わせでご予約いただく形になります。特定の日時に個別で出勤を依頼することはできません。">' +
      H('Q5. コーディネーターの担当日・場所') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">出勤スケジュールはあらかじめ固定</li>' +
          '<li class="s-list-arrow">希望の日時 × 担当者の組み合わせで予約</li>' +
          '<li class="s-list-arrow">特定日時への個別出勤依頼はできません</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- Q6 --- */
  function slide08() {
    return '<section class="slide" data-section="qa" data-title="Q6. 連絡方法" data-notes="連絡方法についてですが、コーディネーターへ直接ご連絡いただくことはできません。ご用件はすべて事務局を通してご連絡いただく形になります。（少し間）コーディネーターは非常勤のため、勤務日以外は対応ができない点もあらかじめご了承ください。同様に、メールで資料をお送りいただいた場合も、勤務日以外や土日祝日は確認ができませんので、その点もご理解ください。">' +
      H('Q6. 連絡方法（事務局経由のみ）') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">COへの直接連絡は不可 — ご用件は事務局へ</li>' +
          '<li class="s-list-arrow">COは非常勤 — 勤務日以外は対応不可</li>' +
          '<li class="s-list-arrow">メール資料も土日祝・勤務日外は確認不可</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- Q7 --- */
  function slide09() {
    return '<section class="slide" data-section="qa" data-title="Q7. 通信環境（Wi-Fi）" data-notes="通信環境についてですが、岡山オフィスには無料のWi-Fiがありますが、津山サテライトにはありません。パソコンをご利用の場合は、必要に応じてテザリングやモバイルルーターをご準備ください。">' +
      H('Q7. 通信環境（Wi-Fi）') +
      '<div class="slide-content">' +
        '<div class="s-2col">' +
          '<div class="s-2col-left">' +
            '<ul class="s-list">' +
              '<li class="s-list-head">岡山オフィス</li>' +
              '<li class="s-list-arrow">無料 Wi-Fi あり</li>' +
            '</ul>' +
          '</div>' +
          '<div class="s-2col-right">' +
            '<ul class="s-list">' +
              '<li class="s-list-head">津山サテライト</li>' +
              '<li class="s-list-arrow">Wi-Fi なし</li>' +
              '<li class="s-list-sub">テザリング / モバイルルーター要準備</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* --- Q8 --- */
  function slide10() {
    return '<section class="slide" data-section="qa" data-title="Q8. どんな相談でもOK" data-notes="どんな相談をしていいか分からないという方もいらっしゃいますが、例えば、創業のご相談、ネット販売、資金繰り、デジタル化や業務改善など、どんな内容でも大丈夫です。（少し間）現状のお悩みや今後の目標についてお聞かせいただければ、それに合わせてサポートさせていただきます。">' +
      H('Q8. どんな相談をすればいいかわからない') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">どんな内容でも大丈夫です</li>' +
          '<li class="s-list-arrow">創業・ネット販売・資金繰り・DX・業務改善 など</li>' +
          '<li class="s-list-arrow">現状のお悩みや目標をお聞かせいただければOK</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- Q9 --- */
  function slide11() {
    return '<section class="slide" data-section="qa" data-title="Q9. キャンセルについて" data-notes="最後に、予約の変更やキャンセルについてですが、やむを得ない場合はできるだけ2日前までにご連絡をお願いいたします。無断キャンセルや当日キャンセルが続く場合は、今後のご利用をお断りする可能性もありますのでご注意ください。また、公民館などの出張相談先に直接ご連絡いただいても対応できませんので、必ず事務局へご連絡ください。以上が主なご利用ルールになります。">' +
      H('Q9. 予約変更・キャンセルについて') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">変更・キャンセルは2日前までにご連絡を</li>' +
          '<li class="s-list-arrow">無断・当日キャンセルが続く場合は利用停止の可能性あり</li>' +
          '<li class="s-list-arrow">出張相談先への直接連絡は不可 — 必ず事務局へ</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- SECTION: 利用規約 --- */
  function slide12() {
    return '<section class="slide slide-section" data-section="rule" data-title="ご利用規約のご説明" data-notes="続いて、ご利用にあたっての規約と注意点についてご説明させていただきます。（少し間）少し重要な内容になりますので、ポイントを押さえてお伝えしますね。">' +
      '<div class="slide-content">' +
        '<div class="s-section-accent-bar"></div>' +
        '<div class="s-section-chapter">SECTION 02</div>' +
        '<h1 class="s-section-title">ご利用規約のご説明</h1>' +
        '<p class="s-section-lead">5項目 — 重要事項のご確認</p>' +
      '</div>' +
    '</section>';
  }

  /* --- 規約1 --- */
  function slide13() {
    return '<section class="slide" data-section="rule" data-title="1. 相談対象・できないこと" data-notes="まず、よろず支援拠点の相談対象についてです。こちらは、中小企業や小規模事業者の方に加えて、NPO法人や一般社団法人、社会福祉法人、そしてこれから創業される予定の方なども対象となっています。売上拡大や経営改善など、幅広い経営相談に無料で対応しています。（落ち着いて要点）ただし、行政手続きや融資申請、補助金申請などの&#39;実務の代行&#39;は行っていませんので、この点はあらかじめご了承ください。">' +
      H('1. 相談対象・できないこと') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">対象：中小企業・小規模事業者・NPO法人・創業予定者 など</li>' +
          '<li class="s-list-arrow">最終判断はご本人の責任でご決断いただく形</li>' +
          '<li class="s-list-arrow">行政手続き・融資申請・補助金申請などの<strong>代行業務は不可</strong></li>' +
          '<li class="s-list-sub">「作り方を一緒に考える」ことはできます</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- 規約2 --- */
  function slide14() {
    return '<section class="slide" data-section="rule" data-title="2. 情報の取り扱い" data-notes="次に、情報の取り扱いについてです。ご相談いただいた内容や個人情報については、法令に基づいて適切に管理されます。この事業は、経済産業省、中小企業基盤整備機構、そして岡山県産業振興財団などが連携して運営している国の事業になります。そのため、ご相談内容は、事業の運営や改善、分析のために、これらの関係機関や全国のよろず支援拠点で共有される場合があります。また、サービス向上のためにアンケートをお願いすることがあり、その際に企業情報や個人情報を利用させていただく場合があります。">' +
      H('2. 情報の取り扱い') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">法令に基づき適切に管理します</li>' +
          '<li class="s-list-arrow">国の事業として関係機関と情報共有する場合あり<br>（経済産業省・中小機構・岡山県産業振興財団 等）</li>' +
          '<li class="s-list-arrow">サービス向上のためアンケートをお願いする場合あり</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- 規約3 --- */
  function slide15() {
    return '<section class="slide" data-section="rule" data-title="3. アドバイスの責任範囲" data-notes="次に、アドバイスに関する責任範囲についてです。（落ち着いて要点）ご提供するアドバイスについては、完全性や有用性などを保証するものではありません。また、そのアドバイスをもとに行動された結果について、万が一トラブルや損害が発生した場合でも、拠点やコーディネーターは責任を負いかねますので、こちらもご理解ください。">' +
      H('3. アドバイスの責任範囲') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">アドバイスの完全性・有用性は保証しません</li>' +
          '<li class="s-list-arrow">行動の結果に生じたトラブル・損害について<br>拠点・COは責任を負いかねます</li>' +
          '<li class="s-list-arrow">最終判断は必ずご自身でご決断ください</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- 規約4 --- */
  function slide16() {
    return '<section class="slide" data-section="rule" data-title="4. ご利用をお断りする場合" data-notes="続いて、ご利用をお断りする場合についてです。例えば、威圧的な言動や暴力的な行為、大声などで相談業務を妨げる行為、不適切な発言、宗教や政治活動への勧誘、営業行為などがあった場合には、その場で相談を中止し、今後のご利用をお断りすることがあります。また、反社会的勢力に該当する方については、ご利用いただくことができません。さらに、他の企業の代理での相談、コンサルタントや士業の方のノウハウ取得を目的とした相談、同業者による研修目的の利用などはお受けしていません。また、無断キャンセルが続く場合も同様です。">' +
      H('4. ご利用をお断りする場合') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-arrow">威圧・暴力・不適切な発言・勧誘・営業行為</li>' +
          '<li class="s-list-arrow">反社会的勢力に該当する方</li>' +
          '<li class="s-list-arrow">他社代理の相談 / ノウハウ取得目的 / 研修目的の利用</li>' +
          '<li class="s-list-arrow">無断・当日キャンセルが続く場合</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- 規約5 --- */
  function slide17() {
    return '<section class="slide" data-section="rule" data-title="5. トレーニー同席について" data-notes="最後に一点、補足です。よろず支援拠点では、金融機関や支援機関の方の研修制度があり、事前のご案内なく、トレーニーが同席する場合がありますので、この点もあらかじめご了承ください。（柔らかく）同席者がいる場合は、冒頭で一言ご紹介させていただきます。">' +
      H('5. 補足：トレーニーの同席について') +
      '<div class="slide-content">' +
        '<ul class="s-list">' +
          '<li class="s-list-callout">事前案内なしでトレーニーが同席する場合があります</li>' +
          '<li class="s-list-arrow">金融機関・支援機関の研修制度によるものです</li>' +
          '<li class="s-list-sub">同席の際は冒頭で簡単にご紹介します</li>' +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  /* --- CTA --- */
  function slide18() {
    return '<section class="slide slide-impact" data-section="start" data-title="本日の相談をはじめましょう" data-notes="（締めは前向きに）以上が、よろず支援拠点をご利用いただくにあたってのご案内になります。（少し間）ご不明な点があれば、いつでもお気軽にご質問ください。それでは、本日のご相談をはじめましょう。">' +
      '<div class="slide-content slide-content-center">' +
        '<div class="s-impact-tag">START</div>' +
        '<p class="s-impact-main">本日の相談を<br>はじめましょう</p>' +
      '</div>' +
    '</section>';
  }

  /* ===================== REGISTER ===================== */

  var slides = [
    slide01, slide02, slide03, slide04, slide05,
    slide06, slide07, slide08, slide09, slide10,
    slide11, slide12, slide13, slide14, slide15,
    slide16, slide17, slide18
  ];

  window.slideFactories = slides;

})();
