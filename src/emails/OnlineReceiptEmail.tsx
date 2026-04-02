import { Html, Head, Body, Container, Section, Text, Hr } from '@react-email/components'
import { EmailHeader } from './components/EmailHeader'
import { EmailFooter } from './components/EmailFooter'
import { LineItemTable } from './components/LineItemTable'
import type { ReceiptData } from '@/lib/receipt'

type OnlineReceiptEmailProps = {
  receipt: ReceiptData
}

export function OnlineReceiptEmail({ receipt }: OnlineReceiptEmailProps) {
  const fontBase = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"

  const formattedDate = new Date(receipt.completedAt).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

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
          <EmailHeader storeName={receipt.storeName} />

          <Section style={{ padding: '24px 24px 8px 24px' }}>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '16px',
                fontWeight: 600,
                color: '#1C1917',
                margin: '0 0 4px 0',
                lineHeight: '1.3',
              }}
            >
              Thanks for your order
            </Text>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '12px',
                fontWeight: 400,
                color: '#78716C',
                margin: '0 0 16px 0',
                lineHeight: '1.5',
              }}
            >
              Order #{receipt.orderId.slice(0, 8).toUpperCase()} &middot; {formattedDate}
            </Text>
          </Section>

          <LineItemTable
            items={receipt.items}
            subtotalCents={receipt.subtotalCents}
            gstCents={receipt.gstCents}
            totalCents={receipt.totalCents}
            paymentMethod={receipt.paymentMethod}
          />

          <Hr style={{ borderColor: '#E7E5E4', margin: '16px 24px' }} />

          <EmailFooter
            storeAddress={receipt.storeAddress}
            storePhone={receipt.storePhone}
          />
        </Container>
      </Body>
    </Html>
  )
}
