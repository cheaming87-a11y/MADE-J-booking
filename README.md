# MADE J Booking

GitHub Pages + Supabase 무료 플랜으로 운영할 수 있는 정적 예약 웹앱입니다.

## 구성

- `index.html`: 고객 예약 페이지
- `admin.html`: 관리자 예약 목록 페이지
- `styles.css`: 전체 스타일
- `supabase-config.js`: Supabase 접속 설정
- `app.js`: 예약 등록 로직
- `admin.js`: 예약 조회/상태 변경 로직
- `supabase-schema.sql`: Supabase 테이블과 보안 정책 SQL

## 1. Supabase 설정

1. https://supabase.com 에 가입합니다.
2. 새 프로젝트를 만듭니다.
3. Supabase Dashboard > SQL Editor에서 `supabase-schema.sql` 내용을 실행합니다.
4. Project Settings > API에서 아래 값을 확인합니다.
   - Project URL
   - anon public key
5. `supabase-config.js`에 값을 넣습니다.
6. Authentication > Users에서 관리자 계정을 직접 추가합니다.
7. Authentication > Providers > Email에서 일반 회원가입을 막고, 관리자만 로그인하게 설정하는 것을 권장합니다.

```js
window.MADE_J_SUPABASE = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

## 2. 로컬 테스트

이 폴더의 `index.html`을 브라우저에서 열면 됩니다.

관리자 화면은 `admin.html`입니다.

## 3. GitHub Pages 배포

1. GitHub에서 `MADE-J-booking` 저장소를 만듭니다.
2. 이 폴더의 파일을 저장소에 업로드합니다.
3. Repository Settings > Pages로 이동합니다.
4. Source를 `Deploy from a branch`로 선택합니다.
5. Branch를 `main`, folder를 `/root`로 선택합니다.
6. 저장 후 잠시 기다리면 아래 형식의 주소가 생깁니다.

```text
https://본인아이디.github.io/MADE-J-booking/
```

## 관리자 접근

`admin.html`에서 Supabase Auth 이메일/비밀번호로 로그인해야 예약 목록을 볼 수 있습니다.

정적 웹앱 구조상 `anon public key`는 브라우저에 공개됩니다. 보안은 키를 숨기는 방식이 아니라 Supabase RLS 정책으로 제어합니다.
