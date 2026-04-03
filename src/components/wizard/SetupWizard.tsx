'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStepIndicator } from './WizardStepIndicator'
import { StoreNameStep } from './StoreNameStep'
import { LogoBrandStep } from './LogoBrandStep'
import { FirstProductStep } from './FirstProductStep'
import { WizardCompletion } from './WizardCompletion'

interface StoreData {
  name: string | null
  slug: string
  logo_url: string | null
  primary_color: string | null
  setup_completed_steps: number
}

interface Category {
  id: string
  name: string
}

interface Props {
  initialStep: 1 | 2 | 3 | 4
  storeData: StoreData
  categories: Category[]
}

/** Derive initial completedSteps array from bitmask */
function derivedCompletedSteps(bitmask: number): number[] {
  const steps: number[] = []
  if (bitmask & 1) steps.push(1)
  if (bitmask & 2) steps.push(2)
  if (bitmask & 4) steps.push(3)
  return steps
}

/**
 * SetupWizard — client component orchestrating the 3-step wizard.
 * Handles step state, transitions (250ms slide), and completion redirect.
 */
export function SetupWizard({ initialStep, storeData, categories }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep)
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    derivedCompletedSteps(storeData.setup_completed_steps)
  )

  // Auto-redirect after completion screen
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step, router])

  const markComplete = (stepNum: 1 | 2 | 3) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNum) ? prev : [...prev, stepNum]
    )
  }

  const advanceStep = (from: 1 | 2 | 3) => {
    if (from === 1) setStep(2)
    else if (from === 2) setStep(3)
    else setStep(4)
  }

  const handleStep1Save = () => {
    markComplete(1)
    advanceStep(1)
  }

  const handleStep1Skip = () => {
    // Steps 1–2 skip just advances without saving
    advanceStep(1)
  }

  const handleStep2Save = () => {
    markComplete(2)
    advanceStep(2)
  }

  const handleStep2Skip = () => {
    advanceStep(2)
  }

  const handleStep3Save = () => {
    // saveProductStep + dismissWizard already called inside FirstProductStep
    markComplete(3)
    setStep(4)
  }

  const handleStep3Skip = () => {
    // dismissWizard already called inside FirstProductStep handleSkip
    setStep(4)
  }

  if (step === 4) {
    return <WizardCompletion />
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <WizardStepIndicator
        currentStep={step as 1 | 2 | 3}
        completedSteps={completedSteps}
      />

      {/* Step content — simple conditional render (no animation complexity that could break) */}
      {step === 1 && (
        <StoreNameStep
          storeName={storeData.name ?? ''}
          slug={storeData.slug}
          onSave={handleStep1Save}
          onSkip={handleStep1Skip}
        />
      )}
      {step === 2 && (
        <LogoBrandStep
          logoUrl={storeData.logo_url}
          primaryColor={storeData.primary_color}
          onSave={handleStep2Save}
          onSkip={handleStep2Skip}
        />
      )}
      {step === 3 && (
        <FirstProductStep
          categories={categories}
          onSave={handleStep3Save}
          onSkip={handleStep3Skip}
        />
      )}
    </div>
  )
}
