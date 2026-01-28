import { generateObject } from 'ai'
import { z } from 'zod'
import { scalewayModel } from '@/lib/scaleway-ai'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Schéma Zod pour le persona financier
const PersonaSchema = z.object({
  type: z.enum([
    'econome_prudent',
    'stratege_equilibre',
    'dynamique_actif',
    'investisseur_audacieux',
    'tranquille_serein',
    'profil_a_surveiller',
  ]),
  emoji: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  strengths: z.array(z.string()).max(3),
  improvements: z.array(z.string()).max(2),
  riskLevel: z.enum(['low', 'medium', 'high']),
  activityLevel: z.enum(['low', 'medium', 'high']),
  savingsScore: z.number().min(0).max(100),
})

export type PersonaType = z.infer<typeof PersonaSchema>

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer les données
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, balance: true, currency: true },
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { sourceWallet: { userId: user.id } },
          { destinationWallet: { userId: user.id } },
        ],
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        status: true,
        amount: true,
        fraudScore: true,
      },
    })

    // Calculs
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0)
    const successfulTx = transactions.filter((t) => t.status === 'SUCCESS')
    const deposits = successfulTx.filter((t) => t.type === 'DEPOSIT')
    const withdrawals = successfulTx.filter((t) => t.type === 'WITHDRAWAL')
    const highRiskTx = transactions.filter((t) => t.fraudScore && t.fraudScore >= 50)

    const totalDeposits = deposits.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + Number(t.amount), 0)

    const context = `
Utilisateur: ${user.firstName || 'Utilisateur'}
Solde total: ${totalBalance.toFixed(2)} €
Transactions (30j): ${transactions.length}
Dépôts: ${deposits.length} (+${totalDeposits.toFixed(2)} €)
Retraits: ${withdrawals.length} (-${totalWithdrawals.toFixed(2)} €)
Transactions à risque: ${highRiskTx.length}
Bilan net: ${(totalDeposits - totalWithdrawals).toFixed(2)} €
`

    const { object: persona } = await generateObject({
      model: scalewayModel,
      schema: PersonaSchema,
      prompt: `Analyse ce profil financier et génère un persona utilisateur.

${context}

Types de persona disponibles:
- econome_prudent (🦉): dépenses maîtrisées, épargne régulière
- stratege_equilibre (🦊): bon équilibre entrées/sorties
- dynamique_actif (🐆): beaucoup de transactions, vie financière active
- investisseur_audacieux (🦅): gros montants, prises de risques
- tranquille_serein (🐢): peu d'activité, stabilité
- profil_a_surveiller (⚠️): comportements à risque détectés

Génère un objet JSON avec:
- type: le type de persona
- emoji: l'emoji correspondant
- title: le titre du profil (ex: "L'Économe prudent")
- subtitle: une phrase courte décrivant le profil en tutoyant l'utilisateur
- description: 2 phrases max expliquant pourquoi ce profil, en tutoyant
- strengths: 2-3 points forts (phrases courtes)
- improvements: 1-2 axes d'amélioration (phrases courtes)
- riskLevel: low/medium/high
- activityLevel: low/medium/high
- savingsScore: score d'épargne de 0 à 100`,
    })

    return NextResponse.json({ success: true, persona })
  } catch (error) {
    console.error('Persona generation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du persona' },
      { status: 500 }
    )
  }
}
