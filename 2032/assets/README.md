# 최종 이미지 넣는 곳

지금 게임은 코드로 그린 임시 픽셀 그림을 써요. 직접 그린 PNG로 바꾸려면:

## 가구 `assets/items/<아이템 id>.png`
- 크기: 가로 = 아이템 가로 칸 × 16px, 세로 = items.js의 `sh` 값 (예: 소파 48×27)
- 회전 0(정면) 모습 하나만 쓰여요. 회전한 모습까지 바꾸려면 render.js의 `drawItem`을 수정하세요.
- 다 넣었으면 `js/config.js`에서 `USE_FINAL_ASSETS: true`

## 캐릭터 `assets/characters/`
- 캐릭터는 머리·옷·액세서리를 바꿀 수 있게 레이어로 합성돼요 (`js/sprites/charSprites.js`).
- 프레임 규격: 24×26px, 발 아래 중앙(12, 24)이 기준점.
