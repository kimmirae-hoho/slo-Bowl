# 한 그릇 카드 · 떡국

떡국 그릇에 재료 스티커를 담아 새해 카드 이미지로 저장하고, 저장한 그릇을 함께 둘러보는 웹사이트.

- `index.html`: 카드 만들기 화면 + 떡국 아카이브 (프레임워크 없는 정적 페이지)
- `assets/`: 그릇·스티커·로고 그림 (2026 한 그릇 카드 원본에서 추출)
- `api/bowls.js`: 아카이브 API (Vercel 함수)
  - `GET /api/bowls`: 최근 400그릇, 최신순
  - `POST /api/bowls`: 그릇 저장. 같은 방문에서 다시 저장하면 `id`·`key`로 같은 항목을 덮어씀
- `lib/bowls.js`: 저장 로직과 입력 검증

## 배포 (GitHub + Vercel)

1. 이 폴더를 GitHub 저장소에 올린다.
2. Vercel에서 **Add New → Project**로 그 저장소를 가져온다. Framework Preset은 **Other**, 빌드 설정은 비워 둔다.
3. 프로젝트의 **Storage** 탭에서 **Upstash for Redis**(Marketplace)를 만들고 이 프로젝트에 연결한다.
   연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` (또는 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) 환경 변수가 자동으로 들어간다.
4. 다시 배포(Redeploy)한다.

저장소가 연결되지 않으면 아카이브 API는 `503 storage_not_configured`를 돌려주고, 카드 만들기와 이미지 저장은 그대로 동작한다.

## 해마다 바꿀 것

- `assets/`의 띠 동물 스티커 (`horse-sit.png`, `horse-stand.png`)
- `index.html`의 `YEAR`, `YEAR_NAME`, 띠 동물 스티커 설명 (`STICKERS`)
