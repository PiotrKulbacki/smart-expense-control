type ContactFormEmailParams = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildContactFormEmail(params: ContactFormEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subjectLine = params.subject.trim() || 'General inquiry';
  const subject = `[Kontakt] ${subjectLine}`;

  const text = [
    'New contact form message from Lyamo',
    '',
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    `Subject: ${subjectLine}`,
    '',
    'Message:',
    params.message,
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 16px;">New contact form message</h2>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(params.name)}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
      <p style="margin: 0 0 16px;"><strong>Subject:</strong> ${escapeHtml(subjectLine)}</p>
      <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(params.message)}</p>
    </div>
  `.trim();

  return { subject, html, text };
}
