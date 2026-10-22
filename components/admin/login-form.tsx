"use client";

import { useState } from "react";
import { loginAction } from "@/app/admin/actions";
import { NavIcon } from "./icons";
import { Banner, Field, btnPrimary, inputClass } from "./ui";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    try {
      // On success loginAction redirects; a returned value means it failed.
      const result = await loginAction(username, password);
      if (!result.ok) setMessage(result.message ?? "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {message ? <Banner tone="error">{message}</Banner> : null}

      <Field label="Username" htmlFor="username">
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          className={inputClass}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={`${inputClass} pr-11`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Sembunyikan password" : "Perlihatkan password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition focus:outline-none"
          >
            <NavIcon name={showPassword ? "eyeOff" : "eye"} className="h-5 w-5" />
          </button>
        </div>
      </Field>

      <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
