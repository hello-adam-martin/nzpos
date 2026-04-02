export default function StoreNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Store not found</h1>
        <p className="mt-4 text-lg text-gray-600">
          The store you are looking for does not exist or is no longer active.
        </p>
      </div>
    </div>
  )
}
