import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import styles from '../styles/Scan.module.css'

export default function ScanPage() {
	const router = useRouter()
	const { data: session, status } = useSession()
	const fileInputRef = useRef(null)
	const videoRef = useRef(null)
	const [step, setStep] = useState('initial')
	const [image, setImage] = useState(null)
	const [previewUrl, setPreviewUrl] = useState(null)
	const [error, setError] = useState(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isCameraActive, setIsCameraActive] = useState(false)
	const [processingStatus, setProcessingStatus] = useState('')
	const [processingProgress, setProcessingProgress] = useState(0)
	const [showManualEntry, setShowManualEntry] = useState(false)
	const [useEasyOCR, setUseEasyOCR] = useState(true)
	const [isPythonAvailable, setIsPythonAvailable] = useState(true)
	const [manualData, setManualData] = useState({
		store: '',
		date: new Date().toISOString().split('T')[0],
		totalAmount: '',
	})

	// Sprawdź czy Python i EasyOCR są dostępne
	useEffect(() => {
		// W trybie produkcyjnym na Vercel zakładamy, że Python jest dostępny
		if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
			fetch('/api/check-python', { method: 'GET' })
				.then(response => response.json())
				.then(data => {
					setIsPythonAvailable(data.pythonAvailable)
					if (!data.pythonAvailable) {
						setUseEasyOCR(false)
					}
				})
				.catch(err => {
					console.warn('Nie można sprawdzić dostępności Pythona:', err)
					setIsPythonAvailable(false)
					setUseEasyOCR(false)
				})
		}
	}, [])

	const handleFileSelect = event => {
		const file = event.target.files[0]
		if (file) {
			// Walidacja rozmiaru pliku
			if (file.size > 10 * 1024 * 1024) {
				// 10 MB limit
				setError('Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.')
				return
			}

			setImage(file)
			setPreviewUrl(URL.createObjectURL(file))
			setStep('preview')
			setError(null)
			setShowManualEntry(false)
		}
	}

	const handleCameraCapture = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
			videoRef.current.srcObject = stream
			setIsCameraActive(true)
			setStep('camera')
		} catch (error) {
			setError('Nie udało się uzyskać dostępu do kamery')
			console.error('Błąd dostępu do kamery:', error)
		}
	}

	const handleTakePhoto = () => {
		const video = videoRef.current
		const canvas = document.createElement('canvas')
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight

		const context = canvas.getContext('2d')
		context.drawImage(video, 0, 0, canvas.width, canvas.height)

		canvas.toBlob(
			blob => {
				const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' })
				setImage(file)
				setPreviewUrl(URL.createObjectURL(blob))
				setStep('preview')

				// Zatrzymaj strumień wideo
				const stream = video.srcObject
				if (stream) {
					stream.getTracks().forEach(track => track.stop())
				}
				setIsCameraActive(false)
			},
			'image/jpeg',
			0.8
		)
	}

	const handleProcessImage = async () => {
		if (!image) {
			setError('Nie wybrano obrazu')
			return
		}

		setIsProcessing(true)
		setError(null)
		setProcessingStatus('Przetwarzanie obrazu...')
		setProcessingProgress(10)

		try {
			const formData = new FormData()
			formData.append('receipt', image)
			// Używaj EasyOCR tylko jeśli jest dostępny
			formData.append('useEasyOCR', (useEasyOCR && isPythonAvailable).toString())

			const controller = new AbortController()
			// Timeout na 30 sekund
			const timeoutId = setTimeout(() => controller.abort(), 30000)

			const response = await fetch('/api/receipts/scan', {
				method: 'POST',
				body: formData,
				headers: {
					Accept: 'application/json',
				},
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				if (response.status === 413) {
					throw new Error('Plik jest zbyt duży')
				}

				const errorData = await response.json()
				throw new Error(errorData.message || 'Błąd podczas przetwarzania paragonu')
			}

			const data = await response.json()

			if (data.success) {
				if (data.confidence < 50 || !data.data.totalAmount) {
					setError('Niska jakość rozpoznawania tekstu. Zalecamy ręczne wprowadzenie danych.')
					setShowManualEntry(true)
					setManualData({
						store: data.data.store || '',
						date: data.data.date || new Date().toISOString().split('T')[0],
						totalAmount: data.data.totalAmount ? data.data.totalAmount.toString() : '',
					})
				} else {
					const redirectData = {
						...data.data,
						ocrConfidence: data.confidence,
					}
					router.push(`/expenses/add?data=${encodeURIComponent(JSON.stringify(redirectData))}`)
				}
			} else {
				throw new Error(data.message || 'Nie udało się przetworzyć paragonu')
			}
		} catch (error) {
			console.error('Błąd przetwarzania paragonu:', error)

			let errorMessage = 'Wystąpił błąd podczas przetwarzania paragonu.'

			if (error.name === 'AbortError') {
				errorMessage = 'Przekroczono limit czasu przetwarzania. Spróbuj z mniejszym obrazem lub wprowadź dane ręcznie.'
			} else if (error.message) {
				errorMessage = error.message
			}

			setError(errorMessage)
			setShowManualEntry(true) // Automatycznie pokaż formularz ręcznego wprowadzania
		} finally {
			setIsProcessing(false)
			setProcessingStatus('')
			setProcessingProgress(0)

			// Wyczyść pamięć URL obrazu podglądu
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}

	const handleManualSubmit = e => {
		e.preventDefault()

		if (!manualData.store || !manualData.date || !manualData.totalAmount) {
			setError('Wszystkie pola są wymagane')
			return
		}

		const totalAmount = parseFloat(manualData.totalAmount.replace(',', '.'))
		if (isNaN(totalAmount) || totalAmount <= 0) {
			setError('Nieprawidłowa kwota')
			return
		}

		const redirectData = {
			store: manualData.store,
			date: manualData.date,
			totalAmount: totalAmount,
			items: [],
			manualEntry: true,
		}

		router.push(`/expenses/add?data=${encodeURIComponent(JSON.stringify(redirectData))}`)
	}

	const handleCancel = () => {
		if (isCameraActive && videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject
			stream.getTracks().forEach(track => track.stop())
			setIsCameraActive(false)
		}
		setStep('initial')
		setImage(null)
		setPreviewUrl(null)
		setError(null)
		setShowManualEntry(false)
	}

	const renderScanningTips = () => (
		<div className={styles.tipsContainer}>
			<h3 className={styles.tipsTitle}>Wskazówki do skanowania:</h3>
			<ul className={styles.tipsList}>
				<li>Upewnij się, że paragon jest dobrze oświetlony</li>
				<li>Trzymaj telefon stabilnie i prostopadle do paragonu</li>
				<li>Unikaj cieni i odbić światła</li>
				<li>Upewnij się, że cały paragon jest widoczny i wyraźny</li>
			</ul>
		</div>
	)

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
						<h1 className={styles.title}>Skanowanie paragonu</h1>
						<p className={styles.description}>Zeskanuj paragon lub wybierz zdjęcie z galerii, aby dodać nowy wydatek</p>
						{renderScanningTips()}
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
								className={styles.hiddenInput}
							/>
						</div>

						<div className={styles.ocrEngineSelector}>
							<label className={styles.ocrRadioLabel}>
								<input type="radio" name="ocrEngine" checked={useEasyOCR} onChange={() => setUseEasyOCR(true)} />
								EasyOCR (dokładniejsze, ale wolniejsze)
							</label>
							<label className={styles.ocrRadioLabel}>
								<input type="radio" name="ocrEngine" checked={!useEasyOCR} onChange={() => setUseEasyOCR(false)} />
								Tesseract (szybsze, ale mniej dokładne)
							</label>
						</div>

						<div className={styles.manualEntryOption}>
							<Button
								onClick={() => {
									setStep('preview')
									setShowManualEntry(true)
								}}
								variant="text">
								Wprowadź dane ręcznie
							</Button>
						</div>
					</div>
				)}

				{step === 'camera' && (
					<div className={styles.cameraView}>
						<video ref={videoRef} autoPlay playsInline className={styles.cameraPreview} />
						<div className={styles.cameraControls}>
							<Button onClick={handleTakePhoto} className={styles.captureButton}>
								Zrób zdjęcie
							</Button>
							<Button onClick={handleCancel} variant="outline">
								Anuluj
							</Button>
						</div>
					</div>
				)}

				{step === 'preview' && !showManualEntry && (
					<div className={styles.previewView}>
						<h2 className={styles.previewTitle}>Podgląd paragonu</h2>
						<div className={styles.imagePreview}>
							{previewUrl ? (
								<img src={previewUrl} alt="Paragon" className={styles.previewImage} />
							) : (
								<div className={styles.mockImage}>
									<p>Nie wybrano obrazu</p>
								</div>
							)}
						</div>

						{isProcessing && (
							<div className={styles.processingInfo}>
								<div className={styles.progressBar}>
									<div className={styles.progressFill} style={{ width: `${processingProgress}%` }}></div>
								</div>
								<p className={styles.processingStatus}>{processingStatus}</p>
							</div>
						)}

						{error && (
							<div className={styles.errorContainer}>
								<p className={styles.errorText}>{error}</p>
							</div>
						)}

						<div className={styles.buttonGroup}>
							<Button
								onClick={handleProcessImage}
								disabled={isProcessing || !image}
								className={isProcessing ? styles.processingButton : ''}>
								{isProcessing ? 'Przetwarzanie...' : 'Przetwórz paragon'}
							</Button>
							<Button onClick={handleCancel} variant="outline" disabled={isProcessing}>
								Anuluj
							</Button>
							<Button onClick={() => setShowManualEntry(true)} variant="text" disabled={isProcessing}>
								Wprowadź dane ręcznie
							</Button>
						</div>
					</div>
				)}

				{step === 'preview' && showManualEntry && (
					<div className={styles.manualEntryForm}>
						<h3 className={styles.manualEntryTitle}>Wprowadź dane ręcznie</h3>
						<form onSubmit={handleManualSubmit}>
							<div className={styles.formField}>
								<label htmlFor="store">Nazwa sklepu:</label>
								<input
									type="text"
									id="store"
									value={manualData.store}
									onChange={e => setManualData({ ...manualData, store: e.target.value })}
									placeholder="np. Biedronka, Lidl"
								/>
							</div>
							<div className={styles.formField}>
								<label htmlFor="date">Data zakupu:</label>
								<input
									type="date"
									id="date"
									value={manualData.date}
									onChange={e => setManualData({ ...manualData, date: e.target.value })}
								/>
							</div>
							<div className={styles.formField}>
								<label htmlFor="totalAmount">Kwota (zł):</label>
								<input
									type="text"
									id="totalAmount"
									value={manualData.totalAmount}
									onChange={e => setManualData({ ...manualData, totalAmount: e.target.value })}
									placeholder="np. 123,45"
								/>
							</div>
							<div className={styles.buttonGroup}>
								<Button type="submit">Dodaj wydatek</Button>
								<Button type="button" variant="outline" onClick={handleCancel}>
									Anuluj
								</Button>
							</div>
						</form>
					</div>
				)}
			</Card>
		</div>
	)
}
