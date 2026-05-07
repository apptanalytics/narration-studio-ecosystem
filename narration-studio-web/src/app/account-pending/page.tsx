import Link from "next/link";

export default function AccountPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="card max-w-md p-6 text-center">
        <h1 className="text-3xl font-black">Admin Approval Required</h1>
        <p className="mt-3 text-neutral-600">Your email is verified, but an admin must approve your account before you can use Narration Studio.</p>
        <Link className="btn mt-5" href="/login">Back to login</Link>
      </div>
    </main>
  );
}
