import Link from "next/link";

export default function AccountDisabledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="card max-w-md p-6 text-center">
        <h1 className="text-3xl font-black">Account Disabled</h1>
        <p className="mt-3 text-neutral-600">Your Narration Studio account is disabled. Contact an administrator to restore access.</p>
        <Link className="btn mt-5" href="/login">Back to login</Link>
      </div>
    </main>
  );
}
