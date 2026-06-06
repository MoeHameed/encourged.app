// Seeds sample accounts into the local Supabase instance.
// Run:  pnpm seed   (which is: node --env-file=.env.local scripts/seed.mjs)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error(
    "Missing env. Run with: node --env-file=.env.local scripts/seed.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const accounts = [
  { email: "alice@encouraged.test", password: "Password123!", name: "Alice" },
  { email: "bob@encouraged.test", password: "Password123!", name: "Bob" },
  { email: "carol@encouraged.test", password: "Password123!", name: "Carol" },
];

let created = 0;
for (const a of accounts) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
    user_metadata: { display_name: a.name },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      console.log(`•  ${a.email} already exists — skipping`);
      continue;
    }
    console.error(`✗  ${a.email}: ${error.message}`);
    continue;
  }

  // The handle_new_user trigger sets display_name from metadata, but set it
  // explicitly too so re-seeds and metadata changes stay consistent.
  if (data?.user?.id) {
    await supabase
      .from("profiles")
      .update({ display_name: a.name })
      .eq("id", data.user.id);
  }
  created += 1;
  console.log(`✓  created ${a.email}  (password: ${a.password})`);
}

console.log(
  `\nDone. ${created} new account(s). Log in at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/login`,
);
