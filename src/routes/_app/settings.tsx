import { createFileRoute } from '@tanstack/react-router'

import { PeopleSection } from '@/components/people/people-section'
import { SettingsSection } from '@/components/settings/settings-layout'
import { UserSearchSettingsCard } from '@/components/settings/user-search-settings'
import { requireAdmin } from '@/lib/viewer'

export const Route = createFileRoute('/_app/settings')({
  beforeLoad: requireAdmin,
  component: Settings,
})

function Settings() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PeopleSection />
      <SettingsSection
        title="User permissions"
        description="What people with the User role can do. These apply to every user, including people you invite later. Admins are never restricted."
      >
        <UserSearchSettingsCard />
      </SettingsSection>
    </div>
  )
}
