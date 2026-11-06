/* =========================================================
   CHARACTERS — 캐릭터 기본 데이터
   - 합천 여행 사이트(Our First Travel)의 건주·찬슬 픽셀 캐릭터(16×20)를
     그대로 가져와 머리/얼굴/몸을 레이어로 나눴어요.
   - 머리 모양·색, 상의·하의·신발, 액세서리를 바꿔도
     모든 행동 애니메이션이 같은 레이어 구조로 다시 그려져요.
   ========================================================= */
window.CHAR_DATA = (function () {
  // 원본 스프라이트(합천 사이트 BASE) — 참고 및 '기본' 머리 모양 추출용
  const ORIGINAL = {
    chan: [
      "...........KKK..", "..........KKKKK.", "....KKKKKKKKKKK.", "...KKKKKKKKKKKK.", "..KKKKHKKKKHKKK.", "..KKKKKKKKKKKKK.", "..KKSKKKSKKKSKK.", ".KKSSSSSSSSSSKK.",
      "K.KSSESSSSESSK.K", "K..SSESSSSESS..K", "...SRSSMMSSRS...", "....SSSSSSSS....", "....PPPWTWPPP...", "...PpPPWTWPPpP..", "..SPpPPPTPPPpPS.", "..SPpPPPTPPPpPS.",
      "...PpPPPPPPPpP..", "....LLLLLLLL....", "....LLL..LLL....", "....KKK..KKK...."],
    geon: [
      ".....KKKKKK.....", "...KKKKKKKKKK...", "..KKKKKKKKKKKK..", ".KKKKHKKKKKHKKK.", "KKKKKKKKKKKKKKKK", "KKKKKKKKKKKKKKKK", "KKKSKKKSSKKKSKKK", "KKSSSSSSSSSSSSKK",
      "KKSSESSSSSSESSKK", "KKSSESSSSSSESSKK", ".KSRSSSMMSSSSRK.", ".KKSSSSSSSSSSKK.", "..K.BBBWTWBBB.K.", "...BbBBWTWBBbB..", "..SBbBBBTBBBbBS.", "..SBbBBBTBBBbBS.",
      "...BbBBBBBBBbB..", "....LLLLLLLL....", "....LLL..LLL....", "....KKK..KKK...."]
  };

  // 얼굴 틀 (머리카락 없이) — 각자 원래 얼굴 폭·눈 위치 그대로
  const FACE = {
    chan: { L: 3, R: 12, eyes: [5, 10], blush: [4, 11], mouth: [7, 8],
      rows: { 6: "...SSSSSSSSSS...", 7: "...SSSSSSSSSS...", 8: "...SSESSSSESS...", 9: "...SSESSSSESS...", 10: "...SRSSMMSSRS...", 11: "....SSSSSSSS...." } },
    geon: { L: 2, R: 13, eyes: [4, 11], blush: [3, 13], mouth: [7, 8],
      rows: { 6: "..SSSSSSSSSSSS..", 7: "..SSSSSSSSSSSS..", 8: "..SSESSSSSSESS..", 9: "..SSESSSSSSESS..", 10: "..SRSSSMMSSSSR..", 11: "...SSSSSSSSSS..." } }
  };

  // 원본에서 '기본' 머리카락 마스크 추출 (K/H 픽셀, 0~12행)
  function extractHair(rows, face) {
    const out = [];
    for (let j = 0; j <= 12; j++) {
      const r = rows[j] || "";
      let s = "";
      for (let i = 0; i < 16; i++) {
        const k = r[i];
        const isEye = (j === 8 || j === 9) && face.eyes.includes(i);
        s += ((k === "K" || k === "H") && !isEye) ? k : ".";
      }
      out.push(s);
    }
    return out;
  }
  const ORIGINAL_HAIR = { chan: extractHair(ORIGINAL.chan, FACE.chan), geon: extractHair(ORIGINAL.geon, FACE.geon) };

  const HAIR_STYLES = [
    { id: "orig", name: "원래 머리" },
    { id: "short", name: "짧은 머리" },
    { id: "bob", name: "단발" },
    { id: "long", name: "긴 생머리" },
    { id: "pony", name: "포니테일" },
    { id: "bun", name: "똥머리" },
    { id: "pig", name: "양갈래" }
  ];
  const HAIR_COLORS = [
    { id: "black", name: "흑발", c: "#1b1414", h: "#3d3232" },
    { id: "choco", name: "초코", c: "#4a2b1d", h: "#6e4430" },
    { id: "brown", name: "밝은 갈색", c: "#7a4a2a", h: "#a06a40" },
    { id: "ash", name: "애쉬", c: "#4c4a55", h: "#6c6a78" },
    { id: "wine", name: "와인", c: "#5a1e2c", h: "#82364a" },
    { id: "pink", name: "핑크", c: "#d9688f", h: "#f29ab6" },
    { id: "blond", name: "금발", c: "#d9a441", h: "#f2cb6b" }
  ];
  const TOP_STYLES = [
    { id: "shirt", name: "셔츠+넥타이" },
    { id: "tee", name: "티셔츠" },
    { id: "hoodie", name: "후드티" },
    { id: "knit", name: "니트" },
    { id: "dress", name: "원피스" }
  ];
  const COLORS = [
    { id: "pink", name: "분홍", l: "#ffd2de", d: "#f28daf" },
    { id: "blue", name: "하늘", l: "#a9c6f2", d: "#6f97d8" },
    { id: "lemon", name: "레몬", l: "#fff1a8", d: "#e8c84a" },
    { id: "mint", name: "민트", l: "#bfeedd", d: "#6cc4a4" },
    { id: "lilac", name: "라일락", l: "#dccdf6", d: "#a68ae0" },
    { id: "white", name: "화이트", l: "#ffffff", d: "#cfcac2" },
    { id: "navy", name: "네이비", l: "#4a5a8a", d: "#2f3a62" },
    { id: "red", name: "빨강", l: "#f07a6a", d: "#c2463a" },
    { id: "beige", name: "베이지", l: "#efdcbc", d: "#c9a87a" },
    { id: "black", name: "블랙", l: "#3a3a44", d: "#22222a" }
  ];
  const BOTTOMS = [
    { id: "charcoal", name: "차콜", c: "#2b2b33" },
    { id: "denim", name: "청바지", c: "#3f5f9a" },
    { id: "beige", name: "베이지", c: "#c9a87a" },
    { id: "white", name: "화이트", c: "#e9e4da" },
    { id: "pink", name: "핑크", c: "#e38aa8" },
    { id: "green", name: "올리브", c: "#5f6e3a" }
  ];
  const SHOES = [
    { id: "black", name: "검정", c: "#1b1414" },
    { id: "white", name: "흰 운동화", c: "#f4f1ea" },
    { id: "brown", name: "갈색 로퍼", c: "#6a3e22" },
    { id: "red", name: "빨간 구두", c: "#c2463a" },
    { id: "pink", name: "분홍 슬리퍼", c: "#f28daf" }
  ];
  const ACCESSORIES = [
    { id: "none", name: "없음" },
    { id: "glasses", name: "동글 안경" },
    { id: "ribbon", name: "리본 핀" },
    { id: "beret", name: "베레모" },
    { id: "cap", name: "볼캡" },
    { id: "flower", name: "꽃 핀" },
    { id: "blush", name: "진한 볼터치" },
    { id: "earmuff", name: "귀마개" }
  ];

  const DEFAULT_LOOKS = {
    geon: { hair: "orig", hairColor: "black", top: "shirt", topColor: "blue", bottom: "charcoal", shoes: "black", acc: "none" },
    chan: { hair: "orig", hairColor: "black", top: "shirt", topColor: "pink", bottom: "charcoal", shoes: "black", acc: "none" }
  };

  const CHARS = [
    { id: "geon", name: "건주", label: "캐릭터 1", face: "geon" },
    { id: "chan", name: "찬슬", label: "캐릭터 2", face: "chan" }
  ];

  return { ORIGINAL, FACE, ORIGINAL_HAIR, HAIR_STYLES, HAIR_COLORS, TOP_STYLES, COLORS, BOTTOMS, SHOES, ACCESSORIES, DEFAULT_LOOKS, CHARS };
})();
