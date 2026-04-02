import { Section, Text } from '@react-email/components'

type EmailHeaderProps = {
  storeName: string
  subtitle?: string
}

export function EmailHeader({ storeName, subtitle }: EmailHeaderProps) {
  return (
    <>
      <Section
        style={{
          backgroundColor: '#1E293B',
          padding: '20px 24px 0 24px',
        }}
      >
        <Text
          style={{
            fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
            fontSize: '20px',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
            lineHeight: '1.2',
          }}
        >
          {storeName}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: '#94A3B8',
              margin: '0 0 0 0',
              lineHeight: '1.4',
            }}
          >
            {subtitle}
          </Text>
        )}
      </Section>
      {/* Amber accent strip */}
      <Section
        style={{
          backgroundColor: '#1E293B',
          padding: '20px 24px 0 24px',
        }}
      >
        <div
          style={{
            height: '3px',
            backgroundColor: '#E67E22',
            margin: '0',
          }}
        />
      </Section>
    </>
  )
}
