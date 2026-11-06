/* =========================================================
   CONFIG — 개발자 설정
   ========================================================= */
window.CONFIG = {
  // true로 바꾸면 assets/items/<id>.png, assets/characters/<id>.png 최종 이미지를 먼저 찾아요.
  // 이미지가 없으면 자동으로 코드로 그린 임시 픽셀 그림을 써요.
  USE_FINAL_ASSETS: false,

  // 피드백 관리 화면 비밀번호 — 주소 끝에 #developer 를 붙여 들어가요.
  // (브라우저 안에서만 확인하는 간단한 잠금이라 진짜 보안은 아니에요)
  DEV_PIN: "2032",

  // 피드백을 개발자에게 실제로 보내는 방법 (비워두면 이 기기에만 저장)
  // 합천 여행 사이트(Our First Travel)와 같은 Supabase 저장소 — 피드백이 여기로 전달돼요
  SUPABASE: {
    URL: "https://xkvmpbkberusfakbquvb.supabase.co",
    KEY: "sb_publishable_aaQHQU_imqWND0PtqzrvWg_HJ0E8OC7"
  },

  FEEDBACK: {
    ENDPOINT: "",        // 예: Google Apps Script 웹앱 URL, Formspree URL 등 (POST JSON)
    DEVELOPER_EMAIL: ""  // 적으면 '메일로도 보내기' 버튼이 생겨요
  },

  START_COINS: 200,
  SAVE_KEY: "y2032:save:v1",
  BACKUP_KEY: "y2032:save:backup",
  FEEDBACK_KEY: "y2032:feedback:v1"
};
