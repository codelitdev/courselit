import type { NextPage } from 'next'
import { useSession, signIn, signOut } from 'next-auth/react';

const Home: NextPage = () => {
  const { data: session } = useSession();

  const getUser = async () => {
    const response = await fetch('/api/graph', {
      method: 'POST',
      body: JSON.stringify({
        email: session!.user?.email
      })
    })
  }

  if (session) {
    return (
      <>
        {session.user?.email} 
        <button onClick={() => signOut()}>Sign out</button>
        <button onClick={getUser}>Get user</button>
      </>
    )
  }

  return (
    <>
      <button onClick={() => signIn()}>Sign in</button> 
    </>
  )
}

export default Home
