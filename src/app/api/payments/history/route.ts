import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/payments/history - Historique des dépôts et cashouts
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 'deposit' | 'cashout'
    const status = searchParams.get('status') // 'pending' | 'succeeded' | 'failed' | 'paid'

    // Récupérer les dépôts (PaymentIntents)
    const depositWhere: Record<string, unknown> = { userId: user.id }
    if (status) depositWhere.status = status

    // Récupérer les cashouts (Payouts)
    const payoutWhere: Record<string, unknown> = { userId: user.id }
    if (status) payoutWhere.status = status

    const [deposits, payouts, depositCount, payoutCount] = await Promise.all([
      type !== 'cashout'
        ? prisma.paymentIntent.findMany({
            where: depositWhere,
            orderBy: { createdAt: 'desc' },
            skip: type === 'deposit' ? (page - 1) * limit : 0,
            take: type === 'deposit' ? limit : 1000,
            include: {
              wallet: { select: { id: true, name: true } },
            },
          })
        : [],
      type !== 'deposit'
        ? prisma.payout.findMany({
            where: payoutWhere,
            orderBy: { createdAt: 'desc' },
            skip: type === 'cashout' ? (page - 1) * limit : 0,
            take: type === 'cashout' ? limit : 1000,
            include: {
              wallet: { select: { id: true, name: true } },
            },
          })
        : [],
      type !== 'cashout' ? prisma.paymentIntent.count({ where: depositWhere }) : 0,
      type !== 'cashout' ? prisma.payout.count({ where: payoutWhere }) : 0,
    ])

    // Combiner et trier par date
    const allPayments = [
      ...deposits.map((d) => ({
        id: d.id,
        type: 'deposit' as const,
        amount: Number(d.amount),
        currency: d.currency,
        status: d.status,
        wallet: d.wallet,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        metadata: d.metadata,
      })),
      ...payouts.map((p) => ({
        id: p.id,
        type: 'cashout' as const,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.method,
        destination: p.destination.substring(0, 4) + '****', // Masquer les infos sensibles
        wallet: p.wallet,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        metadata: p.metadata,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Paginer si nécessaire
    const paginatedPayments =
      type === 'deposit' || type === 'cashout'
        ? allPayments
        : allPayments.slice((page - 1) * limit, page * limit)

    const total = type === 'deposit' ? depositCount : type === 'cashout' ? payoutCount : depositCount + payoutCount

    return NextResponse.json({
      success: true,
      payments: paginatedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get payments history error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
