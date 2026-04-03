import ProvisioningScreen from '@/components/signup/ProvisioningScreen'

interface ProvisioningPageProps {
  searchParams: Promise<{ slug?: string; storeName?: string; status?: string }>
}

/**
 * Provisioning loading page — no card chrome, full-screen centered layout.
 * Route: /signup/provisioning
 * Per UI-SPEC Screen 2 + Screen 4.
 */
export default async function ProvisioningPage({ searchParams }: ProvisioningPageProps) {
  const params = await searchParams
  return (
    <ProvisioningScreen
      slug={params.slug}
      storeName={params.storeName}
      status={params.status}
    />
  )
}
