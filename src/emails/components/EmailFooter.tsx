import { Section, Text } from '@react-email/components'

type EmailFooterProps = {
  storeAddress: string
  storePhone: string
  openingHours?: string
}

export function EmailFooter({ storeAddress, storePhone, openingHours }: EmailFooterProps) {
  return (
    <Section
      style={{
        backgroundColor: '#FAFAF9',
        padding: '16px 24px',
      }}
    >
      <Text
        style={{
          fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
          fontSize: '12px',
          fontWeight: 400,
          color: '#78716C',
          margin: '0 0 4px 0',
          lineHeight: '1.5',
        }}
      >
        {storeAddress}
      </Text>
      <Text
        style={{
          fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
          fontSize: '12px',
          fontWeight: 400,
          color: '#78716C',
          margin: '0 0 4px 0',
          lineHeight: '1.5',
        }}
      >
        {storePhone}
      </Text>
      {openingHours && (
        <Text
          style={{
            fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
            fontSize: '12px',
            fontWeight: 400,
            color: '#78716C',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          {openingHours}
        </Text>
      )}
    </Section>
  )
}
