import { Section, Row, Column, Hr, Text } from '@react-email/components'
import { formatNZD } from '@/lib/money'
import type { ReceiptLineItem } from '@/lib/receipt'

type LineItemTableProps = {
  items: ReceiptLineItem[]
  subtotalCents: number
  gstCents: number
  totalCents: number
  paymentMethod: string
}

export function LineItemTable({
  items,
  gstCents,
  totalCents,
  paymentMethod,
}: LineItemTableProps) {
  const fontBase = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"

  return (
    <Section style={{ padding: '0 24px' }}>
      {items.map((item, index) => (
        <div key={index}>
          <Row>
            <Column>
              <Text
                style={{
                  fontFamily: fontBase,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#1C1917',
                  margin: '4px 0',
                  lineHeight: '1.5',
                }}
              >
                {item.productName} × {item.quantity}
              </Text>
            </Column>
            <Column align="right">
              <Text
                style={{
                  fontFamily: fontBase,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#1C1917',
                  margin: '4px 0',
                  lineHeight: '1.5',
                  textAlign: 'right',
                }}
              >
                {formatNZD(item.lineTotalCents)}
              </Text>
            </Column>
          </Row>
          {item.discountCents > 0 && (
            <Row>
              <Column>
                <Text
                  style={{
                    fontFamily: fontBase,
                    fontSize: '12px',
                    fontWeight: 400,
                    color: '#E67E22',
                    margin: '0 0 4px 8px',
                    lineHeight: '1.4',
                  }}
                >
                  Discount: -{formatNZD(item.discountCents)}
                </Text>
              </Column>
            </Row>
          )}
        </div>
      ))}

      <Hr style={{ borderColor: '#E7E5E4', margin: '16px 0' }} />

      {/* GST row */}
      <Row>
        <Column>
          <Text
            style={{
              fontFamily: fontBase,
              fontSize: '14px',
              fontWeight: 400,
              color: '#1C1917',
              margin: '4px 0',
              lineHeight: '1.5',
            }}
          >
            GST (15%)
          </Text>
        </Column>
        <Column align="right">
          <Text
            style={{
              fontFamily: fontBase,
              fontSize: '14px',
              fontWeight: 400,
              color: '#1C1917',
              margin: '4px 0',
              lineHeight: '1.5',
              textAlign: 'right',
            }}
          >
            {formatNZD(gstCents)}
          </Text>
        </Column>
      </Row>

      {/* Total row */}
      <Row>
        <Column>
          <Text
            style={{
              fontFamily: fontBase,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1C1917',
              margin: '4px 0',
              lineHeight: '1.4',
            }}
          >
            Total
          </Text>
        </Column>
        <Column align="right">
          <Text
            style={{
              fontFamily: fontBase,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1C1917',
              margin: '4px 0',
              lineHeight: '1.4',
              textAlign: 'right',
            }}
          >
            {formatNZD(totalCents)}
          </Text>
        </Column>
      </Row>

      {/* Payment method row */}
      <Row>
        <Column>
          <Text
            style={{
              fontFamily: fontBase,
              fontSize: '12px',
              fontWeight: 400,
              color: '#78716C',
              margin: '8px 0 0 0',
              lineHeight: '1.5',
            }}
          >
            Paid via {paymentMethod.toUpperCase()}
          </Text>
        </Column>
      </Row>
    </Section>
  )
}
