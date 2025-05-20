import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import styles from './Budgets.module.css'


const Modal = ({ isVisible, onClose, title, children }) => {
	if (!isVisible) return null

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContainer}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>{title}</h2>
					<button onClick={onClose} className={styles.modalClose}>
						×
					</button>
				</div>
				<div className={styles.modalBody}>{children}</div>
			</div>
		</div>
	)
}


const availableColors = [
	'#27ae60', // zielony
	'#2980b9', // niebieski
	'#8e44ad', // fioletowy
	'#e74c3c', // czerwony
	'#f39c12', // pomarańczowy
	'#16a085', // morski
	'#d35400', // ciemnopomarańczowy
	'#c0392b', // ciemnoczerwony
	'#2c3e50', // granatowy
	'#7f8c8d', // szary
]


const tabStyles = {
	tabsContainer: {
		display: 'flex',
		gap: '1rem',
		marginBottom: '2rem',
		borderBottom: '1px solid #e2e8f0',
	},
	tab: {
		padding: '0.75rem 1.5rem',
		border: 'none',
		background: 'none',
		cursor: 'pointer',
		fontSize: '1rem',
		position: 'relative',
		color: '#718096',
		transition: 'color 0.2s',
	},
	activeTab: {
		color: '#3182ce',
		'&::after': {
			content: '""',
			position: 'absolute',
			bottom: '-1px',
			left: 0,
			right: 0,
			height: '2px',
			backgroundColor: '#3182ce',
		},
	},
}

const ErrorMessage = ({ error, onRetry }) => {
	if (!error) return null

	return (
		<div className={styles.errorCard}>
			<div className={styles.errorText}>
				<h3>Wystąpił błąd</h3>
				<p>{error}</p>
			</div>
			{onRetry && (
				<Button onClick={onRetry} variant="secondary">
					Spróbuj ponownie
				</Button>
			)}
		</div>
	)
}

export default function BudgetsPage() {
	const router = useRouter()
	const { data: session, status } = useSession()
	const [budgets, setBudgets] = useState([])
	const [goals, setGoals] = useState([])
	const [categories, setCategories] = useState([])
	const [activeTab, setActiveTab] = useState('personal')
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)
	const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false)
	const [isGoalModalVisible, setIsGoalModalVisible] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const [sharedBudgets, setSharedBudgets] = useState([])
	const [retryCount, setRetryCount] = useState(0)

	
	const [budgetForm, setBudgetForm] = useState({
		name: '',
		amount: '',
		period: 'monthly',
		categoryId: '',
		startDate: new Date().toISOString().split('T')[0],
		endDate: '',
		autoRenew: true,
		errors: {},
	})

	
	const [goalForm, setGoalForm] = useState({
		name: '',
		targetAmount: '',
		currentAmount: '',
		targetDate: '',
		category: '',
		description: '',
		icon: 'piggy-bank',
		color: '#27ae60',
		errors: {},
	})

	
	const [editingBudgetId, setEditingBudgetId] = useState(null)
	const [editingGoalId, setEditingGoalId] = useState(null)

	
	useEffect(() => {
		const checkIfMobile = () => {
			if (typeof window !== 'undefined') {
				setIsMobile(window.innerWidth <= 768)
			} else {
				setIsMobile(Platform.OS !== 'web')
			}
		}

		checkIfMobile()

		if (typeof window !== 'undefined') {
			window.addEventListener('resize', checkIfMobile)
			return () => window.removeEventListener('resize', checkIfMobile)
		}
	}, [])

	
	const fetchData = useCallback(async () => {
		setIsLoading(true)
		setError(null)

		try {
			
			const categoriesResponse = await fetch('/api/categories')

			if (!categoriesResponse.ok) {
				throw new Error('Nie udało się pobrać kategorii')
			}

			const categoriesData = await categoriesResponse.json()

			if (categoriesData.success) {
				setCategories(categoriesData.data)
			} else {
				throw new Error(categoriesData.message || 'Błąd pobierania kategorii')
			}

			
			const budgetsResponse = await fetch('/api/budgets')

			if (!budgetsResponse.ok) {
				throw new Error('Nie udało się pobrać budżetów')
			}

			const budgetsData = await budgetsResponse.json()

			if (budgetsData.success) {
				setBudgets(budgetsData.data)
			} else {
				throw new Error(budgetsData.message || 'Błąd pobierania budżetów')
			}

			
			const goalsResponse = await fetch('/api/goals')

			if (!goalsResponse.ok) {
				throw new Error('Nie udało się pobrać celów oszczędnościowych')
			}

			const goalsData = await goalsResponse.json()

			if (goalsData.success) {
				setGoals(goalsData.data)
			} else {
				throw new Error(goalsData.message || 'Błąd pobierania celów oszczędnościowych')
			}

		
			const sharedBudgetsResponse = await fetch('/api/shared-budgets')
			if (!sharedBudgetsResponse.ok) {
				throw new Error('Nie udało się pobrać wspólnych budżetów')
			}
			const sharedBudgetsData = await sharedBudgetsResponse.json()
			if (sharedBudgetsData.success) {
				setSharedBudgets(sharedBudgetsData.data)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania danych:', error)
			setError(error.message)
		} finally {
			setIsLoading(false)
		}
	}, [])

	const handleRetry = useCallback(() => {
		setRetryCount(prev => prev + 1)
		setError(null)
		fetchData()
	}, [fetchData])

	useEffect(() => {
		if (!session && status !== 'loading') {
			router.push('/auth/signin')
			return
		}

		fetchData().catch(err => {
			console.error('Błąd podczas ładowania danych:', err)
			setError(err.message || 'Wystąpił nieoczekiwany błąd')
			setIsLoading(false)
		})
	}, [session, status, router, retryCount])

	
	const formatCurrency = amount => {
		if (!amount && amount !== 0) return '0.00 zł'
		const numAmount = Number(amount)
		if (isNaN(numAmount)) return '0.00 zł'
		return numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ') + ' zł'
	}


	const formatDate = dateString => {
		if (!dateString) return 'Nie określono'
		const date = new Date(dateString)
		return date.toLocaleDateString('pl-PL')
	}

	
	const getCategoryById = categoryId => {
		if (!categoryId) return null
		return categories.find(cat => cat._id === categoryId)
	}

	
	const calculateProgress = (currentAmount, targetAmount) => {
		if (!targetAmount || targetAmount <= 0) return 0
		return Math.min(100, (currentAmount / targetAmount) * 100)
	}

	
	const calculateDaysLeft = targetDate => {
		if (!targetDate) return 0
		const today = new Date()
		const target = new Date(targetDate)
		const diffTime = target - today
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
		return Math.max(0, diffDays)
	}

	
	const calculateDailySavings = (currentAmount, targetAmount, targetDate) => {
		const daysLeft = calculateDaysLeft(targetDate)
		if (daysLeft <= 0) return 0
		const amountLeft = targetAmount - currentAmount
		return amountLeft / daysLeft
	}

	
	const handleOpenBudgetModal = (budget = null) => {
		if (budget) {
			// Tryb edycji
			setEditingBudgetId(budget._id)
			setBudgetForm({
				name: budget.name,
				amount: budget.amount.toString(),
				period: budget.period,
				categoryId: budget.categoryId || '',
				startDate: budget.startDate
					? new Date(budget.startDate).toISOString().split('T')[0]
					: new Date().toISOString().split('T')[0],
				endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : '',
				autoRenew: budget.autoRenew,
				errors: {},
			})
		} else {
			// Tryb dodawania
			setEditingBudgetId(null)
			setBudgetForm({
				name: '',
				amount: '',
				period: 'monthly',
				categoryId: '',
				startDate: new Date().toISOString().split('T')[0],
				endDate: '',
				autoRenew: true,
				errors: {},
			})
		}

		setIsBudgetModalVisible(true)
	}

	
	const handleOpenGoalModal = (goal = null) => {
		if (goal) {
			// Tryb edycji
			setEditingGoalId(goal._id)
			setGoalForm({
				name: goal.name,
				targetAmount: goal.targetAmount.toString(),
				currentAmount: goal.currentAmount.toString(),
				targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
				category: goal.category,
				description: goal.description || '',
				icon: goal.icon || 'piggy-bank',
				color: goal.color || '#27ae60',
				errors: {},
			})
		} else {
			// Tryb dodawania
			setEditingGoalId(null)
			setGoalForm({
				name: '',
				targetAmount: '',
				currentAmount: '0',
				targetDate: '',
				category: '',
				description: '',
				icon: 'piggy-bank',
				color: '#27ae60',
				errors: {},
			})
		}

		setIsGoalModalVisible(true)
	}
	
	const handleCloseBudgetModal = () => {
		setIsBudgetModalVisible(false)
	}

	const handleCloseGoalModal = () => {
		setIsGoalModalVisible(false)
	}

	
	const handleBudgetFormChange = (field, value) => {
		setBudgetForm(prev => ({
			...prev,
			[field]: value,
			errors: {
				...prev.errors,
				[field]: undefined,
			},
		}))
	}


	const handleGoalFormChange = (field, value) => {
		setGoalForm(prev => ({
			...prev,
			[field]: value,
			errors: {
				...prev.errors,
				[field]: undefined,
			},
		}))
	}

	
	const validateBudgetForm = () => {
		const errors = {}

		if (!budgetForm.name.trim()) {
			errors.name = 'Nazwa budżetu jest wymagana'
		}

		if (!budgetForm.amount || parseFloat(budgetForm.amount) <= 0) {
			errors.amount = 'Kwota musi być większa od zera'
		}

		if (!budgetForm.startDate) {
			errors.startDate = 'Data początkowa jest wymagana'
		}

		setBudgetForm(prev => ({
			...prev,
			errors,
		}))

		return Object.keys(errors).length === 0
	}


	const validateGoalForm = () => {
		const errors = {}

		if (!goalForm.name.trim()) {
			errors.name = 'Nazwa celu jest wymagana'
		}

		if (!goalForm.targetAmount || parseFloat(goalForm.targetAmount) <= 0) {
			errors.targetAmount = 'Kwota docelowa musi być większa od zera'
		}

		if (!goalForm.targetDate) {
			errors.targetDate = 'Data docelowa jest wymagana'
		} else {
			const targetDate = new Date(goalForm.targetDate)
			const today = new Date()
			if (targetDate <= today) {
				errors.targetDate = 'Data docelowa musi być w przyszłości'
			}
		}

		
		setGoalForm(prev => ({
			...prev,
			errors,
		}))

		return Object.keys(errors).length === 0
	}


	const handleSaveBudget = async () => {
		if (!validateBudgetForm()) {
			return
		}

		setIsSaving(true)

		try {
			const budgetData = {
				name: budgetForm.name,
				amount: parseFloat(budgetForm.amount),
				period: budgetForm.period,
				categoryId: budgetForm.categoryId || null,
				startDate: budgetForm.startDate,
				endDate: budgetForm.endDate || null,
				autoRenew: budgetForm.autoRenew,
			}

			let response

			if (editingBudgetId) {
				
				response = await fetch('/api/budgets', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: editingBudgetId,
						...budgetData,
					}),
				})
			} else {
			
				response = await fetch('/api/budgets', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(budgetData),
				})
			}

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Wystąpił błąd')
			}

			
			fetchData()

			
			setIsBudgetModalVisible(false)
		} catch (error) {
			console.error('Błąd podczas zapisywania budżetu:', error)
			setBudgetForm(prev => ({
				...prev,
				errors: {
					...prev.errors,
					general: error.message,
				},
			}))
		} finally {
			setIsSaving(false)
		}
	}

	
	const handleSaveGoal = async () => {
		if (!validateGoalForm()) {
			return
		}

		setIsSaving(true)

		try {
			const goalData = {
				name: goalForm.name,
				targetAmount: parseFloat(goalForm.targetAmount),
				currentAmount: parseFloat(goalForm.currentAmount || 0),
				targetDate: goalForm.targetDate,
				category: goalForm.category,
				description: goalForm.description,
				icon: goalForm.icon,
				color: goalForm.color,
			}

			let response

			if (editingGoalId) {
				
				response = await fetch('/api/goals', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: editingGoalId,
						...goalData,
					}),
				})
			} else {
			
				response = await fetch('/api/goals', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(goalData),
				})
			}

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Wystąpił błąd')
			}

			
			fetchData()

			
			setIsGoalModalVisible(false)
		} catch (error) {
			console.error('Błąd podczas zapisywania celu:', error)
			setGoalForm(prev => ({
				...prev,
				errors: {
					...prev.errors,
					general: error.message,
				},
			}))
		} finally {
			setIsSaving(false)
		}
	}
	
	const handleDeleteBudget = async id => {
		if (!confirm('Czy na pewno chcesz usunąć ten budżet?')) {
			return
		}

		setIsDeleting(true)

		try {
			const response = await fetch(`/api/budgets?id=${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Wystąpił błąd')
			}

			
			fetchData()
		} catch (error) {
			console.error('Błąd podczas usuwania budżetu:', error)
			setError('Nie udało się usunąć budżetu')
		} finally {
			setIsDeleting(false)
		}
	}

	
	const handleDeleteGoal = async id => {
		if (!confirm('Czy na pewno chcesz usunąć ten cel oszczędnościowy?')) {
			return
		}

		setIsDeleting(true)

		try {
			const response = await fetch(`/api/goals?id=${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Wystąpił błąd')
			}

		
			fetchData()
		} catch (error) {
			console.error('Błąd podczas usuwania celu:', error)
			setError('Nie udało się usunąć celu oszczędnościowego')
		} finally {
			setIsDeleting(false)
		}
	}

	
	const handleDeleteSharedBudget = async id => {
		if (!confirm('Czy na pewno chcesz usunąć ten wspólny budżet?')) {
			return
		}

		setIsDeleting(true)

		try {
			const response = await fetch(`/api/shared-budgets/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Nie udało się usunąć budżetu')
			}

		
			fetchData()
		} catch (error) {
			console.error('Błąd podczas usuwania wspólnego budżetu:', error)
			setError('Nie udało się usunąć wspólnego budżetu')
		} finally {
			setIsDeleting(false)
		}
	}

	if (isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner} />
				<p className={styles.loadingText}>Ładowanie danych...</p>
			</div>
		)
	}

	return (
		<div className={styles.container}>
			<ErrorMessage error={error} onRetry={handleRetry} />
			{!error && (
				<>
					<div className={styles.header}>
						<div className={styles.titleSection}>
							<h1 className={styles.title}>Zarządzanie budżetem</h1>
							<div className={styles.tabsContainer}>
								<button
									className={activeTab === 'personal' ? styles.tabButtonActive : styles.tabButton}
									onClick={() => setActiveTab('personal')}>
									Budżety osobiste
								</button>
								<button
									className={activeTab === 'shared' ? styles.tabButtonActive : styles.tabButton}
									onClick={() => setActiveTab('shared')}>
									Budżety wspólne
								</button>
								<button
									className={activeTab === 'goals' ? styles.tabButtonActive : styles.tabButton}
									onClick={() => setActiveTab('goals')}>
									Cele oszczędnościowe
								</button>
							</div>
						</div>
					</div>

					{activeTab === 'personal' && (
						<div className={styles.content}>
							<section className={styles.budgetsSection}>
								<div className={styles.sectionHeader}>
									<h2 className={styles.sectionTitle}>Twoje budżety</h2>
									<Button onClick={() => setIsBudgetModalVisible(true)} variant="primary">
										Dodaj budżet
									</Button>
								</div>
								<p className={styles.sectionDescription}>
									Ustaw miesięczne, tygodniowe lub roczne budżety dla wszystkich wydatków lub konkretnych kategorii.
								</p>

								<div className={styles.budgetsList}>
									{budgets.length === 0 ? (
										<Card className={styles.emptyState}>
											<p className={styles.emptyStateText}>
												Nie masz jeszcze żadnych budżetów. Dodaj swój pierwszy budżet, aby zacząć kontrolować wydatki.
											</p>
											<Button onClick={() => setIsBudgetModalVisible(true)} variant="primary">
												Dodaj pierwszy budżet
											</Button>
										</Card>
									) : (
										budgets.map(budget => (
											<Card key={budget._id} className={styles.budgetCard}>
												<div className={styles.budgetHeader}>
													<h3 className={styles.budgetName}>
														{budget.categoryId ? getCategoryById(budget.categoryId)?.name : 'Wszystkie kategorie'}
													</h3>
													<span className={styles.budgetPeriod}>
														{budget.period === 'monthly' ? 'Miesięcznie' : 'Rocznie'}
													</span>
												</div>
												<div className={styles.budgetAmount}>
													<span className={styles.amount}>{formatCurrency(budget.amount)}</span>
													<div className={styles.progress}>
														<div
															className={styles.progressBar}
															style={{
																width: `${Math.min((budget.spent / budget.amount) * 100, 100)}%`,
																backgroundColor: budget.spent / budget.amount > 1 ? '#e74c3c' : '#2ecc71',
															}}
														/>
													</div>
													<span className={styles.spent}>
														Wydano: {formatCurrency(budget.spent)}
														{budget.spent > budget.amount && (
															<span className={styles.overBudget}>
																(Przekroczono o {formatCurrency(budget.spent - budget.amount)})
															</span>
														)}
													</span>
												</div>
												<div className={styles.budgetActions}>
													<Button onClick={() => handleOpenBudgetModal(budget)} variant="outline" size="small">
														Edytuj
													</Button>
													<Button
														onClick={() => handleDeleteBudget(budget._id)}
														variant="danger"
														size="small"
														disabled={isDeleting}>
														Usuń
													</Button>
												</div>
											</Card>
										))
									)}
								</div>
							</section>
						</div>
					)}

					{activeTab === 'shared' && (
						<div className={styles.content}>
							<section className={styles.budgetsSection}>
								<div className={styles.sectionHeader}>
									<h2 className={styles.sectionTitle}>Budżety wspólne</h2>
									<Button onClick={() => router.push('/shared-budgets/create')} variant="primary">
										Utwórz wspólny budżet
									</Button>
								</div>
								<p className={styles.sectionDescription}>Zarządzaj budżetami współdzielonymi z innymi osobami.</p>

								<div className={styles.budgetsList}>
									{sharedBudgets.length === 0 ? (
										<Card className={styles.emptyState}>
											<p className={styles.emptyStateText}>Nie masz jeszcze żadnych wspólnych budżetów.</p>
											<Button onClick={() => router.push('/shared-budgets/create')} variant="primary">
												Utwórz pierwszy wspólny budżet
											</Button>
										</Card>
									) : (
										sharedBudgets.map(budget => (
											<Card key={budget._id} className={styles.budgetCard}>
												<div className={styles.budgetHeader}>
													<h3 className={styles.budgetName}>{budget.name}</h3>
													<span className={styles.budgetPeriod}>{budget.members?.length || 0} członków</span>
												</div>
												<div className={styles.budgetAmount}>
													<span className={styles.amount}>
														{formatCurrency(budget.monthlyLimit || budget.limit || 0)}
													</span>
												</div>
												<div className={styles.budgetMembers}>
													<p className={styles.membersLabel}>Członkowie:</p>
													<div className={styles.membersList}>
														{budget.members?.map((member, index) => (
															<span key={member.userId} className={styles.memberItem}>
																{member.email}
																{index < budget.members.length - 1 ? ', ' : ''}
															</span>
														))}
													</div>
												</div>
												<div className={styles.budgetActions}>
													<Button
														onClick={() => router.push(`/shared-budgets/${budget._id}`)}
														variant="outline"
														size="small">
														Szczegóły
													</Button>
													<Button
														onClick={() => router.push(`/shared-budgets/${budget._id}/edit`)}
														variant="outline"
														size="small">
														Edytuj
													</Button>
													<Button
														onClick={() => handleDeleteSharedBudget(budget._id)}
														variant="danger"
														size="small"
														disabled={isDeleting}>
														Usuń
													</Button>
												</div>
											</Card>
										))
									)}
								</div>
							</section>
						</div>
					)}

					{activeTab === 'goals' && (
						<div className={styles.content}>
							<section className={styles.budgetsSection}>
								<div className={styles.sectionHeader}>
									<h2 className={styles.sectionTitle}>Cele oszczędnościowe</h2>
									<Button onClick={() => setIsGoalModalVisible(true)} variant="primary">
										Dodaj cel
									</Button>
								</div>
								<p className={styles.sectionDescription}>
									Zaplanuj swoje oszczędności i śledź postępy w realizacji celów finansowych.
								</p>

								<div className={styles.budgetsList}>
									{goals.length === 0 ? (
										<Card className={styles.emptyState}>
											<p className={styles.emptyStateText}>Nie masz jeszcze żadnych celów oszczędnościowych.</p>
											<Button onClick={() => setIsGoalModalVisible(true)} variant="primary">
												Dodaj pierwszy cel
											</Button>
										</Card>
									) : (
										goals.map(goal => (
											<Card key={goal._id} className={styles.goalCard}>
												<div className={styles.goalHeader}>
													<div className={styles.goalInfo}>
														<h3 className={styles.goalName}>{goal.name}</h3>
														<div className={styles.goalCategory}>
															<p className={styles.goalCategoryText}>{goal.category}</p>
														</div>
													</div>
													<div className={styles.goalAmount}>
														<p className={styles.goalCurrentAmount}>{formatCurrency(goal.currentAmount)}</p>
														<p className={styles.goalTargetAmount}>z {formatCurrency(goal.targetAmount)}</p>
													</div>
												</div>

												<div className={styles.progressContainer}>
													<div className={styles.progressBar}>
														<div
															className={styles.progressFill}
															style={{
																width: `${calculateProgress(goal.currentAmount, goal.targetAmount)}%`,
																backgroundColor: goal.color || '#27ae60',
															}}></div>
													</div>
													<p className={styles.progressText}>
														{Math.round(calculateProgress(goal.currentAmount, goal.targetAmount))}% ukończone
													</p>
												</div>

												<div className={styles.goalDetails}>
													<div className={styles.goalDetail}>
														<p className={styles.goalDetailLabel}>Data docelowa:</p>
														<p className={styles.goalDetailValue}>{formatDate(goal.targetDate)}</p>
													</div>

													<div className={styles.goalDetail}>
														<p className={styles.goalDetailLabel}>Pozostało dni:</p>
														<p className={styles.goalDetailValue}>{calculateDaysLeft(goal.targetDate)}</p>
													</div>

													<div className={styles.goalDetail}>
														<p className={styles.goalDetailLabel}>Dziennie:</p>
														<p className={styles.goalDetailValue}>
															{formatCurrency(
																calculateDailySavings(goal.currentAmount, goal.targetAmount, goal.targetDate)
															)}
														</p>
													</div>
												</div>

												{goal.description && (
													<div className={styles.goalDescription}>
														<p className={styles.goalDescriptionText}>{goal.description}</p>
													</div>
												)}

												<div className={styles.goalActions}>
													<Button
														title="Edytuj"
														variant="outline"
														size="small"
														style={styles.actionButton}
														onPress={() => handleOpenGoalModal(goal)}
													/>
													<Button
														title="Aktualizuj kwotę"
														variant="primary"
														size="small"
														style={styles.actionButton}
														onPress={() => handleOpenGoalModal(goal)}
													/>
													<Button
														title="Usuń"
														variant="danger"
														size="small"
														style={styles.actionButton}
														onPress={() => handleDeleteGoal(goal._id)}
														loading={isDeleting}
														disabled={isDeleting}
													/>
												</div>
											</Card>
										))
									)}
								</div>
							</section>
						</div>
					)}

					{/* Modal budżetu */}
					{isBudgetModalVisible && (
						<Modal
							isVisible={isBudgetModalVisible}
							onClose={handleCloseBudgetModal}
							title={editingBudgetId ? 'Edytuj budżet' : 'Dodaj nowy budżet'}>
							<div className={styles.modalContent}>
								{budgetForm.errors.general && (
									<div className={styles.formError}>
										<p className={styles.errorText}>{budgetForm.errors.general}</p>
									</div>
								)}

								<Input
									label="Nazwa budżetu"
									value={budgetForm.name}
									onChangeText={value => handleBudgetFormChange('name', value)}
									placeholder="Np. Miesięczne wydatki, Jedzenie, itp."
									error={budgetForm.errors.name}
									required
								/>

								<Input
									label="Kwota budżetu"
									value={budgetForm.amount}
									onChangeText={value => handleBudgetFormChange('amount', value)}
									placeholder="0.00"
									keyboardType="numeric"
									error={budgetForm.errors.amount}
									required
								/>

								<div className={styles.formGroup}>
									<label className={styles.label}>Okres budżetu</label>
									<select
										value={budgetForm.period}
										onChange={e => handleBudgetFormChange('period', e.target.value)}
										className={styles.picker}>
										<option value="daily">Dziennie</option>
										<option value="weekly">Tygodniowo</option>
										<option value="monthly">Miesięcznie</option>
										<option value="yearly">Rocznie</option>
									</select>
								</div>

								<div className={styles.formGroup}>
									<label className={styles.label}>Kategoria (opcjonalnie)</label>
									<select
										value={budgetForm.categoryId}
										onChange={e => handleBudgetFormChange('categoryId', e.target.value)}
										className={styles.picker}>
										<option value="">-- Wszystkie kategorie --</option>
										{categories.map(category => (
											<option key={category._id} value={category._id}>
												{category.name}
											</option>
										))}
									</select>
								</div>

								<Input
									label="Data początkowa"
									value={budgetForm.startDate}
									onChangeText={value => handleBudgetFormChange('startDate', value)}
									placeholder="RRRR-MM-DD"
									error={budgetForm.errors.startDate}
									required
								/>

								<Input
									label="Data końcowa (opcjonalnie)"
									value={budgetForm.endDate}
									onChangeText={value => handleBudgetFormChange('endDate', value)}
									placeholder="RRRR-MM-DD"
									error={budgetForm.errors.endDate}
								/>

								<div className={styles.formGroup}>
									<label className={styles.label}>Automatyczne odnawianie</label>
									<div className={styles.switchContainer}>
										<p>{budgetForm.autoRenew ? 'Włączone' : 'Wyłączone'}</p>
										<input
											type="checkbox"
											checked={budgetForm.autoRenew}
											onChange={e => handleBudgetFormChange('autoRenew', e.target.checked)}
										/>
									</div>
								</div>

								<div className={styles.modalActions}>
									<Button
										title="Anuluj"
										variant="outline"
										onPress={handleCloseBudgetModal}
										style={{ marginRight: 8 }}
									/>
									<Button
										title={isSaving ? 'Zapisywanie...' : 'Zapisz'}
										onPress={handleSaveBudget}
										loading={isSaving}
										disabled={isSaving}
									/>
								</div>
							</div>
						</Modal>
					)}
					{/* Modal celu oszczędnościowego */}
					{isGoalModalVisible && (
						<Modal
							isVisible={isGoalModalVisible}
							onClose={handleCloseGoalModal}
							title={editingGoalId ? 'Edytuj cel oszczędnościowy' : 'Dodaj nowy cel oszczędnościowy'}>
							<div className={styles.modalContent}>
								{goalForm.errors.general && (
									<div className={styles.formError}>
										<p className={styles.errorText}>{goalForm.errors.general}</p>
									</div>
								)}

								<Input
									label="Nazwa celu"
									value={goalForm.name}
									onChangeText={value => handleGoalFormChange('name', value)}
									placeholder="Np. Wakacje, Nowy samochód, itp."
									error={goalForm.errors.name}
									required
								/>

								<Input
									label="Kwota docelowa"
									value={goalForm.targetAmount}
									onChangeText={value => handleGoalFormChange('targetAmount', value)}
									placeholder="0.00"
									keyboardType="numeric"
									error={goalForm.errors.targetAmount}
									required
								/>

								<Input
									label="Aktualna kwota"
									value={goalForm.currentAmount}
									onChangeText={value => handleGoalFormChange('currentAmount', value)}
									placeholder="0.00"
									keyboardType="numeric"
									error={goalForm.errors.currentAmount}
								/>

								<Input
									label="Data docelowa"
									value={goalForm.targetDate}
									onChangeText={value => handleGoalFormChange('targetDate', value)}
									placeholder="RRRR-MM-DD"
									error={goalForm.errors.targetDate}
									required
								/>

								<Input
									label="Kategoria (opcjonalnie)"
									value={goalForm.category}
									onChangeText={value => handleGoalFormChange('category', value)}
									placeholder="Np. Podróże, Inwestycje, itp."
									error={goalForm.errors.category}
								/>

								<Input
									label="Opis (opcjonalnie)"
									value={goalForm.description}
									onChangeText={value => handleGoalFormChange('description', value)}
									placeholder="Dodaj szczegóły swojego celu..."
									multiline
									numberOfLines={3}
									error={goalForm.errors.description}
								/>

								<label className={styles.modalLabel}>Kolor celu:</label>
								<div className={styles.colorPicker}>
									{availableColors.map(color => (
										<button
											key={color}
											className={[
												styles.colorOption,
												{ backgroundColor: color },
												goalForm.color === color && styles.colorOptionSelected,
											].join(' ')}
											onClick={() => handleGoalFormChange('color', color)}></button>
									))}
								</div>

								<div className={styles.modalActions}>
									<Button title="Anuluj" variant="outline" onPress={handleCloseGoalModal} style={{ marginRight: 8 }} />
									<Button
										title={isSaving ? 'Zapisywanie...' : 'Zapisz'}
										onPress={handleSaveGoal}
										loading={isSaving}
										disabled={isSaving}
									/>
								</div>
							</div>
						</Modal>
					)}
				</>
			)}
		</div>
	)
}
