import { Dashboard } from '@/components/Dashboard'
import { Header } from '@/components/Header'

// Server Component: the static shell renders on the server; only the
// interactive dashboard ships as client JavaScript.
export default function Home() {
    return (
        <main className="container mx-auto px-4 py-8 max-w-7xl">
            <Header />
            <Dashboard />
        </main>
    )
}
