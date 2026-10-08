import { useEffect, useRef } from "react"
import Navbar from "@/components/Navbar"
import { useCloak } from "@/context/CloakContext"
import { useInView } from "@/hooks/useInView"
import Hero from "./components/Hero"
import DetectsSection from "./components/DetectsSection"
import PrivacySection from "./components/PrivacySection"
import Faq from "./components/Faq"
import ClosingCta from "./components/ClosingCta"
import Footer from "./components/Footer"

const NAVBAR_OFFSET = "-64px 0px 0px 0px"

export default function UploadPage() {
  const { reset } = useCloak()
  const heroLogoRef = useRef<HTMLDivElement>(null)
  const heroLogoInView = useInView(heroLogoRef, { initial: true, rootMargin: NAVBAR_OFFSET })

  useEffect(() => {
    reset()
  }, [reset])

  const handleChooseFromCta = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
    document.getElementById("file-input")?.click()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar overHero={heroLogoInView} />

      <main className="flex-1">
        <Hero logoRef={heroLogoRef} />
        <DetectsSection />
        <PrivacySection />
        <Faq />
        <ClosingCta onChoose={handleChooseFromCta} />
      </main>

      <Footer />
    </div>
  )
}
