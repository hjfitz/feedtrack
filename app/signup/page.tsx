import { redirect } from 'next/navigation'
import { AuthLink, SignupForm } from '@/components/auth-form'
import { getSessionHouseholdId } from '@/lib/server/auth'

export default async function SignupPage() {
  if (await getSessionHouseholdId()) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create account</h1>
          <p className="text-muted-foreground">Start tracking your little one</p>
        </div>
        <SignupForm />
        <div className="mt-8 flex flex-col gap-4 text-center">
          <AuthLink href="/login">Already have an account? Sign in</AuthLink>
        </div>
      </div>
    </div>
  )
}
