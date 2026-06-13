# 이미지툴 (toolsites 1호)

사진 용량 줄이기 · 크기 조절 · 형식 변환을 제공하는 정적 웹사이트.
모든 이미지 처리는 방문자 브라우저 안에서 이루어진다(서버 업로드 없음 → 서버 비용 0원).

## 구조 (= 재사용 템플릿)

```
index.html      메인 (도구 허브)
compress.html   사진 용량 줄이기 — 핵심 키워드 페이지
resize.html     사진 크기 조절
convert.html    형식 변환 (HEIC→JPG 포함, heic2any CDN 지연 로딩)
crop.html       사진 자르기 (비율 크롭, 캔버스 드래그)
rotate.html     사진 회전·반전
favicon.html    파비콘 생성기 (ICO 컨테이너를 JS로 직접 생성)
about.html      사이트 소개 (애드센스 심사용, 문의: msnism@kakao.com)
privacy.html    개인정보처리방침 (애드센스 심사 필수)
404.html        Cloudflare Pages가 자동으로 사용
css/style.css   공통 스타일 (라이트/다크 모드, 접근성 포커스 스타일 포함)
js/tool.js      공통 이미지 처리 엔진 (ImgTool 전역)
favicon.svg     사이트 자체 파비콘
sitemap.xml / robots.txt
```

2호 사이트를 만들 때는 이 폴더를 복사한 뒤 도구 페이지와 콘텐츠만 교체하면 된다.

## 로컬 실행

```
npx wrangler pages dev .
```

내부 링크가 확장자 없는 주소(/compress 등, Cloudflare Pages pretty URL)라서
`python3 -m http.server`로는 페이지 간 이동이 안 된다. 개별 페이지 직접 열기는 가능.

## 운영 중인 주소

- 프로덕션: https://imgtools-b59.pages.dev (Cloudflare Pages, 프로젝트명 imgtools)
- 저장소: https://github.com/lmsnism-ux/imgtools
- 배포 방법: `wrangler pages deploy . --project-name imgtools --branch main`

## 배포 절차 (Cloudflare Pages 기준, 무료)

1. GitHub에 이 저장소 푸시
2. Cloudflare Pages → "Create a project" → 저장소 연결 → 빌드 명령 없음(정적) → 배포
3. 도메인 구매 후 연결 (후보: `imgtool.kr`, `imgtools.co.kr`, `pixtool.kr` 등 — .kr/.co.kr 연 1.5~2만 원)
4. **도메인 확정 후 치환 작업** (TODO 주석 검색):
   - `sitemap.xml`, `robots.txt`의 `example.com` → 실제 도메인
   - 각 HTML `<head>`에 canonical 태그 추가: `<link rel="canonical" href="https://도메인/페이지.html">`
   - `about.html`의 문의 이메일 입력

## 검색 등록 (배포 직후)

- Google Search Console: 도메인 등록 + sitemap.xml 제출
- 네이버 서치어드바이저: 동일하게 등록 + 사이트맵 제출
- Bing 웹마스터: Search Console 연동으로 1분 등록

## 애드센스 신청 (배포 + 2~4주 후 권장)

체크리스트:
- [ ] 페이지 6개 이상, 각 도구 페이지에 충분한 설명 콘텐츠 (완료됨)
- [ ] 개인정보처리방침, 사이트 소개 페이지 (완료됨)
- [ ] 도구 페이지 2~3개 추가하면 승인 확률 상승 (예: 이미지 자르기, 즐겨찾기 아이콘 만들기)
- [ ] 색인이 어느 정도 잡힌 뒤 신청 (Search Console에서 색인 확인)
- 승인 후: 광고 코드를 각 페이지의 `<!-- 애드센스 승인 후 광고 슬롯 -->` 주석 위치에 삽입, 루트에 ads.txt 업로드

## 수익 목표 (전체 파이프라인 1단계)

- 한국 트래픽 RPM 약 2,000~4,000원/1,000PV 기준
- 월 10만 원 ≈ 일 1,000~1,500 방문 — SEO 안착까지 3~6개월 소요가 정상
- 다음 단계: 영어판(글로벌 RPM 2~5배) → Flutter 앱화(AdMob)
