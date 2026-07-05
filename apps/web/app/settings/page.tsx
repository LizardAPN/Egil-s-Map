"use client";

import {
  useChangeEmail,
  useChangePassword,
  useCurrentUserAccount,
  useDeleteAccount,
  useUpdateUserSettings
} from "@imprint/api/users";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";

export default function SettingsPage() {
  const router = useRouter();
  const { data: account, isLoading } = useCurrentUserAccount();
  const changeEmail = useChangeEmail();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const updateSettings = useUpdateUserSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main className="app-page">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="app-page">
      <h1>Settings</h1>

      <section>
        <h2>Account</h2>
        <p className="app-muted">{account?.email}</p>
        <label className="app-field">
          <span>New email</span>
          <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); }} />
        </label>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await changeEmail.mutateAsync(email);
              setMessage("Check your inbox to confirm the new email.");
            } catch {
              setError("Couldn't update email.");
            }
          }}
        >
          Update email
        </Button>
        <label className="app-field">
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); }}
          />
        </label>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await changePassword.mutateAsync(password);
              setMessage("Password updated.");
            } catch {
              setError("Couldn't update password.");
            }
          }}
        >
          Update password
        </Button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Echoes</h2>
        <label className="app-field">
          <input
            type="checkbox"
            checked={account?.echoesEnabled ?? true}
            onChange={async (event) => {
              await updateSettings.mutateAsync({ echoesEnabled: event.target.checked });
            }}
          />{" "}
          Friend echo notifications
        </label>
      </section>

      <div className="app-auth-actions" style={{ marginTop: 32 }}>
        <Button
          variant="secondary"
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          Sign out
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await deleteAccount.mutateAsync();
            await signOut();
            router.replace("/");
          }}
        >
          Delete account
        </Button>
      </div>

      {message ? <p className="app-muted">{message}</p> : null}
      {error ? <p className="app-error">{error}</p> : null}
    </main>
  );
}
