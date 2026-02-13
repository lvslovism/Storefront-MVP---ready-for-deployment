import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMemberWallet, getWalletTransactions, initMemberWallet } from '@/lib/supabase';

/**
 * GET /api/member/wallet
 *
 * 取得購物金餘額 + 明細
 *
 * Query Params:
 * - limit?: number (預設 20)
 * - offset?: number (預設 0)
 */
export async function GET(request: NextRequest) {
  try {
    // ===== 驗證 Session =====
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      );
    }

    if (!session.customer_id) {
      return NextResponse.json(
        { success: false, error: '找不到會員資料' },
        { status: 404 }
      );
    }

    // ===== 解析 Query Params =====
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // ===== 取得錢包 =====
    let wallet = await getMemberWallet(session.customer_id);

    // 如果還沒有錢包，初始化一個
    if (!wallet) {
      wallet = await initMemberWallet(session.customer_id);
    }

    // 如果還是沒有，回傳預設值
    if (!wallet) {
      return NextResponse.json({
        success: true,
        wallet: {
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
        transactions: [],
      });
    }

    // ===== 取得交易紀錄 =====
    const transactions = await getWalletTransactions(wallet.id, limit);

    // 交易類型中文對照
    const typeNames: Record<string, string> = {
      earn: '獲得',
      spend: '使用',
      expire: '過期',
      adjust: '調整',
    };

    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        totalEarned: wallet.total_earned,
        totalSpent: wallet.total_spent,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        typeName: typeNames[tx.type] || tx.type,
        amount: tx.amount,
        balanceAfter: tx.balance_after,
        description: tx.description,
        referenceType: tx.reference_type,
        referenceId: tx.reference_id,
        expiresAt: tx.expires_at,
        createdAt: tx.created_at,
      })),
    });
  } catch (error) {
    console.error('[Wallet GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
