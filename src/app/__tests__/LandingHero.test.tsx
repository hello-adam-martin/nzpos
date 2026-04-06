import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LandingHero from '../(marketing)/components/LandingHero'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('LandingHero', () => {
  it('renders Try POS Demo link to /demo/pos', () => {
    render(<LandingHero />)
    const demoLink = screen.getByRole('link', { name: /demo/i })
    expect(demoLink).toHaveAttribute('href', '/demo/pos')
  })

  it('still renders Get started free link to /signup', () => {
    render(<LandingHero />)
    const signupLink = screen.getByRole('link', { name: /get started free/i })
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('Try POS Demo link has accessible label', () => {
    render(<LandingHero />)
    const demoLink = screen.getByRole('link', { name: /demo/i })
    expect(demoLink).toBeTruthy()
  })
})
