import nodemailer from 'nodemailer'

// Création du transporteur SMTP (configurable via variables d'environnement)
// Compatible : Gmail, Mailgun SMTP, Resend SMTP, Brevo, etc.
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  })
}

const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@gestock.app'
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export const emailService = {
  /**
   * Envoyer une alerte de stock bas à l'admin du tenant
   */
  async sendLowStockAlert(params: {
    to: string
    tenantName: string
    products: Array<{ name: string; sku: string; currentStock: number; minStock: number }>
  }) {
    const { to, tenantName, products } = params

    const productRows = products
      .map(
        (p) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 12px 16px; font-weight: 500; color: #111;">${p.name}</td>
          <td style="padding: 12px 16px; color: #6b7280; font-family: monospace;">${p.sku}</td>
          <td style="padding: 12px 16px; text-align:center; color: #ef4444; font-weight: 700;">${p.currentStock}</td>
          <td style="padding: 12px 16px; text-align:center; color: #6b7280;">${p.minStock}</td>
        </tr>`,
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; background:#f9fafb;">
        <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding:32px; text-align:center;">
            <h1 style="color:white; margin:0; font-size:24px; font-weight:700;">⚠️ Alerte Stock Bas</h1>
            <p style="color: rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">${tenantName}</p>
          </div>
          
          <!-- Body -->
          <div style="padding:32px;">
            <p style="color:#374151; font-size:15px; margin:0 0 24px;">
              Bonjour,<br><br>
              Les produits suivants ont atteint ou dépassé leur <strong>seuil de stock minimum</strong> et nécessitent votre attention :
            </p>
            
            <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; font-size:14px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:12px 16px; text-align:left; color:#6b7280; font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:.05em;">Produit</th>
                  <th style="padding:12px 16px; text-align:left; color:#6b7280; font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:.05em;">SKU</th>
                  <th style="padding:12px 16px; text-align:center; color:#6b7280; font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:.05em;">Stock actuel</th>
                  <th style="padding:12px 16px; text-align:center; color:#6b7280; font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:.05em;">Seuil minimum</th>
                </tr>
              </thead>
              <tbody>${productRows}</tbody>
            </table>
            
            <div style="margin:28px 0 0; text-align:center;">
              <a href="${APP_URL}/inventory" style="display:inline-block; background:#3b82f6; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:14px;">
                Gérer l'inventaire →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af; font-size:12px; margin:0;">
              Cet email a été envoyé automatiquement par GesStock · <a href="${APP_URL}/settings" style="color:#6b7280;">Gérer les notifications</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    if (!process.env.SMTP_USER) {
      console.log('[EmailService] SMTP non configuré — email simulé pour :', to)
      console.log(`  → ${products.length} produit(s) en alerte stock`)
      return { simulated: true }
    }

    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"GesStock Alertes" <${FROM_EMAIL}>`,
      to,
      subject: `⚠️ ${products.length} produit(s) en stock bas — ${tenantName}`,
      html,
    })

    return { sent: true, to }
  },

  /**
   * Email de bienvenue après invitation
   */
  async sendWelcomeEmail(params: {
    to: string
    firstName: string
    tenantName: string
    role: string
    password: string
  }) {
    const { to, firstName, tenantName, role, password } = params

    const roleLabel: Record<string, string> = {
      admin: 'Administrateur',
      manager: 'Manager',
      lecteur: 'Lecteur',
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; background:#f9fafb;">
        <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding:32px; text-align:center;">
            <h1 style="color:white; margin:0; font-size:24px; font-weight:700;">🎉 Bienvenue sur GesStock !</h1>
            <p style="color: rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">${tenantName}</p>
          </div>
          
          <div style="padding:32px;">
            <p style="color:#374151; font-size:15px;">
              Bonjour <strong>${firstName}</strong>,<br><br>
              Vous avez été invité(e) à rejoindre l'espace <strong>${tenantName}</strong> sur GesStock en tant que <strong>${roleLabel[role] || role}</strong>.
            </p>
            
            <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:20px; margin:24px 0;">
              <p style="margin:0 0 8px; color:#6b7280; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;">Vos identifiants</p>
              <p style="margin:4px 0; color:#111; font-size:14px;"><strong>Email :</strong> ${to}</p>
              <p style="margin:4px 0; color:#111; font-size:14px;"><strong>Mot de passe temporaire :</strong> <code style="background:#e5e7eb; padding:2px 6px; border-radius:4px;">${password}</code></p>
            </div>
            
            <p style="color:#6b7280; font-size:13px;">Changez votre mot de passe dès votre première connexion.</p>
            
            <div style="text-align:center; margin-top:28px;">
              <a href="${APP_URL}/login" style="display:inline-block; background:#10b981; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:14px;">
                Accéder à GesStock →
              </a>
            </div>
          </div>

          <div style="background:#f9fafb; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af; font-size:12px; margin:0;">GesStock — Gestion de stock pour les PME d'Afrique de l'Ouest</p>
          </div>
        </div>
      </body>
      </html>
    `

    if (!process.env.SMTP_USER) {
      console.log(`[EmailService] Welcome email simulé → ${to} (${firstName}, rôle: ${role})`)
      return { simulated: true }
    }

    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"GesStock" <${FROM_EMAIL}>`,
      to,
      subject: `Bienvenue sur GesStock — ${tenantName}`,
      html,
    })

    return { sent: true }
  },

  /**
   * Email de vérification d'adresse email
   */
  async sendVerificationEmail(params: {
    to: string
    firstName: string
    verificationToken: string
  }) {
    const { to, firstName, verificationToken } = params
    const verificationUrl = `${APP_URL}/auth/verify-email?token=${verificationToken}`

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; background:#f9fafb;">
        <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding:32px; text-align:center;">
            <h1 style="color:white; margin:0; font-size:24px; font-weight:700;">✉️ Vérifiez votre email</h1>
            <p style="color: rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">GesStock</p>
          </div>
          
          <!-- Content -->
          <div style="padding:32px;">
            <p style="color:#374151; font-size:15px; margin:0 0 16px;">
              Bonjour <strong>${firstName}</strong>,<br><br>
              Bienvenue sur GesStock ! Merci de vous être inscrit(e). Pour confirmer votre adresse email et activer votre compte, veuillez cliquer sur le bouton ci-dessous.
            </p>
            
            <div style="text-align:center; margin:32px 0;">
              <a href="${verificationUrl}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:600; font-size:15px;">
                Vérifier mon email →
              </a>
            </div>
            
            <p style="color:#6b7280; font-size:13px; margin:24px 0 0;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </p>
            <p style="color:#2563eb; font-size:12px; word-break:break-all; background:#f0f9ff; padding:12px; border-radius:6px; margin:8px 0;">
              ${verificationUrl}
            </p>
            
            <p style="color:#9ca3af; font-size:12px; margin:20px 0 0;">
              Ce lien expire dans <strong>24 heures</strong>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af; font-size:12px; margin:0;">GesStock — Gestion de stock pour les PME d'Afrique de l'Ouest</p>
          </div>
        </div>
      </body>
      </html>
    `

    if (!process.env.SMTP_USER) {
      console.log(
        `[EmailService] Verification email simulé → ${to} (token: ${verificationToken.slice(0, 10)}...)`,
      )
      return { simulated: true }
    }

    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"GesStock" <${FROM_EMAIL}>`,
      to,
      subject: 'Vérifiez votre email — GesStock',
      html,
    })

    return { sent: true }
  },
}
