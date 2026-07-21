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
  const subjectLine = params.subject.trim() || 'Zapytanie ogólne';
  const subject = `[Kontakt] ${subjectLine}`;

  const text = [
    'Nowa wiadomość z formularza kontaktowego Lyamo',
    '',
    `Imię i nazwisko: ${params.name}`,
    `E-mail: ${params.email}`,
    `Temat: ${subjectLine}`,
    '',
    'Wiadomość:',
    params.message,
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 16px;">Nowa wiadomość z formularza kontaktowego</h2>
      <p style="margin: 0 0 8px;"><strong>Imię i nazwisko:</strong> ${escapeHtml(params.name)}</p>
      <p style="margin: 0 0 8px;"><strong>E-mail:</strong> ${escapeHtml(params.email)}</p>
      <p style="margin: 0 0 16px;"><strong>Temat:</strong> ${escapeHtml(subjectLine)}</p>
      <p style="margin: 0 0 8px;"><strong>Wiadomość:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(params.message)}</p>
    </div>
  `.trim();

  return { subject, html, text };
}
