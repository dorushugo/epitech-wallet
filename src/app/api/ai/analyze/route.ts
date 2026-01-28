import { streamText } from 'ai'
import { scalewayModel, FINANCIAL_ANALYSIS_SYSTEM_PROMPT } from '@/lib/scaleway-ai'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getUserFromRequest(request)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Récupérer les wallets de l'utilisateur
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        balance: true,
        currency: true,
      },
    })

    // Récupérer les transactions récentes (30 derniers jours)
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
        id: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        description: true,
        fraudScore: true,
        isInterWallet: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Calculer des statistiques (convertir Decimal en number)
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0)
    const successfulTx = transactions.filter((t) => t.status === 'SUCCESS')
    const pendingOrReviewTx = transactions.filter((t) => t.status === 'REVIEW' || t.status === 'PENDING')
    const blockedTx = transactions.filter((t) => t.status === 'BLOCKED')
    
    // Calculs détaillés
    const deposits = successfulTx.filter((t) => t.type === 'DEPOSIT')
    const withdrawals = successfulTx.filter((t) => t.type === 'WITHDRAWAL')
    const transfers = successfulTx.filter((t) => t.type === 'TRANSFER')
    
    const totalDeposits = deposits.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalTransfers = transfers.reduce((sum, t) => sum + Number(t.amount), 0)
    
    const highRiskTx = transactions.filter(
      (t) => t.fraudScore !== null && t.fraudScore >= 50
    )

    // Calcul de la fréquence moyenne des transactions
    const txFrequency = transactions.length > 0 ? (30 / transactions.length).toFixed(1) : 'N/A'

    // Construire le contexte pour l'IA
    const userContext = `
## INFORMATIONS UTILISATEUR
- Prénom: ${user.firstName || 'Utilisateur'}
- Nom: ${user.lastName || ''}
- Membre depuis: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'Inconnu'}

## PORTEFEUILLES (${wallets.length})
${wallets.map((w) => `- ${w.name}: ${Number(w.balance).toFixed(2)} ${w.currency}`).join('\n')}
**Solde total: ${totalBalance.toFixed(2)} EUR**

## ACTIVITÉ DES 30 DERNIERS JOURS

### Vue d'ensemble
- Nombre total de transactions: ${transactions.length}
- Transactions réussies: ${successfulTx.length}
- Transactions en attente/review: ${pendingOrReviewTx.length}
- Transactions bloquées: ${blockedTx.length}
- Fréquence moyenne: 1 transaction tous les ${txFrequency} jours

### Flux financiers
| Type | Nombre | Montant total |
|------|--------|---------------|
| Dépôts | ${deposits.length} | +${totalDeposits.toFixed(2)} € |
| Retraits | ${withdrawals.length} | -${totalWithdrawals.toFixed(2)} € |
| Transferts envoyés | ${transfers.length} | ${totalTransfers.toFixed(2)} € |

**Bilan net sur 30j: ${(totalDeposits - totalWithdrawals - totalTransfers).toFixed(2)} €**

### Détail des transactions
${transactions
  .slice(0, 20)
  .map(
    (t) =>
      `- [${t.status}] ${t.type}: ${Number(t.amount).toFixed(2)} ${t.currency} - "${t.description || 'Sans description'}"${t.fraudScore && t.fraudScore > 0 ? ` ⚠️ Score fraude: ${t.fraudScore}/100` : ''}`
  )
  .join('\n')}

${
  highRiskTx.length > 0
    ? `
### ⚠️ ALERTES SÉCURITÉ
${highRiskTx.length} transaction(s) à risque détectée(s):
${highRiskTx.map((t) => `- ${t.type} de ${Number(t.amount).toFixed(2)} ${t.currency} - Score de fraude: ${t.fraudScore}/100 - "${t.description || 'Sans description'}"`).join('\n')}
`
    : '### ✅ SÉCURITÉ\nAucune transaction suspecte détectée.'
}
`

    // Stream la réponse de l'IA
    const result = streamText({
      model: scalewayModel,
      system: FINANCIAL_ANALYSIS_SYSTEM_PROMPT,
      prompt: `Voici les données financières de ${user.firstName || 'cet utilisateur'}. Analyse-les et fournis-lui une analyse personnalisée en suivant la structure demandée (profil persona, bilan, conseils). Adresse-toi directement à lui/elle avec bienveillance.

${userContext}`,
      maxTokens: 1500,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('AI Analysis error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur lors de l\'analyse IA' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
