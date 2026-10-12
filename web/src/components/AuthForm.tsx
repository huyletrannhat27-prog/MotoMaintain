'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bike } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/config'
import { ErrorMessage, Field, message } from './UI'
type Mode = 'login' | 'register' | 'forgot' | 'reset'
const titles = {
  login: 'Chào mừng trở lại',
  register: 'Bắt đầu chăm sóc xe',
  forgot: 'Quên mật khẩu?',
  reset: 'Đặt mật khẩu mới',
}
export default function AuthForm({ mode }: { mode: Mode }) {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(mode !== 'reset')
  const router = useRouter()
  useEffect(() => {
    if (mode !== 'reset' || !isConfigured) return
    let active = true
    const client = createClient()
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setReady(!!data.session)
        if (!data.session) setError('Liên kết đặt lại mật khẩu chưa hợp lệ hoặc đã hết hạn.')
      }
    })
    return () => {
      active = false
    }
  }, [mode])
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Link href="/" className="brand">
          <Bike /> MotoMaintain<span className="brand-dot">.</span>
        </Link>
        <h1>
          Chăm xe hôm nay.
          <br />
          An tâm ngày mai.
        </h1>
        <p className="muted">Lịch sử rõ ràng. Nhắc bảo dưỡng đúng lúc.</p>
      </div>
      <div className="card auth-card">
        <p className="eyebrow">GARAGE CỦA BẠN</p>
        <h2>{titles[mode]}</h2>
        {!isConfigured ? (
          <>
            <p className="notice">
              Bản dùng thử chưa kết nối tài khoản. Bạn có thể khám phá các chức năng bằng dữ liệu
              minh họa.
            </p>
            <Link href="/dashboard" className="btn btn-primary">
              Mở bản dùng thử →
            </Link>
          </>
        ) : (
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              setBusy(true)
              setError('')
              setNotice('')
              try {
                const client = createClient()
                const email = String(f.get('email') || '').trim()
                const password = String(f.get('password') || '')
                if ((mode === 'register' || mode === 'reset') && password !== f.get('confirm'))
                  throw new Error('Hai mật khẩu chưa khớp.')
                if (mode === 'login') {
                  const { error } = await client.auth.signInWithPassword({ email, password })
                  if (error) throw new Error('Email hoặc mật khẩu không đúng.')
                  router.push('/dashboard')
                  router.refresh()
                } else if (mode === 'register') {
                  const { data, error } = await client.auth.signUp({
                    email,
                    password,
                    options: {
                      data: { full_name: String(f.get('name')).trim() },
                      emailRedirectTo: window.location.origin + '/auth/callback',
                    },
                  })
                  if (error) throw error
                  if (data.session) {
                    router.push('/dashboard')
                    router.refresh()
                  } else setNotice('Hãy mở email xác nhận để hoàn tất đăng ký.')
                } else if (mode === 'forgot') {
                  const { error } = await client.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/auth/callback?next=/reset-password',
                  })
                  if (error) throw error
                  setNotice('Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.')
                } else {
                  if (!ready) throw new Error('Vui lòng mở liên kết trong email trước.')
                  const { error } = await client.auth.updateUser({ password })
                  if (error) throw error
                  setNotice('Đã đổi mật khẩu. Bạn có thể tiếp tục vào garage.')
                }
              } catch (e) {
                setError(message(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            <ErrorMessage error={error} />
            {notice && (
              <p className="notice success" role="status">
                {notice}
              </p>
            )}
            {mode === 'register' && (
              <Field label="Họ tên">
                <input name="name" className="input" autoComplete="name" required maxLength={100} />
              </Field>
            )}
            {mode !== 'reset' && (
              <Field label="Email">
                <input name="email" className="input" type="email" autoComplete="email" required />
              </Field>
            )}
            {mode !== 'forgot' && (
              <Field label="Mật khẩu">
                <input
                  name="password"
                  type="password"
                  className="input"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'login' ? 1 : 8}
                />
              </Field>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <Field label="Nhập lại mật khẩu">
                <input
                  name="confirm"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </Field>
            )}
            <button className="btn btn-primary" disabled={busy || !ready}>
              {busy
                ? 'Đang xử lý…'
                : mode === 'login'
                  ? 'Đăng nhập'
                  : mode === 'register'
                    ? 'Tạo tài khoản'
                    : mode === 'forgot'
                      ? 'Gửi liên kết'
                      : 'Lưu mật khẩu'}
            </button>
          </form>
        )}
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <Link href="/forgot-password">Quên mật khẩu?</Link>
              <Link href="/register">Tạo tài khoản →</Link>
            </>
          ) : (
            <Link href="/login">← Về đăng nhập</Link>
          )}
          {notice && mode === 'reset' && <Link href="/dashboard">Vào garage →</Link>}
        </div>
      </div>
    </main>
  )
}
