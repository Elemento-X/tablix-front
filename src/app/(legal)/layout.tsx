import type { ReactNode } from 'react'
import { LegalLayoutContent } from './components/LegalLayoutContent'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <LegalLayoutContent>{children}</LegalLayoutContent>
}
