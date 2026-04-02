'use client'

import { useReducer, useState, useEffect, useRef } from 'react'
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { cartReducer, initialCartState, calcCartTotals, calcChangeDue } from '@/lib/cart'
import { formatNZD } from '@/lib/money'
import { completeSale } from '@/actions/orders/completeSale'
import { sendPosReceipt } from '@/actions/orders/sendPosReceipt'
import type { Database } from '@/types/database'
import { POSTopBar } from './POSTopBar'
import { NewOrderToast } from './NewOrderToast'
import { CategoryFilterBar } from './CategoryFilterBar'
import { ProductGrid } from './ProductGrid'
import { CartPanel } from './CartPanel'
import { DiscountSheet } from './DiscountSheet'
import { EftposConfirmScreen } from './EftposConfirmScreen'
import { CashEntryScreen } from './CashEntryScreen'
import { OutOfStockDialog } from './OutOfStockDialog'
import { ReceiptScreen } from './ReceiptScreen'
import type { ReceiptData } from '@/lib/receipt'

// Dynamically import BarcodeScannerSheet to prevent SSR issues (Quagga2 requires browser APIs)
const BarcodeScannerSheet = dynamic(
  () => import('./BarcodeScannerSheet').then((m) => ({ default: m.BarcodeScannerSheet })),
  { ssr: false }
)

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type StaffRow = { id: string; name: string; role: 'owner' | 'staff' }

type POSClientShellProps = {
  products: ProductRow[]
  categories: CategoryRow[]
  staffName: string
  staffRole: 'owner' | 'staff'
  storeName: string
  storeId: string
  staffList: StaffRow[]
}

export function POSClientShell({
  products,
  categories,
  staffName,
  staffRole,
  storeName,
  storeId,
  staffList,
}: POSClientShellProps) {
  const [cart, dispatch] = useReducer(cartReducer, initialCartState)
  const router = useRouter()

  // New order sound alert: polls every 30s, plays chime, manages badge and toast (NOTIF-06)
  const { unreadCount, toast, isMuted, toggleMute } = useNewOrderAlert()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Barcode scanner state
  const [scannerOpen, setScannerOpen] = useState(false)
  const scannerAudioCtxRef = useRef<AudioContext | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Discount sheet state
  const [discountTarget, setDiscountTarget] = useState<string | null>(null)

  // Out-of-stock override dialog state
  const [outOfStockProduct, setOutOfStockProduct] = useState<ProductRow | null>(null)

  // Sale completion state
  const [saleError, setSaleError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Split payment state: cash amount already collected before EFTPOS confirmation
  const [splitCashCents, setSplitCashCents] = useState<number | null>(null)

  // Track cash tendered for sale summary
  const [lastCashTenderedCents, setLastCashTenderedCents] = useState<number | null>(null)

  // Receipt data from last completed sale
  const [lastReceiptData, setLastReceiptData] = useState<ReceiptData | null>(null)

  // Auto-close discount sheet if target item was removed from cart
  useEffect(() => {
    if (discountTarget !== null) {
      const stillInCart = cart.items.some((i) => i.productId === discountTarget)
      if (!stillInCart) {
        setDiscountTarget(null)
      }
    }
  }, [cart.items, discountTarget])

  // Stock refresh on page focus (D-14, POS-08)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router])

  // Auto-reset after sale void (show brief toast, then reset)
  useEffect(() => {
    if (cart.phase === 'sale_void') {
      const timer = setTimeout(() => {
        dispatch({ type: 'NEW_SALE' })
        setSplitCashCents(null)
        setSaleError(null)
        setLastReceiptData(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [cart.phase])

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === null || product.category_id === selectedCategory
    const lowerSearch = search.toLowerCase()
    const matchesSearch =
      search === '' ||
      product.name.toLowerCase().includes(lowerSearch) ||
      (product.sku?.toLowerCase().includes(lowerSearch) ?? false)
    return matchesCategory && matchesSearch
  })

  // ---------------------------------------------------------------------------
  // Scanner open handler (creates AudioContext on user gesture for iOS beep)
  // ---------------------------------------------------------------------------

  function handleScanOpen() {
    // Create AudioContext on user gesture so iOS allows beep playback
    if (!scannerAudioCtxRef.current) {
      try {
        scannerAudioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {
        // AudioContext unavailable — scanner still works, just no beep
      }
    }
    setScannerOpen(true)
  }

  // Scanner is only available during idle phase (not during payment flows)
  const scannerAvailable = cart.phase === 'idle'

  // ---------------------------------------------------------------------------
  // Product add with out-of-stock check (D-12)
  // ---------------------------------------------------------------------------

  function handleAddToCart(product: ProductRow) {
    if (product.stock_quantity === 0) {
      if (staffRole === 'owner') {
        // Owner self-overrides per D-12 — add directly
        dispatch({ type: 'ADD_PRODUCT', product })
      } else {
        setOutOfStockProduct(product)
      }
      return
    }
    dispatch({ type: 'ADD_PRODUCT', product })
  }

  // ---------------------------------------------------------------------------
  // Discount apply
  // ---------------------------------------------------------------------------

  function handleApplyDiscount(
    discountCents: number,
    discountType: 'percentage' | 'fixed',
    reason?: string
  ) {
    if (discountTarget) {
      dispatch({ type: 'APPLY_LINE_DISCOUNT', productId: discountTarget, discountCents, discountType, reason })
      setDiscountTarget(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Sale completion
  // ---------------------------------------------------------------------------

  const totals = calcCartTotals(cart.items)

  async function handleCompleteSale(cashTenderedCents?: number, splitCash?: number) {
    setIsProcessing(true)
    setSaleError(null)

    let paymentMethod: 'eftpos' | 'cash' | 'split' = cart.paymentMethod ?? 'eftpos'
    let notes: string | undefined

    if (splitCash != null && splitCash > 0) {
      paymentMethod = 'split'
      notes = `Split: ${formatNZD(splitCash)} cash, ${formatNZD(totals.totalCents - splitCash)} EFTPOS`
    }

    // Track cash tendered for sale summary display
    const tenderedForSummary = cashTenderedCents ?? splitCash ?? null
    if (tenderedForSummary != null) {
      setLastCashTenderedCents(tenderedForSummary)
    }

    const result = await completeSale({
      channel: 'pos',
      status: 'completed',
      items: cart.items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        unit_price_cents: item.unitPriceCents,
        quantity: item.quantity,
        discount_cents: item.discountCents,
        line_total_cents: item.lineTotalCents,
        gst_cents: item.gstCents,
      })),
      subtotal_cents: totals.subtotalCents,
      gst_cents: totals.gstCents,
      total_cents: totals.totalCents,
      discount_cents: cart.items.reduce((s, i) => s + i.discountCents, 0),
      payment_method: paymentMethod,
      cash_tendered_cents: cashTenderedCents ?? splitCash,
      notes,
    })

    setIsProcessing(false)

    if ('error' in result) {
      if (result.error === 'out_of_stock') {
        setSaleError(
          `Out of stock — ${result.message ?? 'item was just sold'}. Please void this sale.`
        )
      } else {
        setSaleError(
          typeof result.error === 'string'
            ? result.error
            : 'Sale could not be recorded. Please try again or note the order manually.'
        )
      }
      // Reset phase so error is visible (stay on current overlay but show error)
      dispatch({ type: 'VOID_SALE' })
      return
    }

    if ('receiptData' in result && result.receiptData) {
      setLastReceiptData(result.receiptData as ReceiptData)
    }
    dispatch({ type: 'SALE_COMPLETE', orderId: result.orderId })
    router.refresh() // Refresh stock counts after sale (POS-08)
  }

  // ---------------------------------------------------------------------------
  // EFTPOS flow handlers
  // ---------------------------------------------------------------------------

  function handleEftposConfirm() {
    handleCompleteSale(undefined, splitCashCents ?? undefined)
  }

  function handleEftposVoid() {
    dispatch({ type: 'VOID_SALE' })
    setSplitCashCents(null)
  }

  // ---------------------------------------------------------------------------
  // Cash flow handlers
  // ---------------------------------------------------------------------------

  function handleCashComplete(tenderedCents: number) {
    handleCompleteSale(tenderedCents)
  }

  function handleCashSplit(cashAmount: number) {
    // Store the cash portion, then transition to EFTPOS confirmation for remainder
    setSplitCashCents(cashAmount)
    // Manually transition phase: set payment method to eftpos and initiate
    dispatch({ type: 'SET_PAYMENT_METHOD', method: 'eftpos' })
    dispatch({ type: 'INITIATE_PAYMENT' })
  }

  function handleCashCancel() {
    dispatch({ type: 'VOID_SALE' })
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  function handleLogout() {
    router.push('/pos/login')
  }

  // ---------------------------------------------------------------------------
  // Change due for sale summary (cash and split payments)
  // ---------------------------------------------------------------------------

  const changeDueCents = lastCashTenderedCents != null && lastCashTenderedCents >= totals.totalCents
    ? calcChangeDue(totals.totalCents, lastCashTenderedCents)
    : undefined

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="grid grid-cols-[1fr_400px] h-full">
      {/* Left panel: products */}
      <div className="flex flex-col h-full overflow-hidden">
        <POSTopBar
          storeName={storeName}
          staffName={staffName}
          onLogout={handleLogout}
          onScanOpen={handleScanOpen}
          scanDisabled={!scannerAvailable}
          unreadOrderCount={unreadCount}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
        <CategoryFilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="flex-1 overflow-y-auto">
          <ProductGrid
            products={filteredProducts}
            cart={cart}
            onAddToCart={handleAddToCart}
            staffRole={staffRole}
            search={search}
            onSearchChange={setSearch}
            searchInputRef={searchInputRef}
          />
        </div>
      </div>

      {/* Right panel: cart */}
      <CartPanel
        cart={cart}
        dispatch={dispatch}
        staffRole={staffRole}
        onOpenDiscount={(productId) => setDiscountTarget(productId)}
      />

      {/* ── Overlays ──────────────────────────────────────────────── */}

      {/* Barcode scanner overlay */}
      {scannerOpen && (
        <BarcodeScannerSheet
          audioContext={scannerAudioCtxRef.current}
          onProductFound={(product) => {
            handleAddToCart(product)
            // Scanner stays open — batch mode per D-02
          }}
          onClose={(hadError) => {
            setScannerOpen(false)
            if (hadError) {
              // Focus search bar for manual lookup per D-07
              setTimeout(() => searchInputRef.current?.focus(), 100)
            }
          }}
        />
      )}

      {/* Sale error banner (shown briefly after void) */}
      {saleError && cart.phase === 'sale_void' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-error text-white px-4 py-3 rounded-lg shadow-lg text-sm font-bold max-w-sm text-center">
          {saleError}
        </div>
      )}

      {/* Discount sheet */}
      {discountTarget !== null && (
        <DiscountSheet
          item={cart.items.find((i) => i.productId === discountTarget) ?? null}
          isOpen={discountTarget !== null}
          onClose={() => setDiscountTarget(null)}
          onApply={handleApplyDiscount}
        />
      )}

      {/* EFTPOS confirmation */}
      {cart.phase === 'eftpos_confirm' && (
        <EftposConfirmScreen
          totalCents={splitCashCents != null ? totals.totalCents - splitCashCents : totals.totalCents}
          onConfirm={handleEftposConfirm}
          onVoid={handleEftposVoid}
          isProcessing={isProcessing}
        />
      )}

      {/* Processing indicator (while completeSale is in flight) */}
      {isProcessing && (
        <div className="fixed inset-0 z-[55] bg-navy/80 flex items-center justify-center">
          <div className="text-white text-xl font-bold">Processing sale…</div>
        </div>
      )}

      {/* Cash entry */}
      {cart.phase === 'cash_entry' && (
        <CashEntryScreen
          totalCents={totals.totalCents}
          onComplete={handleCashComplete}
          onSplit={handleCashSplit}
          onCancel={handleCashCancel}
        />
      )}

      {/* Receipt screen (replaces SaleSummaryScreen) */}
      {cart.phase === 'sale_complete' && lastReceiptData && (
        <ReceiptScreen
          receiptData={lastReceiptData}
          onNewSale={() => {
            dispatch({ type: 'NEW_SALE' })
            setSplitCashCents(null)
            setLastCashTenderedCents(null)
            setSaleError(null)
            setLastReceiptData(null)
          }}
          onEmailCapture={async (email) => {
            await sendPosReceipt({ orderId: lastReceiptData.orderId, email })
          }}
          mode="pos"
        />
      )}

      {/* Fallback: sale complete but no receipt data (edge case) */}
      {cart.phase === 'sale_complete' && !lastReceiptData && cart.completedOrderId && (
        <div
          className="fixed inset-0 z-50 bg-navy-dark/80 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-6">
            <p className="text-xl font-bold text-text text-center">Sale Complete</p>
            <p className="text-sm text-text-muted text-center">
              Order #{cart.completedOrderId.slice(0, 8).toUpperCase()}
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'NEW_SALE' })
                setSplitCashCents(null)
                setLastCashTenderedCents(null)
                setSaleError(null)
              }}
              className="w-full min-h-[56px] bg-amber text-white text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              New Sale
            </button>
          </div>
        </div>
      )}

      {/* Out-of-stock override dialog */}
      {outOfStockProduct && (
        <OutOfStockDialog
          product={outOfStockProduct}
          staffRole={staffRole}
          storeId={storeId}
          staffList={staffList}
          onOverride={() => {
            dispatch({ type: 'ADD_PRODUCT', product: outOfStockProduct })
            setOutOfStockProduct(null)
          }}
          onCancel={() => setOutOfStockProduct(null)}
        />
      )}

      {/* New order toast notification (NOTIF-06) */}
      {toast && <NewOrderToast count={toast.count} totalCents={toast.totalCents} />}
    </div>
  )
}
