/**
 * Root of the interface: holds where the user is (navigation in state, not
 * in the URL) and renders that page inside its layout.
 *
 * State: the current route (page + its typed parameters), the notice handed
 * over by the last navigation, and a counter. Every navigation replaces all
 * three, so a notice is shown on its destination page once: the next
 * navigation (with or without its own notice) replaces it. The counter is the
 * page's key, so each navigation mounts the page afresh and its hook loads
 * again — even when going to the same page.
 */
import { useCallback, useState } from 'react'
import { MainLayout } from './layouts/main_layout/MainLayout'
import { NAVIGATION, START_ROUTE, type Navigate, type PageKey, type PageParams, type Route } from './navigation'

type Shown = { route: Route; notice: string | null; visit: number }

export function AppRoot() {
  const [shown, setShown] = useState<Shown>({ route: START_ROUTE, notice: null, visit: 0 })
  const navigate: Navigate = useCallback((to, notice) => setShown((s) => ({ route: to, notice, visit: s.visit + 1 })), [])
  const { route, notice, visit } = shown

  return (
    <MainLayout current={NAVIGATION[route.page].section} navigate={navigate}>
      <PageOf key={visit} page={route.page} params={route.params} navigate={navigate} notice={notice} />
    </MainLayout>
  )
}

// Renders the component of a page with its own parameters (NAVIGATION ties
// each page to a component taking exactly PageParams of that page).
function PageOf<K extends PageKey>({ page, params, navigate, notice }: { page: K; params: PageParams[K]; navigate: Navigate; notice: string | null }) {
  const Page = NAVIGATION[page].component
  return <Page params={params} navigate={navigate} notice={notice} />
}
