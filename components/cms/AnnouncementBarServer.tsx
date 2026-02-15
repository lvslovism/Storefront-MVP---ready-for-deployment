import { getAnnouncements } from '@/lib/cms'
import AnnouncementBar from './AnnouncementBar'

export default async function AnnouncementBarServer() {
  const announcements = await getAnnouncements()
  if (!announcements || announcements.length === 0) return null
  return <AnnouncementBar announcements={announcements} />
}
