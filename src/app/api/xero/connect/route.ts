import { XeroClient } from 'xero-node'

export async function GET() {
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.settings',
      'offline_access',
    ],
  })

  const consentUrl = await xero.buildConsentUrl()
  return Response.redirect(consentUrl)
}
