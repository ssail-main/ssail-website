# SSAIL static website

`https://violet-fabric-058905.framer.app/`을 기준으로 다시 제작한 정적 HTML/CSS/JavaScript 버전입니다. Framer 런타임이나 유료 플랜 없이 GitHub Pages에 게시할 수 있습니다.

## 콘텐츠 관리

같은 홈페이지의 `/admin/`에서 GitHub 개인용 접근 키(Fine-grained PAT)를 입력하여 학부 연구생의 연도·명단·사진, 현재 구성원, 졸업생, 논문·학회 발표, 뉴스, Teaching의 강의 내용을 관리하도록 구성했습니다. 기존 GitHub 계정만 사용하며, Cloudflare 등 추가 서비스 가입은 필요하지 않습니다.

이 소스는 연구실 계정 `ssail-main`의 독립 저장소 `ssail-main/ssail-website`에 게시하도록 설정했습니다. 홈페이지 주소는 `https://ssail-main.github.io/ssail-website/`, 관리자 주소는 `https://ssail-main.github.io/ssail-website/admin/`입니다. 최초 설정은 [ADMIN_SETUP.md](ADMIN_SETUP.md)를 따라 진행합니다. 키는 홈페이지 코드나 채팅에 넣지 않고, 게시된 `/admin/`의 입력란에서만 사용합니다. 키는 창의 메모리에만 유지되므로 새로고침하면 다시 입력합니다.

저장 시 `content/`의 JSON과 `uploads/cms/`의 사진이 GitHub에 기록되고, GitHub Actions가 HTML을 만들어 게시합니다. 방문자에게는 기존과 같은 정적 홈페이지가 제공됩니다.

관리자 기본 언어는 영어입니다. 새 논문·뉴스·연도·학교 그룹·학생은 각 목록의 맨 앞에 추가됩니다. 숫자 순서 입력란 대신 컬렉션 목록의 **Reorder**에서 드래그 또는 이동 버튼으로 순서를 바꾸고 **Save order**로 저장합니다. 논문 종류별, 뉴스, 연도 탭, 학교 그룹, 모든 구성원 명단을 지원합니다. 기존 항목의 내용만 수정하면 위치는 유지됩니다.

폴더 항목의 순서는 `content/order.json`에 저장됩니다(첫 순서 저장 또는 새 항목 게시 시 자동 생성). 파일이 없는 기존 저장소도 지원하며, 기존 숫자 순서는 호환용으로 보존합니다. 학생 순서는 각 JSON의 `members` 배열을 따릅니다. 영어 사용 안내는 `/admin/guide.html`에 있습니다.

Teaching은 **Teaching → Courses and course groups**에서 페이지 제목·소개, 강의 그룹과 강의, 설명·학기·사진·이미지 갤러리를 수정합니다. 그룹과 강의는 편집 폼의 목록 핸들을 드래그해 순서를 바꾸고 **Publish**합니다. 새 그룹과 강의는 해당 목록 맨 앞에 추가됩니다. 전체 Teaching 데이터는 `content/teaching.json`에 저장됩니다. Publications 제목 아래에는 교수님의 Google Scholar 링크가 있습니다.

## Local preview

기존 루트 `index.html` 등은 디자인 템플릿이자 전환 전 내용의 보존본입니다. 더블클릭해 볼 수 있지만 **관리자에서 수정한 최신 내용은 `content/`를 빌드한 `_site/`에 반영**됩니다.

Node.js 24 환경에서 이 폴더를 열고 실행합니다.

```powershell
npm ci --ignore-scripts
npm test
npm run build
```

그다음 `_site/index.html`을 열어 확인합니다. `/admin/`의 실제 관리 키 접속은 게시된 HTTPS 사이트에서 사용합니다. `file://`에서는 로그인할 수 없습니다.

GitHub에서 편집한 뒤 로컬 작업을 다시 할 때에는 먼저 저장소의 최신 `content/`와 사진을 내려받으세요. 오래된 로컬 내용을 다시 업로드하면 최신 편집을 덮어쓸 수 있습니다.

## GitHub Pages

이 폴더의 소스를 `ssail-main/ssail-website` 저장소의 `main` 브랜치 **루트**에 업로드합니다. `.github/workflows/pages.yml`, `content/`, `admin/`, `tools/`, `package.json`, `package-lock.json`도 포함해야 합니다. `node_modules/`, `_site/`, 비밀키 파일은 업로드하지 않습니다.

저장소의 **Settings → Pages → Build and deployment → Source를 GitHub Actions**로 선택합니다. 기존의 `Deploy from a branch` 방식에서는 관리자 편집이 HTML로 변환되지 않습니다. `Publish SSAIL website` 작업이 테스트와 빌드를 통과한 경우에만 `_site/`를 배포합니다.

이 소스에는 `CNAME`이 없습니다. 먼저 기본 GitHub 주소에서 확인한 뒤, 학교 도메인은 DNS 담당자와 연결을 확인하고 GitHub 저장소의 **Settings → Pages → Custom domain**에서 별도로 설정합니다.

## Content check

연구실명, 교수 경력, 학생 명단·사진, 연구·강의·논문·뉴스, Contact 주소를 새 Framer 사이트에서 반영했습니다. 원본 사이트처럼 Laboratory & Graduate Student Office에는 충북대학교 주소가 표시됩니다.

최초 CMS 전환 시 7개 학부 연구생 연도(명단 항목 28개), 현재 구성원 11명, 졸업생 11명, 논문·발표 145개, 뉴스 13개의 전체 내용·사진·링크를 보존 대조했습니다. News 본문은 줄이지 않았습니다. 이후 Teaching도 편집 대상으로 전환했으며, 기존 4개 그룹·8개 강의 카드의 전체 설명·학기·이미지 10개·링크·순서를 대조했습니다. Research와 Contact는 HTML에서 수정합니다. 원본에서 가져온 외부 링크의 실제 서비스 응답까지 모두 검증한 것은 아닙니다.

`tools/migrate-teaching.mjs`는 기존 정적 Teaching을 처음 변환하는 도구이며, 이미 변환을 완료했습니다. 편집한 `content/teaching.json`을 덮어쓰지 않도록 파일이 존재하면 중단합니다. 이후 업데이트에는 기존 최신 Teaching 데이터를 보존하세요. 파일이 없는 이전 소스에서는 정적 Teaching으로 빌드하며, 데이터가 잘못된 경우에는 배포를 중단합니다.

`npm run check:migration`은 최초 데이터 변환의 보존 대조용입니다. 이후 관리자가 내용을 바꾸면 기존 HTML과 다른 것이 정상이므로 일상 배포 테스트에는 포함하지 않았습니다. `npm test`는 계속 사용할 기능 테스트입니다. `tools/migrate-content.mjs`는 이미 실행한 일회성 도구로, `content/`가 있으면 덮어쓰지 않고 중단합니다.

## Files

- `index.html`: Home
- `research.html`: Research
- `teaching.html`: Teaching
- `people.html`: Current people
- `people_undergraduate.html`: Undergraduate Researchers (2019–2026 year tabs)
- `people_alumni.html`: Alumni
- `publications.html`: Publications
- `news.html`: News
- `contact.html`: Contact
- `site.css`: shared responsive styles
- `site.js`: People dropdown, year tabs, mobile navigation, and home inspection-lens interaction
- `CNAME`: GitHub Pages custom domain
- `admin/`: GitHub 기반 편집 화면과 사용 안내
- `content/`: 편집할 원본 데이터 (최신 콘텐츠의 기준)
- `tools/build.mjs`: 기존 디자인을 유지하는 HTML 생성기
- `.github/workflows/pages.yml`: 테스트 → HTML 생성 → Pages 게시
- `oauth-worker/`: 초기 OAuth 방식의 참고 코드; 현재 관리 키 방식에서는 사용하거나 배포하지 않음
- `_site/`: 자동 생성된 최종 HTML/이미지/관리 화면; 직접 수정하지 않음
