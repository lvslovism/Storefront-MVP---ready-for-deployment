import { getAnnouncements } from '@/lib/cms'
import AnnouncementBar from './AnnouncementBar'
import PopupModal from './PopupModal'

export default async function AnnouncementBarServer() {
  const announcements = await getAnnouncements()
  if (!announcements || announcements.length === 0) return null

  // Separate bar (static/marquee) from popup
  const barAnnouncements = announcements.filter(
    (a: any) => a.display_mode === 'static' || a.display_mode === 'marquee' || !a.display_mode
  )
  const popupAnnouncements = announcements.filter(
    (a: any) => a.display_mode === 'popup'
  )

  // Only take the first popup (lowest sort_order)
  const popupAnnouncement = popupAnnouncements.length > 0 ? popupAnnouncements[0] : null

  return (
    <>
      {barAnnouncements.length > 0 && (
        <AnnouncementBar announcements={barAnnouncements} />
      )}
      {popupAnnouncement && (
        <PopupModal announcement={popupAnnouncement} />
      )}
    </>
  )
}
