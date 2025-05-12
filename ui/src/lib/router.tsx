import { createBrowserRouter, Outlet } from 'react-router-dom'
import Home from '@/pages/Home'
import ProfileFeed from '@/pages/ProfileFeed'
import NewProfile from '@/pages/NewProfile'
import EditProfile from '@/pages/EditProfile'

function RootLayout() {
  return (
    <div className="min-h-screen bg-background mx-auto max-w-7xl py-8 justify-center flex">
      <Outlet />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/profiles/:profileId',
        element: <ProfileFeed />,
      },
      {
        path: '/profiles/new',
        element: <NewProfile />,
      },
      {
        path: '/profiles/:profileId/edit',
        element: <EditProfile />,
      },
    ],
  },
]) 