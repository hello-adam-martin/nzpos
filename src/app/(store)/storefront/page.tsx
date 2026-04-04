// Internal rewrite target for subdomain "/" requests.
// The middleware rewrites "/" on store subdomains to "/storefront" so this page
// renders inside the (store) layout instead of conflicting with the root page.tsx.
// This file re-exports the store homepage — all logic lives in (store)/page.tsx.

import StorePage from '../page'

export const dynamic = 'force-dynamic'

export default StorePage
