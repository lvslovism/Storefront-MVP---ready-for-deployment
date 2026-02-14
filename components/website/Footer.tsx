import { config } from '@/lib/config';
import { getMerchantSettings, getSection } from '@/lib/cms';
import Link from 'next/link';

// Hardcoded fallback 連結
const defaultFooterLinks = [
  { label: '常見問題', url: '/faq' },
  { label: '配送說明', url: '/policy/shipping' },
  { label: '退換貨政策', url: '/policy/return' },
  { label: '隱私權政策', url: '/policy/privacy' },
  { label: '服務條款', url: '/policy/terms' },
];

export default async function WebsiteFooter() {
  // 並行讀取 merchant_settings 和 footer_info
  let merchantSettings: any = null;
  let footerInfo: any = null;

  try {
    [merchantSettings, footerInfo] = await Promise.all([
      getMerchantSettings(),
      getSection('home', 'footer_info'),
    ]);
  } catch (error) {
    console.error('[Footer] Error fetching data:', error);
  }

  // 聯絡資訊（merchant_settings → config fallback）
  const storeName = merchantSettings?.store_name || config.store.name;
  const email = merchantSettings?.contact_email || config.contact.email;
  const phone = merchantSettings?.contact_phone || config.contact.phone;
  const lineOA = merchantSettings?.line_oa_url || config.contact.lineOA;
  const facebook = merchantSettings?.facebook_url || config.contact.facebook;
  const instagram = merchantSettings?.instagram_url || config.contact.instagram;

  // 服務連結（footer_info CMS → hardcoded fallback）
  const footerLinks: { label: string; url: string }[] =
    footerInfo?.links && Array.isArray(footerInfo.links) && footerInfo.links.length > 0
      ? footerInfo.links
      : defaultFooterLinks;

  // 社群連結（footer_info CMS 覆蓋，若無則用 merchant_settings / config）
  const socialLineUrl = footerInfo?.social?.line_url || lineOA;
  const socialFacebookUrl = footerInfo?.social?.facebook_url || facebook;
  const socialInstagramUrl = footerInfo?.social?.instagram_url || instagram;

  // 年份動態化
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-gold/20 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 品牌資訊 */}
          <div>
            <h3 className="gold-text font-bold text-lg mb-4">{storeName}</h3>
            <p className="text-sm text-gray-400">{config.store.description}</p>
          </div>

          {/* 服務資訊 */}
          <div>
            <h3 className="text-gold font-bold text-lg mb-4">服務資訊</h3>
            <ul className="space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    className="text-gray-400 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 聯絡方式 */}
          <div>
            <h3 className="text-gold font-bold text-lg mb-4">聯絡我們</h3>
            <ul className="space-y-2 text-sm">
              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="text-gray-400 hover:text-gold transition-colors"
                  >
                    {email}
                  </a>
                </li>
              )}
              {phone && (
                <li>
                  <a
                    href={`tel:${phone}`}
                    className="text-gray-400 hover:text-gold transition-colors"
                  >
                    {phone}
                  </a>
                </li>
              )}
              {lineOA && (
                <li>
                  <a
                    href={lineOA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-line-green transition-colors"
                  >
                    LINE 官方帳號
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* 社群連結 */}
          <div>
            <h3 className="text-gold font-bold text-lg mb-4">追蹤我們</h3>
            <div className="flex space-x-4">
              {socialLineUrl && (
                <a
                  href={socialLineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-line-green transition-colors"
                  aria-label="LINE"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </a>
              )}
              {socialFacebookUrl && (
                <a
                  href={socialFacebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gold transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {socialInstagramUrl && (
                <a
                  href={socialInstagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gold transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 版權 — 年份動態化 + 店名從 merchant_settings */}
        <div className="border-t border-gold/20 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {year} {storeName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
