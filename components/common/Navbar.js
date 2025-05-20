import React from 'react'
import { Button } from '@rneui/base'
import { useRouter } from 'next/router'

const Navbar = () => {
	const router = useRouter()

	return <Button title="Wspólne Budżety" onPress={() => router.push('/shared-budgets')} icon="users" />
}

export default Navbar
