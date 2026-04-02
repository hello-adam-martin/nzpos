import { Html, Head, Body, Container, Section, Text, Hr } from '@react-email/components'
import { EmailHeader } from './components/EmailHeader'
import { EmailFooter } from './components/EmailFooter'

type PickupReadyEmailProps = {
  orderItems: { productName: string; quantity: number }[]
  storeName: string
  storeAddress: string
  storePhone: string
  openingHours: string
  orderNumber: string
}

export function PickupReadyEmail({
  orderItems,
  storeName,
  storeAddress,
  storePhone,
  openingHours,
  orderNumber,
}: PickupReadyEmailProps) {
  const fontBase = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"

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
          <EmailHeader storeName={storeName} />

          <Section style={{ padding: '24px 24px 8px 24px' }}>
            {/* Success status pill */}
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: fontBase,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  lineHeight: '1.4',
                }}
              >
                Ready for pickup
              </span>
            </div>

            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '20px',
                fontWeight: 600,
                color: '#1C1917',
                margin: '0 0 4px 0',
                lineHeight: '1.3',
              }}
            >
              Your order is ready
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
              Order #{orderNumber}
            </Text>
          </Section>

          {/* Condensed order summary — item names + quantities only (no prices) */}
          <Section style={{ padding: '0 24px' }}>
            {orderItems.map((item, index) => (
              <Text
                key={index}
                style={{
                  fontFamily: fontBase,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#1C1917',
                  margin: '4px 0',
                  lineHeight: '1.5',
                }}
              >
                {item.quantity} × {item.productName}
              </Text>
            ))}
          </Section>

          <Hr style={{ borderColor: '#E7E5E4', margin: '16px 24px' }} />

          {/* Collection details */}
          <Section style={{ padding: '0 24px 16px 24px' }}>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '14px',
                fontWeight: 600,
                color: '#1C1917',
                margin: '0 0 8px 0',
                lineHeight: '1.4',
              }}
            >
              Collection details
            </Text>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '14px',
                fontWeight: 400,
                color: '#1C1917',
                margin: '0 0 4px 0',
                lineHeight: '1.5',
              }}
            >
              {storeAddress}
            </Text>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '14px',
                fontWeight: 400,
                color: '#1C1917',
                margin: '0 0 4px 0',
                lineHeight: '1.5',
              }}
            >
              {storePhone}
            </Text>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '14px',
                fontWeight: 400,
                color: '#1C1917',
                margin: '0',
                lineHeight: '1.5',
              }}
            >
              {openingHours}
            </Text>
          </Section>

          <EmailFooter
            storeAddress={storeAddress}
            storePhone={storePhone}
            openingHours={openingHours}
          />
        </Container>
      </Body>
    </Html>
  )
}
