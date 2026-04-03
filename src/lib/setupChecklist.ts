export interface ChecklistState {
  storeName: boolean
  logo: boolean
  firstProduct: boolean
  firstPosSale: boolean
  firstOnlineOrder: boolean
  allComplete: boolean
  dismissed: boolean
  completedCount: number
}

/**
 * Pure function — derives the 5-item setup checklist state from store data.
 * No DB calls; receives pre-fetched data as arguments.
 *
 * @param store - The store row (name, slug, logo_url, setup_wizard_dismissed)
 * @param productCount - Number of products in this store
 * @param orderChannels - Array of order channel values (may contain duplicates)
 */
export function getChecklistState(
  store: {
    name: string | null
    slug: string
    logo_url: string | null
    setup_wizard_dismissed: boolean
  },
  productCount: number,
  orderChannels: string[]
): ChecklistState {
  const storeName = !!store.name && store.name !== store.slug
  const logo = !!store.logo_url
  const firstProduct = productCount > 0
  const firstPosSale = orderChannels.includes('pos')
  const firstOnlineOrder = orderChannels.includes('online')

  const items = [storeName, logo, firstProduct, firstPosSale, firstOnlineOrder]

  return {
    storeName,
    logo,
    firstProduct,
    firstPosSale,
    firstOnlineOrder,
    allComplete: items.every(Boolean),
    dismissed: store.setup_wizard_dismissed,
    completedCount: items.filter(Boolean).length,
  }
}
