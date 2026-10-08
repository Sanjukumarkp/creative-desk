import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <main className="login">
      <LoginForm next={typeof next === 'string' ? next : '/'} />
    </main>
  )
}
