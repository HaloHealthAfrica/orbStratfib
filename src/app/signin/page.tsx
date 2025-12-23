import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-700">
          This app uses Auth.js. Configure a provider (recommended: GitHub OAuth) to enable sign-in.
        </p>

        <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-zinc-700">
          <div className="font-medium">If you enabled GitHub OAuth</div>
          <ol className="mt-2 list-decimal pl-5 text-sm">
            <li>Set `GITHUB_ID` and `GITHUB_SECRET` in Vercel env vars</li>
            <li>Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL`</li>
            <li>
              Visit{" "}
              <a className="text-blue-700 hover:underline" href="/api/auth/signin">
                /api/auth/signin
              </a>{" "}
              to continue
            </li>
          </ol>
        </div>

        <div className="mt-6 text-sm">
          <Link className="text-blue-700 hover:underline" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}


