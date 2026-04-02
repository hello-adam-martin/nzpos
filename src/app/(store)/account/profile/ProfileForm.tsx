'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/actions/auth/updateProfile'
import { updateEmail } from '@/actions/auth/updateEmail'
import { changePassword } from '@/actions/auth/changePassword'

type Props = {
  initialData: {
    name: string
    email: string
    emailReceiptsEnabled: boolean
    marketingEmailsEnabled: boolean
  }
}

function PreferenceToggle({
  label,
  name,
  checked,
  onChange,
}: {
  label: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-semibold text-text">{label}</span>
      {/* Hidden checkbox for form submission */}
      <input type="hidden" name={name} value={checked ? 'on' : ''} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative inline-flex items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-navy/20"
        style={{
          width: '44px',
          height: '24px',
          backgroundColor: checked ? 'var(--color-navy, #1E293B)' : 'var(--color-border, #E7E5E4)',
        }}
      >
        <span
          className="inline-block rounded-full bg-white transition-transform duration-150 shadow-sm"
          style={{
            width: '18px',
            height: '18px',
            transform: checked ? 'translateX(23px)' : 'translateX(3px)',
          }}
        />
      </button>
    </div>
  )
}

export function ProfileForm({ initialData }: Props) {
  const [name, setName] = useState(initialData.name)
  const [email, setEmail] = useState(initialData.email)
  const [emailReceipts, setEmailReceipts] = useState(initialData.emailReceiptsEnabled)
  const [marketingEmails, setMarketingEmails] = useState(initialData.marketingEmailsEnabled)

  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isProfilePending, startProfileTransition] = useTransition()
  const [isEmailPending, startEmailTransition] = useTransition()
  const [isPasswordPending, startPasswordTransition] = useTransition()

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // Override toggle values from state (hidden inputs may not reflect latest state)
    formData.set('name', name)
    if (emailReceipts) formData.set('email_receipts', 'on')
    else formData.delete('email_receipts')
    if (marketingEmails) formData.set('marketing_emails', 'on')
    else formData.delete('marketing_emails')

    startProfileTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) {
        setProfileMessage({ type: 'error', text: result.error })
      } else {
        setProfileMessage({ type: 'success', text: 'Changes saved' })
        setTimeout(() => setProfileMessage(null), 2000)
      }
    })
  }

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('email', email)

    startEmailTransition(async () => {
      const result = await updateEmail(formData)
      if (result?.error) {
        setEmailMessage({ type: 'error', text: result.error })
      } else {
        setEmailMessage({ type: 'success', text: 'A verification email will be sent to your new address.' })
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('password', password)
    formData.set('confirmPassword', confirmPassword)

    startPasswordTransition(async () => {
      const result = await changePassword(formData)
      if (result?.error) {
        setPasswordMessage({ type: 'error', text: result.error })
      } else {
        setPasswordMessage({ type: 'success', text: 'Password updated.' })
        setPassword('')
        setConfirmPassword('')
        setShowPasswordSection(false)
        setTimeout(() => setPasswordMessage(null), 2000)
      }
    })
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="rounded-lg p-6 bg-card border border-border">
        <h1 className="text-2xl font-semibold text-text mb-6">My Profile</h1>

        {/* Profile form: name + preferences */}
        <form onSubmit={handleProfileSubmit}>
          {/* Name field */}
          <div className="mb-4">
            <label htmlFor="profile-name" className="block text-sm font-semibold text-text mb-1">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors duration-150"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border my-4" />

          {/* Preferences */}
          <div>
            <p className="text-sm font-semibold text-text mb-2">Email preferences</p>
            <PreferenceToggle
              label="Email receipts"
              name="email_receipts"
              checked={emailReceipts}
              onChange={setEmailReceipts}
            />
            <div className="border-t border-border/50" />
            <PreferenceToggle
              label="Marketing emails"
              name="marketing_emails"
              checked={marketingEmails}
              onChange={setMarketingEmails}
            />
          </div>

          {/* Profile save feedback */}
          {profileMessage && (
            <p
              className="mt-3 text-sm"
              style={{ color: profileMessage.type === 'success' ? '#059669' : 'var(--color-error, #DC2626)' }}
            >
              {profileMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isProfilePending}
            className="mt-4 h-10 px-4 rounded-md bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors duration-150 disabled:opacity-60"
          >
            {isProfilePending ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        {/* Divider */}
        <div className="border-t border-border my-6" />

        {/* Email change form */}
        <form onSubmit={handleEmailSubmit}>
          <div className="mb-4">
            <label htmlFor="profile-email" className="block text-sm font-semibold text-text mb-1">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors duration-150"
            />
          </div>

          {emailMessage && (
            <p
              className="mb-3 text-sm"
              style={{ color: emailMessage.type === 'success' ? '#059669' : 'var(--color-error, #DC2626)' }}
            >
              {emailMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isEmailPending || email === initialData.email}
            className="h-10 px-4 rounded-md bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors duration-150 disabled:opacity-60"
          >
            {isEmailPending ? 'Saving...' : 'Update email'}
          </button>
        </form>

        {/* Divider */}
        <div className="border-t border-border my-6" />

        {/* Password change section */}
        <div>
          {!showPasswordSection ? (
            <button
              type="button"
              onClick={() => setShowPasswordSection(true)}
              className="text-sm text-navy underline hover:text-navy/80 transition-colors duration-150"
            >
              Change password
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <p className="text-sm font-semibold text-text mb-3">Change password</p>

              <div className="mb-4">
                <label htmlFor="profile-password" className="block text-sm font-semibold text-text mb-1">
                  New password
                </label>
                <input
                  id="profile-password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors duration-150"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="profile-confirm-password" className="block text-sm font-semibold text-text mb-1">
                  Confirm new password
                </label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors duration-150"
                />
              </div>

              {passwordMessage && (
                <p
                  className="mb-3 text-sm"
                  style={{ color: passwordMessage.type === 'success' ? '#059669' : 'var(--color-error, #DC2626)' }}
                >
                  {passwordMessage.text}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isPasswordPending}
                  className="h-10 px-4 rounded-md bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors duration-150 disabled:opacity-60"
                >
                  {isPasswordPending ? 'Updating...' : 'Update password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSection(false)
                    setPassword('')
                    setConfirmPassword('')
                    setPasswordMessage(null)
                  }}
                  className="text-sm text-text-muted underline hover:text-text transition-colors duration-150"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
