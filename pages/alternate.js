import Link from 'next/link'
import styles from '../styles/Alternate.module.css'

export default function Alternate() {
	return (
		<div className={styles.container}>
			<h1 className={styles.text}>Alternate Page</h1>

			<Link href="/" className={styles.link}>
				Go Back
			</Link>
		</div>
	)
}
