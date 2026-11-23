// Run from the repo root: node scripts/emails.cjs
// Builds supabase/emails/*.html: one design, the text switches on the account's saved language
// ({{ .Data.lang }} = user_metadata.lang). Spanish when it's "es", English otherwise.
const fs = require('fs')
// "and" stops at an empty value, so accounts without a saved language get English instead of a template error
const pick = (es, en) => `{{ if and .Data.lang (eq .Data.lang "es") }}${es}{{ else }}${en}{{ end }}`
const page = (title, intro, button, note) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f3f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e1;border-radius:16px;">
        <tr><td style="padding:32px 32px 8px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
          <div style="font-size:24px;font-weight:700;letter-spacing:-0.04em;color:#18191b;">thock<span style="font-weight:400;color:#8a8b90;">type</span></div>
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#18191b;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;letter-spacing:-0.02em;">${pick(...title)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4b50;">${pick(...intro)}</p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#18191b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px;">${pick(...button)}</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8a8b90;">${pick('¿El botón no funciona? Copia este enlace en tu navegador:', "Button not working? Paste this link into your browser:")}<br><a href="{{ .ConfirmationURL }}" style="color:#4a4b50;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
          <p style="margin:0;padding-top:16px;border-top:1px solid #ececea;font-size:12px;line-height:1.6;color:#8a8b90;">${pick(...note)}<br>ThockType · <a href="https://thocktype.app" style="color:#8a8b90;">thocktype.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`
const emails = {
  'confirmar-cuenta': {
    subject: ['Confirma tu cuenta de ThockType', 'Confirm your ThockType account'],
    title: ['Confirma tu cuenta', 'Confirm your account'],
    intro: ['Gracias por unirte a ThockType. Confirma tu correo para guardar tus tests en la nube, aparecer en el ranking y competir en el reto diario.', 'Thanks for joining ThockType. Confirm your email to save your tests in the cloud, show up on the leaderboard and compete in the daily challenge.'],
    button: ['confirmar mi cuenta', 'confirm my account'],
    note: ['Si no creaste una cuenta en ThockType, ignora este correo.', "If you didn't create a ThockType account, you can ignore this email."],
  },
  'enlace-magico': {
    subject: ['Tu enlace para entrar a ThockType', 'Your ThockType sign-in link'],
    title: ['Tu enlace para entrar', 'Your sign-in link'],
    intro: ['Toca el botón para entrar a ThockType. El enlace funciona una sola vez y caduca en poco tiempo.', 'Tap the button to sign in to ThockType. The link works once and expires shortly.'],
    button: ['entrar a ThockType', 'sign in to ThockType'],
    note: ['Si no pediste este enlace, ignora este correo: nadie puede entrar sin él.', "If you didn't ask for this link, ignore this email: nobody can sign in without it."],
  },
  'cambiar-contrasena': {
    subject: ['Cambia tu contraseña de ThockType', 'Reset your ThockType password'],
    title: ['Cambia tu contraseña', 'Reset your password'],
    intro: ['Recibimos una solicitud para cambiar la contraseña de tu cuenta. Toca el botón para elegir una nueva.', 'We got a request to change your account password. Tap the button to choose a new one.'],
    button: ['elegir contraseña nueva', 'choose a new password'],
    note: ['Si no lo pediste tú, ignora este correo: tu contraseña actual sigue igual.', "If it wasn't you, ignore this email: your current password stays the same."],
  },
  'cambiar-correo': {
    subject: ['Confirma tu nuevo correo en ThockType', 'Confirm your new ThockType email'],
    title: ['Confirma tu nuevo correo', 'Confirm your new email'],
    intro: ['Pediste cambiar el correo de tu cuenta de ThockType a {{ .NewEmail }}. Confírmalo para terminar el cambio.', 'You asked to change your ThockType account email to {{ .NewEmail }}. Confirm it to finish the change.'],
    button: ['confirmar el cambio', 'confirm the change'],
    note: ['Si no pediste este cambio, ignora este correo y tu cuenta sigue con el correo de siempre.', "If you didn't ask for this change, ignore this email and your account keeps its current email."],
  },
}
const subjects = []
for (const [file, e] of Object.entries(emails)) {
  fs.writeFileSync(`supabase/emails/${file}.html`, page(e.title, e.intro, e.button, e.note))
  subjects.push(`${file}: ${pick(...e.subject)}`)
}
fs.writeFileSync('supabase/emails/asuntos.txt', `Subject (asunto) de cada plantilla en Supabase → Authentication → Emails → Templates:\n\n${subjects.join('\n')}\n`)
console.log(subjects.join('\n'))
