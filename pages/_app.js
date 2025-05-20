import React from 'react'
import { SessionProvider } from 'next-auth/react'
import Layout from '../components/Layout'
import '../styles/globals.css'

function App({ Component, pageProps: { session, ...pageProps } }) {
	return (
		<SessionProvider session={session}>
			<Layout>
				<Component {...pageProps} />
			</Layout>
		</SessionProvider>
	)
}

export default App
