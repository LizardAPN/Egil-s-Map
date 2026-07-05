import { formatAuthError } from "../../../lib/auth";
import { SignInForm } from "../../../components/auth/SignInForm";

interface SignInPageProps {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const initialError =
    params.error === "auth"
      ? params.error_description
        ? formatAuthError({ message: params.error_description })
        : "Couldn't finish signing in. Try again or use email and password."
      : null;

  return (
    <main className="app-page app-auth-page">
      <SignInForm initialError={initialError} />
    </main>
  );
}
