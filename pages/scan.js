import React, { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import styles from './scan/Scan.module.css'

export default function ScanPage() {
	const router = useRouter()
	const { data: session, status } = useSession()
	const [step, setStep] = useState('initial') // initial, camera, preview, processing
	const [image, setImage] = useState(null)
	const [previewUrl, setPreviewUrl] = useState(null)
	const [error, setError] = useState(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const fileInputRef = useRef(null)

	const handleFileSelect = e => {
		const file = e.target.files[0]
		if (file) {
			if (file.type.startsWith('image/')) {
				setImage(file)
				setPreviewUrl(URL.createObjectURL(file))
				setStep('preview')
				setError(null)
			} else {
				setError('Proszę wybrać plik obrazu')
			}
		}
	}

	const handleCameraCapture = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true })
			// Tutaj można dodać logikę do obsługi strumienia wideo
			setStep('camera')
		} catch (error) {
			setError('Nie udało się uzyskać dostępu do kamery')
			console.error('Błąd dostępu do kamery:', error)
		}
	}

	const handleProcessImage = async () => {
		if (!image) {
			setError('Nie wybrano obrazu')
			return
		}

		setIsProcessing(true)
		setError(null)

		try {
			const formData = new FormData()
			formData.append('receipt', image)

			const response = await fetch('/api/receipts/scan', {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (data.success) {
				router.push(`/expenses/add?data=${encodeURIComponent(JSON.stringify(data.data))}`)
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError('Nie udało się przetworzyć paragonu')
			console.error('Błąd przetwarzania paragonu:', error)
		} finally {
			setIsProcessing(false)
		}
	}

	const handleCancel = () => {
		setStep('initial')
		setImage(null)
		setPreviewUrl(null)
		setError(null)
	}

	if (status === 'loading') {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie...</p>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	return (
		<div className={styles.container}>
			<Card className={styles.scanContainer}>
				{step === 'initial' && (
					<div className={styles.initialView}>
						<p className={styles.initialText}>Zeskanuj paragon lub wybierz zdjęcie z galerii, aby dodać nowy wydatek</p>
						<div className={styles.buttonGroup}>
							<Button onClick={() => fileInputRef.current?.click()}>Wybierz z galerii</Button>
							<Button onClick={handleCameraCapture} variant="outline">
								Zrób zdjęcie
							</Button>
							<input
								type="file"
								ref={fileInputRef}
								onChange={handleFileSelect}
								accept="image/*"
								style={{ display: 'none' }}
							/>
						</div>
					</div>
				)}

				{step === 'camera' && (
					<div className={styles.cameraContainer}>
						<div className={styles.cameraMock}>
							<p className={styles.cameraText}>Kamera</p>
							<p className={styles.cameraSubtext}>Funkcja aparatu nie jest jeszcze dostępna w wersji webowej</p>
						</div>
						<div className={styles.cameraControls}>
							<Button onClick={handleCancel} variant="outline">
								Anuluj
							</Button>
						</div>
					</div>
				)}

				{step === 'preview' && (
					<div className={styles.previewContainer}>
						<h2 className={styles.previewTitle}>Podgląd paragonu</h2>
						<div className={styles.imagePreview}>
							{previewUrl ? (
								<img src={previewUrl} alt="Paragon" className={styles.previewImage} />
							) : (
								<div className={styles.mockImage}>
									<p className={styles.mockImageText}>Nie wybrano obrazu</p>
								</div>
							)}
						</div>

						{error && (
							<div className={styles.errorContainer}>
								<p className={styles.errorText}>{error}</p>
							</div>
						)}

						<div className={styles.buttonGroup}>
							<Button onClick={handleProcessImage} disabled={isProcessing || !image}>
								{isProcessing ? 'Przetwarzanie...' : 'Przetwórz paragon'}
							</Button>
							<Button onClick={handleCancel} variant="outline">
								Anuluj
							</Button>
						</div>
					</div>
				)}
			</Card>
		</div>
	)
}
