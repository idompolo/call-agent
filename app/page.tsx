import { redirect } from 'next/navigation'

export default function Home() {
  // 루트 접근 시 로그인 페이지로 리다이렉트
  // 인증된 사용자는 auth layout에서 dashboard로 리다이렉트됨
  redirect('/login')
}