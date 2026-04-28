// =========================================================
// All4You Service München
// Supabase Edge Function: notify-new-request
// Sendet Team-E-Mail bei neuer Anfrage über Resend
// v4.4: Statuslink wird direkt in die E-Mail eingebaut
// =========================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function serviceLabel(service: string | null): string {
  const labels: Record<string, string> = {
    reinigung: "Reinigung",
    entruempelung: "Entrümpelung",
    rollerabholservice: "Rollerabholservice",
    anhaenger: "Anhängervermietung",
    allgemein: "Allgemein",
  };

  return labels[service || ""] || service || "Unbekannt";
}

function publicStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    neu: "Anfrage eingegangen",
    in_pruefung: "In Prüfung",
    rueckfrage_offen: "Rückfrage offen",
    angebot_vorbereitet: "Angebot wird vorbereitet",
    angebot_gesendet: "Angebot gesendet",
    termin_vorgeschlagen: "Termin vorgeschlagen",
    termin_bestaetigt: "Termin bestätigt",
    in_bearbeitung: "In Bearbeitung",
    erledigt: "Erledigt",
    storniert: "Storniert",
  };

  return labels[status || ""] || status || "Unbekannt";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || typeof details !== "object") return "";

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      const label = key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
      return `<tr><td style="vertical-align:top;padding:8px;border:1px solid #d8e7ef;"><b>${escapeHtml(label)}</b></td><td style="vertical-align:top;padding:8px;border:1px solid #d8e7ef;">${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`;
    })
    .join("");
}

function buildStatusUrl(siteUrl: string, ticketNumber: string): string {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");
  return `${cleanSiteUrl}/status?ticket=${encodeURIComponent(ticketNumber)}`;
}

async function sendResendEmail(
  resendApiKey: string,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const emailData = await emailResponse.json().catch(() => null);

  if (!emailResponse.ok) {
    throw new Error(emailData?.message || "Resend konnte die E-Mail nicht senden.");
  }

  return emailData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const teamEmail = Deno.env.get("TEAM_NOTIFICATION_EMAIL") || "itsfabtastisch@gmail.com";
    const fromEmail = Deno.env.get("EMAIL_FROM") || "All4You <onboarding@resend.dev>";
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://all4you.pages.dev";
    const sendCustomerConfirmation = (Deno.env.get("SEND_CUSTOMER_CONFIRMATION") || "false").toLowerCase() === "true";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!resendApiKey) throw new Error("RESEND_API_KEY fehlt.");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("SUPABASE_URL oder SUPABASE_ANON_KEY fehlt.");

    const body = await req.json().catch(() => null);
    const requestId = body?.request_id;
    const publicStatusToken = body?.public_status_token;

    if (!requestId || !publicStatusToken) {
      throw new Error("request_id oder public_status_token fehlt.");
    }

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_request_for_notification`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_request_id: requestId,
        p_public_status_token: publicStatusToken,
      }),
    });

    const rpcData = await rpcResponse.json();

    if (!rpcResponse.ok || !rpcData?.success) {
      throw new Error(rpcData?.message || "Anfrage konnte nicht geladen werden.");
    }

    const ticket = rpcData;
    const statusUrl = buildStatusUrl(siteUrl, ticket.ticket_number);
    const subject = `Neue Anfrage ${ticket.ticket_number} – ${serviceLabel(ticket.service)}`;

    const detailsRows = formatDetails(ticket.details);
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#09213f;max-width:760px">
        <h2 style="margin-bottom:8px">Neue Anfrage über All4You</h2>
        <p style="margin-top:0;color:#5f7284">Dieses Ticket wurde automatisch über die Webseite erstellt.</p>

        <div style="padding:16px;border-radius:14px;background:#eef8fa;border:1px solid #d8e7ef;margin:18px 0">
          <p style="margin:0 0 8px"><b>Ticket:</b> ${escapeHtml(ticket.ticket_number)}</p>
          <p style="margin:0 0 8px"><b>Leistung:</b> ${escapeHtml(serviceLabel(ticket.service))}</p>
          <p style="margin:0"><b>Status:</b> ${escapeHtml(publicStatusLabel(ticket.status))}</p>
        </div>

        <div style="padding:16px;border-radius:14px;background:#f7fbfd;border:1px solid #d8e7ef;margin:18px 0">
          <h3 style="margin-top:0">Statuslink</h3>
          <p>Der Kunde kann seinen Status später hier prüfen:</p>
          <p>
            <a href="${escapeHtml(statusUrl)}" style="display:inline-block;padding:11px 14px;border-radius:999px;background:#0aa99b;color:#fff;text-decoration:none;font-weight:bold">
              Status prüfen
            </a>
          </p>
          <p style="font-size:13px;color:#5f7284">
            Zur Sicherheit braucht der Kunde zusätzlich seine E-Mail-Adresse oder Telefonnummer aus der Anfrage.
          </p>
          <p style="font-size:13px;word-break:break-all;color:#5f7284">${escapeHtml(statusUrl)}</p>
        </div>

        <h3>Kunde</h3>
        <p>
          <b>Name:</b> ${escapeHtml(ticket.customer_name)}<br>
          <b>E-Mail:</b> ${escapeHtml(ticket.customer_email || "—")}<br>
          <b>Telefon:</b> ${escapeHtml(ticket.customer_phone || "—")}
        </p>

        <h3>Zusammenfassung</h3>
        <p>${escapeHtml(ticket.summary || ticket.subject || "Keine Zusammenfassung")}</p>

        ${ticket.message ? `<h3>Nachricht</h3><p>${escapeHtml(ticket.message)}</p>` : ""}
        ${detailsRows ? `<h3>Details</h3><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-color:#d8e7ef">${detailsRows}</table>` : ""}

        <hr style="border:none;border-top:1px solid #d8e7ef;margin:22px 0">
        <p style="font-size:13px;color:#5f7284">Diese E-Mail wurde automatisch vom All4You-System erzeugt.</p>
      </div>
    `;

    const text = [
      "Neue Anfrage über All4You",
      "",
      `Ticket: ${ticket.ticket_number}`,
      `Leistung: ${serviceLabel(ticket.service)}`,
      `Status: ${publicStatusLabel(ticket.status)}`,
      "",
      "Statuslink:",
      statusUrl,
      "Hinweis: Zur Sicherheit braucht der Kunde zusätzlich seine E-Mail-Adresse oder Telefonnummer aus der Anfrage.",
      "",
      "Kunde:",
      `Name: ${ticket.customer_name}`,
      `E-Mail: ${ticket.customer_email || "—"}`,
      `Telefon: ${ticket.customer_phone || "—"}`,
      "",
      "Zusammenfassung:",
      ticket.summary || ticket.subject || "Keine Zusammenfassung",
      "",
      ticket.message ? `Nachricht:\n${ticket.message}` : "",
    ].filter(Boolean).join("\n");

    const teamEmailData = await sendResendEmail(
      resendApiKey,
      fromEmail,
      teamEmail,
      subject,
      html,
      text,
    );

    let customerEmailData = null;
    let customerConfirmationError = null;

    if (sendCustomerConfirmation && ticket.customer_email) {
      const customerSubject = `Ihre Anfrage ${ticket.ticket_number} bei All4You`;
      const customerHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#09213f;max-width:680px">
          <h2>Ihre Anfrage ist eingegangen</h2>
          <p>Hallo ${escapeHtml(ticket.customer_name)},</p>
          <p>wir haben Ihre Anfrage erhalten und prüfen diese zeitnah.</p>
          <div style="padding:16px;border-radius:14px;background:#eef8fa;border:1px solid #d8e7ef;margin:18px 0">
            <p style="margin:0 0 8px"><b>Ticket:</b> ${escapeHtml(ticket.ticket_number)}</p>
            <p style="margin:0 0 8px"><b>Leistung:</b> ${escapeHtml(serviceLabel(ticket.service))}</p>
            <p style="margin:0"><b>Status:</b> ${escapeHtml(publicStatusLabel(ticket.status))}</p>
          </div>
          <p>Über den folgenden Link können Sie den Status später prüfen:</p>
          <p>
            <a href="${escapeHtml(statusUrl)}" style="display:inline-block;padding:11px 14px;border-radius:999px;background:#0aa99b;color:#fff;text-decoration:none;font-weight:bold">
              Status prüfen
            </a>
          </p>
          <p style="font-size:13px;color:#5f7284">
            Zur Sicherheit geben Sie dort zusätzlich Ihre E-Mail-Adresse oder Telefonnummer aus der Anfrage ein.
          </p>
        </div>
      `;

      const customerText = [
        "Ihre Anfrage ist eingegangen",
        "",
        `Ticket: ${ticket.ticket_number}`,
        `Leistung: ${serviceLabel(ticket.service)}`,
        `Status: ${publicStatusLabel(ticket.status)}`,
        "",
        "Status prüfen:",
        statusUrl,
        "",
        "Zur Sicherheit geben Sie dort zusätzlich Ihre E-Mail-Adresse oder Telefonnummer aus der Anfrage ein.",
      ].join("\n");

      try {
        customerEmailData = await sendResendEmail(
          resendApiKey,
          fromEmail,
          ticket.customer_email,
          customerSubject,
          customerHtml,
          customerText,
        );
      } catch (error) {
        customerConfirmationError = error instanceof Error ? error.message : "Kundenbestätigung konnte nicht gesendet werden.";
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Team-E-Mail wurde gesendet.",
      ticket_number: ticket.ticket_number,
      status_url: statusUrl,
      email_id: teamEmailData?.id || null,
      customer_email_id: customerEmailData?.id || null,
      customer_confirmation_error: customerConfirmationError,
      to: teamEmail,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
