import LandingNav from '../components/LandingNav'
import LandingFooter from '../components/LandingFooter'

export default function AddOnsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </>
  )
}
