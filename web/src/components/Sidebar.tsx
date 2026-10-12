'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Info,
  Lightbulb,
  Calendar,
  MapPin,
  Settings,
  LogOut,
  Wrench,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { isConfigured } from '@/lib/config'

const navItems = [
  { label: 'Xe của tôi', href: '/vehicles', icon: Wrench },
  {
    label: 'Tổng quan',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Nhập bảo dưỡng',
    href: '/input',
    icon: PlusCircle,
  },
  {
    label: 'Lịch sử',
    href: '/history',
    icon: History,
  },
  {
    label: 'Thông tin bảo dưỡng',
    href: '/info',
    icon: Info,
  },
  {
    label: 'Gợi ý bảo dưỡng',
    href: '/tips',
    icon: Lightbulb,
  },
  {
    label: 'Lịch bảo dưỡng',
    href: '/schedule',
    icon: Calendar,
  },
  {
    label: 'Cửa hàng dịch vụ',
    href: '/stores',
    icon: MapPin,
  },
  { label: 'Tài khoản', href: '/profile', icon: Settings },
]

const adminItems = [
  {
    label: 'Quản lý xe',
    href: '/admin/vehicles',
    icon: Wrench,
  },
  {
    label: 'Cài đặt hệ thống',
    href: '/admin/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const handleLogout = async () => {
    if (!isConfigured) {
      router.push('/')
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: 'var(--gradient-primary)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-sm)',
            }}
          >
            <Wrench size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
              MotoMaintain
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chăm sóc xe mỗi ngày</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '8px 10px 4px',
            }}
          >
            Người dùng
          </div>
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  marginBottom: '2px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  background: active ? 'rgba(204, 0, 0, 0.12)' : 'transparent',
                  border: active ? '1px solid rgba(204, 0, 0, 0.2)' : '1px solid transparent',
                  color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={17} />
                <span style={{ fontSize: '14px', fontWeight: active ? 600 : 400 }}>
                  {item.label}
                </span>
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            )
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '8px 10px 4px',
              }}
            >
              🔧 Admin
            </div>
            {adminItems.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    marginBottom: '2px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    background: active ? 'rgba(204, 0, 0, 0.12)' : 'transparent',
                    border: active ? '1px solid rgba(204, 0, 0, 0.2)' : '1px solid transparent',
                    color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon size={17} />
                  <span style={{ fontSize: '14px', fontWeight: active ? 600 : 400 }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User Info + Logout */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            background: 'var(--bg-elevated)',
            borderRadius: '12px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: 'var(--gradient-primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile?.full_name || 'Người dùng'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isAdmin ? '👑 Admin' : '👤 User'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', color: 'var(--danger)' }}
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        aria-label="Mở hoặc đóng menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 200,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '8px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
        className="mobile-menu-toggle"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 99,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${mobileOpen ? 'open' : ''}`}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {sidebarContent}
      </aside>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
          .mobile-overlay {
            display: block !important;
          }
        }
      `}</style>
    </>
  )
}
