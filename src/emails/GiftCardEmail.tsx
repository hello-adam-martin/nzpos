import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import { format } from 'date-fns'
import { formatNZD } from '@/lib/money'
import { formatGiftCardCode } from '@/lib/gift-card-utils'

type GiftCardEmailProps = {
  /** Raw 8-digit numeric code (e.g. '48271593') */
  code: string
  /** Gift card value in cents */
  balanceCents: number
  /** ISO date string for expiry date */
  expiresAt: string
  /** Store name for display */
  storeName: string
  /** Optional store logo URL */
  storeLogo?: string
}

const fontDisplay = "'Satoshi', 'Helvetica Neue', Arial, sans-serif"
const fontBody = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
const fontMono = "'Geist Mono', 'Courier New', monospace"

/**
 * Gift card delivery email.
 *
 * Renders the gift card code prominently (monospace, Display 30px, letter-spacing 0.1em)
 * with balance and expiry date per NZ Fair Trading Act 2024 requirements (D-03).
 *
 * Expiry shown in bold red (#DC2626) with <strong> tag — NZ FTA requires clear disclosure.
 */
export function GiftCardEmail({
  code,
  balanceCents,
  expiresAt,
  storeName,
  storeLogo,
}: GiftCardEmailProps) {
  const displayCode = formatGiftCardCode(code)
  const formattedBalance = formatNZD(balanceCents)
  const formattedExpiry = format(new Date(expiresAt), 'd MMMM yyyy')

  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: '#FAFAF9', margin: '0', padding: '24px 0' }}>
        <Container
          style={{
            backgroundColor: '#FFFFFF',
            maxWidth: '600px',
            margin: '0 auto',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header — store name / logo */}
          <Section
            style={{
              backgroundColor: '#1E293B',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            {storeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storeLogo}
                alt={storeName}
                style={{ maxHeight: '48px', objectFit: 'contain', margin: '0 auto' }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: fontDisplay,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: '0',
                  lineHeight: '1.3',
                }}
              >
                {storeName}
              </Text>
            )}
          </Section>

          {/* Main content */}
          <Section style={{ padding: '32px 24px 8px 24px', textAlign: 'center' }}>
            {/* Heading */}
            <Text
              style={{
                fontFamily: fontDisplay,
                fontSize: '30px',
                fontWeight: 700,
                color: '#1C1917',
                margin: '0 0 24px 0',
                lineHeight: '1.2',
              }}
            >
              {"Here's your gift card"}
            </Text>

            {/* Code block — bordered box with prominent monospace code */}
            <div
              style={{
                border: '2px solid #E7E5E4',
                borderRadius: '8px',
                padding: '24px',
                margin: '0 0 24px 0',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fontMono,
                  fontSize: '30px',
                  fontWeight: 700,
                  color: '#1C1917',
                  margin: '0',
                  lineHeight: '1.2',
                  letterSpacing: '0.1em',
                }}
              >
                {displayCode}
              </Text>
            </div>

            {/* Balance row — Heading 20px, semibold */}
            <Text
              style={{
                fontFamily: fontBody,
                fontSize: '20px',
                fontWeight: 600,
                color: '#1C1917',
                margin: '0 0 8px 0',
                lineHeight: '1.3',
              }}
            >
              Value: {formattedBalance}
            </Text>

            {/* Expiry row — bold red (#DC2626), NZ FTA compliance (D-03) */}
            <Text
              style={{
                fontFamily: fontBody,
                fontSize: '14px',
                fontWeight: 400,
                color: '#DC2626',
                margin: '0 0 16px 0',
                lineHeight: '1.4',
              }}
            >
              <strong>Valid until: {formattedExpiry}</strong>
            </Text>

            {/* Redeemable at */}
            <Text
              style={{
                fontFamily: fontBody,
                fontSize: '14px',
                fontWeight: 400,
                color: '#737373',
                margin: '0 0 8px 0',
                lineHeight: '1.4',
              }}
            >
              Redeemable at {storeName}
            </Text>

            {/* Instructions */}
            <Text
              style={{
                fontFamily: fontBody,
                fontSize: '14px',
                fontWeight: 400,
                color: '#737373',
                margin: '0',
                lineHeight: '1.4',
              }}
            >
              Use this code at checkout in-store or online.
            </Text>
          </Section>

          <Hr style={{ borderColor: '#E7E5E4', margin: '16px 24px' }} />

          {/* Footer */}
          <Section style={{ padding: '16px 24px', textAlign: 'center' }}>
            <Text
              style={{
                fontFamily: fontBody,
                fontSize: '12px',
                fontWeight: 400,
                color: '#78716C',
                margin: '0',
                lineHeight: '1.5',
              }}
            >
              Powered by NZPOS
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
