import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email-sender'

/**
 * Normalise un numéro de téléphone en format international pour un lien wa.me.
 * Heuristique : conserve les chiffres, gère le préfixe international,
 * et suppose la Belgique (+32) pour les numéros commençant par 0.
 */
function normalizePhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    // Numéro national -> préfixe Belgique
    digits = '32' + digits.slice(1)
  }
  digits = digits.replace(/\D/g, '')
  return digits.length >= 8 ? digits : null
}

function buildInvitationEmailHtml(params: {
  nomSousTraitant: string
  companyName: string
  portalUrl: string
}): string {
  const { nomSousTraitant, companyName, portalUrl } = params
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
    <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 14px 14px 0 0; padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px;">Votre espace ${companyName}</h1>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Portail sous-traitant</p>
    </div>
    <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 14px 14px; padding: 24px;">
      <p style="font-size: 15px; margin: 0 0 16px;">Bonjour ${nomSousTraitant},</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        Nous vous invitons à utiliser votre espace en ligne pour nous transmettre facilement vos informations :
        <strong>métrés</strong>, <strong>bons de régie</strong> et <strong>photos de chantier</strong>, et suivre leur traitement.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px;">
          Accéder à mon espace
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: #4b5563; margin: 0 0 8px;">
        Connectez-vous avec <strong>votre code PIN habituel</strong>. Si vous ne l'avez plus, contactez-nous et nous vous en communiquerons un nouveau.
      </p>
      <p style="font-size: 13px; color: #6b7280; margin: 16px 0 0; word-break: break-all;">
        Lien direct : <a href="${portalUrl}" style="color: #2563eb;">${portalUrl}</a>
      </p>
    </div>
  </div>`
}

// POST /api/sous-traitants/invitations
// Body: { soustraitantIds: string[] }
// Envoie un rappel (lien du portail, SANS code PIN) aux sous-traitants sélectionnés.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { soustraitantIds?: string[] }
    const ids = Array.isArray(body.soustraitantIds) ? body.soustraitantIds.filter(Boolean) : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Aucun sous-traitant sélectionné' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const [soustraitants, companySettings, pins] = await Promise.all([
      prisma.soustraitant.findMany({
        where: { id: { in: ids } },
        select: { id: true, nom: true, email: true, telephone: true },
      }),
      prisma.companysettings.findFirst(),
      prisma.publicAccessPIN.findMany({
        where: { subjectType: 'SOUSTRAITANT', subjectId: { in: ids }, estActif: true },
        select: { subjectId: true },
      }),
    ])

    const companyName = companySettings?.name || 'Secotech'
    const pinSet = new Set(pins.map((p) => p.subjectId))

    const results = await Promise.all(
      soustraitants.map(async (st) => {
        const portalUrl = `${baseUrl}/public/portail/soustraitant/${st.id}`
        const hasPin = pinSet.has(st.id)

        const waPhone = normalizePhoneForWhatsApp(st.telephone)
        const waText = `Bonjour ${st.nom}, voici le lien de votre espace ${companyName} pour nous transmettre vos métrés, bons de régie et photos : ${portalUrl} (connexion avec votre code PIN habituel).`
        const whatsappUrl = waPhone
          ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`
          : null

        let sent = false
        if (st.email) {
          const html = buildInvitationEmailHtml({
            nomSousTraitant: st.nom,
            companyName,
            portalUrl,
          })
          sent = await sendEmail(st.email, `Votre espace ${companyName} — accès portail`, html)
        }

        return {
          id: st.id,
          nom: st.nom,
          email: st.email || null,
          telephone: st.telephone || null,
          sent,
          hasPin,
          portalUrl,
          whatsappUrl,
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Erreur lors de l\'envoi des invitations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi des invitations' },
      { status: 500 }
    )
  }
}
