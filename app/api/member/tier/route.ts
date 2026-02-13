import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMemberTier, getTierConfigs, initMemberTier } from '@/lib/supabase';

/**
 * GET /api/member/tier
 *
 * 取得會員等級 + 升等進度
 */
export async function GET() {
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

    // ===== 取得會員等級 =====
    let tier = await getMemberTier(session.customer_id);

    // 如果還沒有等級記錄，嘗試初始化一個
    if (!tier) {
      tier = await initMemberTier(session.customer_id);
    }

    // 如果還是沒有（可能是 tier_config 不存在），回傳預設值（最低等級為 silver）
    if (!tier) {
      return NextResponse.json({
        success: true,
        tier: {
          level: 'silver',
          name: '白銀會員',
          points: 0,
          totalOrders: 0,
          totalSpent: 0,
          discountRate: 0,
          upgradedAt: null,
          expiresAt: null,
        },
        currentConfig: null,
        nextTier: null,
        progress: {
          percentage: 0,
          amountToNextTier: 0,
        },
      });
    }

    // ===== 取得等級設定 =====
    const tierConfigs = await getTierConfigs();

    // 找出當前等級的設定
    const currentTierConfig = tierConfigs.find(
      (config) => config.tier_level === tier!.tier_level
    );

    // 找出下一個等級（如果有的話）
    const currentIndex = tierConfigs.findIndex(
      (config) => config.tier_level === tier!.tier_level
    );
    const nextTierConfig =
      currentIndex >= 0 && currentIndex < tierConfigs.length - 1
        ? tierConfigs[currentIndex + 1]
        : null;

    // 計算升等進度
    let upgradeProgress = 100; // 如果沒有下一個等級，進度為 100%
    let amountToNextTier = 0;

    if (nextTierConfig) {
      const currentMin = currentTierConfig?.min_spent || 0;
      const nextMin = nextTierConfig.min_spent;
      const spent = tier.total_spent;

      // 計算在當前等級區間的進度
      const rangeTotal = nextMin - currentMin;
      const rangeProgress = spent - currentMin;
      upgradeProgress = Math.min(100, Math.max(0, (rangeProgress / rangeTotal) * 100));
      amountToNextTier = Math.max(0, nextMin - spent);
    }

    // 等級中文名稱對照（六級制）
    const tierNames: Record<string, string> = {
      silver: '白銀會員',
      gold: '黃金會員',
      platinum: '鉑金會員',
      diamond: '鑽石會員',
      elite: '頂級會員',
      throne: '王座會員',
    };

    return NextResponse.json({
      success: true,
      tier: {
        level: tier.tier_level,
        name: tierNames[tier.tier_level] || tier.tier_level,
        points: tier.tier_points,
        totalOrders: tier.total_orders,
        totalSpent: tier.total_spent,
        discountRate: tier.discount_rate,
        upgradedAt: tier.upgraded_at,
        expiresAt: tier.expires_at,
      },
      currentConfig: currentTierConfig
        ? {
            level: currentTierConfig.tier_level,
            name: tierNames[currentTierConfig.tier_level] || currentTierConfig.tier_name,
            minSpent: currentTierConfig.min_spent,
            pointsMultiplier: currentTierConfig.points_multiplier,
            birthdayPoints: currentTierConfig.birthday_points,
            monthlyCredits: currentTierConfig.monthly_credits,
          }
        : null,
      nextTier: nextTierConfig
        ? {
            level: nextTierConfig.tier_level,
            name: tierNames[nextTierConfig.tier_level] || nextTierConfig.tier_name,
            minSpent: nextTierConfig.min_spent,
            pointsMultiplier: nextTierConfig.points_multiplier,
            birthdayPoints: nextTierConfig.birthday_points,
            monthlyCredits: nextTierConfig.monthly_credits,
          }
        : null,
      progress: {
        percentage: Math.round(upgradeProgress),
        amountToNextTier,
      },
    });
  } catch (error) {
    console.error('[Tier GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
