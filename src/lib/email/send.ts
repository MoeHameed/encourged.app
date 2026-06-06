type SendArgs = { to: string | string[]; subject: string; html: string };

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    const list = Array.isArray(to) ? to.join(", ") : to;
    console.log(`[email skipped — no RESEND_API_KEY] to=${list} subject="${subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email failed]", res.status, await res.text());
    }
  } catch (err) {
    console.error("[email error]", err);
  }
}
