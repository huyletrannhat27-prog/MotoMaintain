'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useData } from '@/components/DataProvider'
import { Page, Field, ErrorMessage, message } from '@/components/UI'
export default function ProfilePage() {
  const { data, saveProfile } = useData()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <Page title="Tài khoản" description="Thông tin cá nhân của bạn.">
      <form
        className="card panel form-stack narrow"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          setBusy(true)
          setSaved(false)
          setError('')
          try {
            await saveProfile(String(f.get('name')).trim(), String(f.get('phone')).trim())
            setSaved(true)
          } catch (e) {
            setError(message(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        <ErrorMessage error={error} />
        {saved && (
          <p role="status" className="notice success">
            Đã lưu thông tin.
          </p>
        )}
        <Field label="Email">
          <input className="input" value={data.profile.email} disabled />
        </Field>
        <Field label="Họ tên">
          <input
            className="input"
            name="name"
            required
            maxLength={100}
            defaultValue={data.profile.full_name}
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            className="input"
            name="phone"
            type="tel"
            maxLength={20}
            defaultValue={data.profile.phone}
          />
        </Field>
        <div className="actions">
          <button disabled={busy} className="btn btn-primary">
            {busy ? 'Đang lưu…' : 'Lưu thông tin'}
          </button>
          <Link href="/forgot-password" className="btn btn-outline">
            Đổi mật khẩu
          </Link>
        </div>
      </form>
    </Page>
  )
}
