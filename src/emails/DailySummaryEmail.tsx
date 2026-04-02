import { Html, Head, Body, Container, Section, Text, Row, Column, Hr } from '@react-email/components'
import { EmailHeader } from './components/EmailHeader'
import { EmailFooter } from './components/EmailFooter'
import { formatNZD } from '@/lib/money'

type DailySummaryProps = {
  storeName: string
  storeAddress: string
  storePhone: string
  date: string                          // formatted NZ date string e.g. "1 April 2026"
  totalSales: number
  totalRevenueCents: number             // total revenue excluding GST
  totalGstCents: number
  revenueByMethod: { method: string; amountCents: number }[]
  topProducts: { rank: number; name: string; quantity: number; revenueCents: number }[]
  lowStockItems: { name: string; currentStock: number; reorderThreshold: number }[]
}

export function DailySummaryEmail({
  storeName,
  storeAddress,
  storePhone,
  date,
  totalSales,
  totalRevenueCents,
  totalGstCents,
  revenueByMethod,
  topProducts,
  lowStockItems,
}: DailySummaryProps) {
  const fontBase = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
  const isZeroSaleDay = totalSales === 0

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
          <EmailHeader storeName={storeName} subtitle="Daily Summary" />

          <Section style={{ padding: '24px 24px 8px 24px' }}>
            <Text
              style={{
                fontFamily: fontBase,
                fontSize: '16px',
                fontWeight: 600,
                color: '#1C1917',
                margin: '0 0 16px 0',
                lineHeight: '1.3',
              }}
            >
              Yesterday at a glance &mdash; {date}
            </Text>

            {isZeroSaleDay ? (
              <Text
                style={{
                  fontFamily: fontBase,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#78716C',
                  margin: '0 0 16px 0',
                  lineHeight: '1.5',
                }}
              >
                No sales yesterday. The system is working.
              </Text>
            ) : (
              <>
                {/* Hero stats row */}
                <Row style={{ marginBottom: '16px' }}>
                  <Column style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F5F5F4', borderRadius: '8px' }}>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#1C1917',
                        margin: '0',
                        lineHeight: '1.2',
                      }}
                    >
                      {totalSales}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '12px',
                        fontWeight: 400,
                        color: '#78716C',
                        margin: '4px 0 0 0',
                        lineHeight: '1.4',
                      }}
                    >
                      Total sales
                    </Text>
                  </Column>
                  <Column style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F5F5F4', borderRadius: '8px' }}>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#1C1917',
                        margin: '0',
                        lineHeight: '1.2',
                      }}
                    >
                      {formatNZD(totalRevenueCents)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '12px',
                        fontWeight: 400,
                        color: '#78716C',
                        margin: '4px 0 0 0',
                        lineHeight: '1.4',
                      }}
                    >
                      Revenue (excl. GST)
                    </Text>
                  </Column>
                  <Column style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F5F5F4', borderRadius: '8px' }}>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#1C1917',
                        margin: '0',
                        lineHeight: '1.2',
                      }}
                    >
                      {formatNZD(totalGstCents)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '12px',
                        fontWeight: 400,
                        color: '#78716C',
                        margin: '4px 0 0 0',
                        lineHeight: '1.4',
                      }}
                    >
                      GST collected
                    </Text>
                  </Column>
                </Row>

                {/* Revenue by payment method */}
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
                  Revenue by payment method
                </Text>
                {revenueByMethod.map((entry, i) => (
                  <Row key={i}>
                    <Column>
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#1C1917',
                          margin: '2px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {entry.method}
                      </Text>
                    </Column>
                    <Column align="right">
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#1C1917',
                          margin: '2px 0',
                          lineHeight: '1.5',
                          textAlign: 'right',
                        }}
                      >
                        {formatNZD(entry.amountCents)}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </>
            )}
          </Section>

          {!isZeroSaleDay && topProducts.length > 0 && (
            <>
              <Hr style={{ borderColor: '#E7E5E4', margin: '16px 24px' }} />

              <Section style={{ padding: '0 24px' }}>
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
                  Top products
                </Text>
                {topProducts.map((product) => (
                  <Row key={product.rank}>
                    <Column style={{ width: '24px' }}>
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#78716C',
                          margin: '2px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {product.rank}.
                      </Text>
                    </Column>
                    <Column>
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#1C1917',
                          margin: '2px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {product.name}
                      </Text>
                    </Column>
                    <Column align="right">
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#78716C',
                          margin: '2px 0',
                          lineHeight: '1.5',
                          textAlign: 'right',
                        }}
                      >
                        {product.quantity} sold &middot; {formatNZD(product.revenueCents)}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            </>
          )}

          {lowStockItems.length >= 1 && (
            <>
              <Hr style={{ borderColor: '#E7E5E4', margin: '16px 24px' }} />

              <Section style={{ padding: '0 24px 8px 24px' }}>
                <Text
                  style={{
                    fontFamily: fontBase,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#DC2626',
                    margin: '0 0 8px 0',
                    lineHeight: '1.4',
                  }}
                >
                  Low stock &mdash; action needed
                </Text>
                <Row>
                  <Column>
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#78716C',
                        margin: '0 0 4px 0',
                        lineHeight: '1.4',
                      }}
                    >
                      Product
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text
                      style={{
                        fontFamily: fontBase,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#78716C',
                        margin: '0 0 4px 0',
                        lineHeight: '1.4',
                        textAlign: 'right',
                      }}
                    >
                      Stock / Threshold
                    </Text>
                  </Column>
                </Row>
                {lowStockItems.map((item, i) => (
                  <Row key={i}>
                    <Column>
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#1C1917',
                          margin: '2px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {item.name}
                      </Text>
                    </Column>
                    <Column align="right">
                      <Text
                        style={{
                          fontFamily: fontBase,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#DC2626',
                          margin: '2px 0',
                          lineHeight: '1.5',
                          textAlign: 'right',
                        }}
                      >
                        {item.currentStock} / {item.reorderThreshold}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            </>
          )}

          <EmailFooter
            storeAddress={storeAddress}
            storePhone={storePhone}
          />
        </Container>
      </Body>
    </Html>
  )
}
