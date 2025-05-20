import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { TrendingUp, DollarSign, Calendar, Activity, CreditCard, Camera, Plus, Briefcase } from 'react-feather'
import Head from 'next/head'

import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js'

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false })
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false })

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler
)

const Card = dynamic(() => import('../components/common/Card'))
const Button = dynamic(() => import('../components/common/Button'))

export default function Dashboard() {
	const [isBrowser, setIsBrowser] = useState(false)
	const [refreshTrigger, setRefreshTrigger] = useState(0)
	const [expenses, setExpenses] = useState([])
	const [activeTab, setActiveTab] = useState('all')
	const [isLoading, setIsLoading] = useState(true)
	const [sharedBudgets, setSharedBudgets] = useState([])
	const [expenseType, setExpenseType] = useState('all')
	const [selectedBudget, setSelectedBudget] = useState('all')

	useEffect(() => {
		setIsBrowser(true)
	}, [])

	useEffect(() => {
		const handleStorageChange = e => {
			if (e.key === 'dashboardRefresh') {
				setRefreshTrigger(prev => prev + 1)
				localStorage.removeItem('dashboardRefresh')
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('storage', handleStorageChange)

			const lastRefresh = localStorage.getItem('dashboardRefresh')
			if (lastRefresh) {
				setRefreshTrigger(prev => prev + 1)
				localStorage.removeItem('dashboardRefresh')
			}
		}

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('storage', handleStorageChange)
			}
		}
	}, [])

	const { data: session, status } = useSession()
	const router = useRouter()
	const [dashboardData, setDashboardData] = useState(null)
	const [categories, setCategories] = useState([])
	const [error, setError] = useState(null)
	const [selectedPeriod, setSelectedPeriod] = useState('month')

	const filteredExpenses = useMemo(() => {
		if (activeTab === 'all') return expenses
		return expenses.filter(expense => expense.type === activeTab)
	}, [expenses, activeTab])

	const calculateTotals = useMemo(() => {
		const totals = {
			personal: 0,
			shared: 0,
			all: 0,
		}

		expenses.forEach(expense => {
			totals[expense.type] += expense.amount
			totals.all += expense.amount
		})

		return totals
	}, [expenses])

	const fetchDashboardData = useCallback(async () => {
		if (!isBrowser || !session) return

		setIsLoading(true)
		setError(null)

		try {
			const expensesResponse = await fetch('/api/expenses')
			if (!expensesResponse.ok) {
				throw new Error('Nie udało się pobrać wydatków')
			}

			const expensesData = await expensesResponse.json()
			if (!expensesData.success) {
				throw new Error(expensesData.message || 'Błąd podczas pobierania wydatków')
			}

			console.log('Pobrane wydatki:', expensesData.data)
			setExpenses(expensesData.data)

			const totalSpent = expensesData.data.reduce((sum, exp) => sum + (exp.amount || 0), 0)
			const highestExpense = Math.max(...expensesData.data.map(exp => exp.amount || 0))

			const categoriesSpending = expensesData.data.reduce((acc, expense) => {
				const categoryId = expense.categoryId?._id || expense.categoryId || 'uncategorized'
				if (!acc[categoryId]) {
					acc[categoryId] = {
						name: expense.categoryId?.name || 'Bez kategorii',
						color: expense.categoryId?.color || '#cccccc',
						amount: 0,
					}
				}
				acc[categoryId].amount += expense.amount || 0
				return acc
			}, {})

			const now = new Date()
			const dateRange = []
			const spendingByDate = {}

			for (let i = 0; i < 30; i++) {
				const date = new Date(now)
				date.setDate(now.getDate() - (29 - i))
				const dateKey = date.toISOString().split('T')[0]
				dateRange.push(dateKey)
				spendingByDate[dateKey] = 0
			}

			expensesData.data.forEach(expense => {
				if (expense.date) {
					const dateKey = new Date(expense.date).toISOString().split('T')[0]
					if (spendingByDate[dateKey] !== undefined) {
						spendingByDate[dateKey] += expense.amount || 0
					}
				}
			})

			const spendingTrend = {
				labels: dateRange.map(date => {
					const [, month, day] = date.split('-')
					return `${day}.${month}`
				}),
				data: dateRange.map(date => spendingByDate[date] || 0),
			}

			setDashboardData({
				totalSpent,
				averageSpending: totalSpent / (expensesData.data.length || 1),
				transactionsCount: expensesData.data.length,
				highestExpense,
				recentTransactions: expensesData.data.slice(0, 5),
				categoriesSpending: Object.values(categoriesSpending),
				spendingTrend,
			})
			const categoriesResponse = await fetch('/api/categories')
			if (!categoriesResponse.ok) {
				throw new Error('Nie udało się pobrać kategorii')
			}

			const categoriesData = await categoriesResponse.json()
			if (categoriesData.success) {
				setCategories(categoriesData.data)
			}
		} catch (error) {
			console.error('Szczegóły błędu:', error)
			setError(error.message || 'Wystąpił błąd podczas pobierania danych')
		} finally {
			setIsLoading(false)
		}
	}, [selectedPeriod, isBrowser, session])

	const fetchSharedBudgets = async () => {
		try {
			const response = await fetch('/api/shared-budgets')
			const data = await response.json()
			if (data.success) {
				setSharedBudgets(data.data)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania budżetów wspólnych:', error)
		}
	}

	useEffect(() => {
		if (session) {
			fetchDashboardData()
			fetchSharedBudgets()
		}
	}, [session, expenseType, selectedBudget, refreshTrigger, fetchDashboardData])

	const formatCurrency = amount => {
		return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ') + ' zł'
	}

	const formatDate = dateString => {
		const date = new Date(dateString)
		return date.toLocaleDateString('pl-PL')
	}

	const getCategoryById = categoryId => {
		if (!categoryId) return { name: 'Bez kategorii', color: '#cccccc' }

		// Jeśli categoryId jest obiektem z własnym _id (już zpopulowane)
		if (typeof categoryId === 'object' && categoryId !== null) {
			return {
				name: categoryId.name || 'Nieznana kategoria',
				color: categoryId.color || '#cccccc',
				_id: categoryId._id,
			}
		}

		// W przeciwnym przypadku znajdź kategorię po ID
		return categories.find(cat => cat._id === categoryId) || { name: 'Nieznana kategoria', color: '#cccccc' }
	}

	const getChartData = filteredExpenses => {
		const spendingByDate = {}
		const dateRange = []
		const now = new Date()

		// Przygotuj zakres dat
		for (let i = 0; i < 30; i++) {
			const date = new Date(now)
			date.setDate(now.getDate() - (29 - i))
			const dateKey = date.toISOString().split('T')[0]
			dateRange.push(dateKey)
			spendingByDate[dateKey] = 0
		}

		// Agreguj wydatki według dat
		filteredExpenses.forEach(expense => {
			const dateKey = new Date(expense.date).toISOString().split('T')[0]
			if (spendingByDate[dateKey] !== undefined) {
				spendingByDate[dateKey] += expense.amount || expense.totalAmount
			}
		})

		return {
			labels: dateRange.map(date => {
				const [, month, day] = date.split('-')
				return `${day}.${month}`
			}),
			datasets: [
				{
					label: 'Wydatki',
					data: dateRange.map(date => spendingByDate[date] || 0),
					fill: true,
					backgroundColor: 'rgba(52, 152, 219, 0.1)',
					borderColor: '#3498db',
					tension: 0.4,
					pointBackgroundColor: '#3498db',
					pointRadius: 3,
					pointHoverRadius: 5,
				},
			],
		}
	}

	const getPieChartData = filteredExpenses => {
		const spendingByCategory = {}

		filteredExpenses.forEach(expense => {
			const categoryId = expense.categoryId?._id || expense.categoryId
			const category = getCategoryById(categoryId)

			if (!spendingByCategory[categoryId]) {
				spendingByCategory[categoryId] = {
					name: category.name,
					color: category.color,
					amount: 0,
				}
			}
			spendingByCategory[categoryId].amount += expense.amount || expense.totalAmount
		})

		const categories = Object.values(spendingByCategory)

		return {
			labels: categories.map(cat => cat.name),
			datasets: [
				{
					data: categories.map(cat => cat.amount),
					backgroundColor: categories.map(cat => cat.color),
					borderWidth: 1,
					borderColor: '#ffffff',
					hoverOffset: 6,
				},
			],
		}
	}

	const getFilteredExpenses = () => {
		let filtered = expenses

		// Filtruj według typu wydatku
		if (expenseType !== 'all') {
			filtered = filtered.filter(exp => {
				if (expenseType === 'shared') {
					return exp.sharedBudgetId
				} else {
					return !exp.sharedBudgetId
				}
			})
		}

		// Filtruj według konkretnego budżetu wspólnego
		if (expenseType === 'shared' && selectedBudget !== 'all') {
			filtered = filtered.filter(exp => exp.sharedBudgetId === selectedBudget)
		}

		// Filtruj według wybranego okresu
		const periodStart = new Date()
		if (selectedPeriod === 'month') {
			periodStart.setDate(periodStart.getDate() - 30)
		} else if (selectedPeriod === 'quarter') {
			periodStart.setMonth(periodStart.getMonth() - 3)
		} else {
			periodStart.setFullYear(periodStart.getFullYear() - 1)
		}

		return filtered.filter(exp => new Date(exp.date) >= periodStart)
	}

	if (!isBrowser) {
		return null
	}

	if (status === 'loading' || isLoading) {
		return (
			<div className="loadingContainer">
				<div className="loadingSpinner"></div>
				<div className="loadingText">Ładowanie danych...</div>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	if (error) {
		return (
			<div className="container">
				<Card className="errorCard">
					<h2 className="errorTitle">Wystąpił błąd</h2>
					<p className="errorText">{error}</p>
					<Button onClick={fetchDashboardData} className="errorButton">
						Spróbuj ponownie
					</Button>
				</Card>
			</div>
		)
	}

	if (!dashboardData) {
		return (
			<div className="container">
				<Card>
					<p className="emptyText">Brak danych do wyświetlenia</p>
					<Button onClick={() => router.push('/expenses/add')} className="emptyButton">
						Dodaj pierwszy wydatek
					</Button>
				</Card>
			</div>
		)
	}

	const lineOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				backgroundColor: 'rgba(255, 255, 255, 0.9)',
				titleColor: '#333',
				bodyColor: '#333',
				bodyFont: {
					weight: '600',
				},
				borderColor: 'rgba(52, 152, 219, 0.3)',
				borderWidth: 1,
				cornerRadius: 8,
				padding: 10,
				displayColors: false,
				callbacks: {
					label: function (context) {
						return formatCurrency(context.raw)
					},
				},
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: 'rgba(0, 0, 0, 0.05)',
					drawBorder: false,
				},
				ticks: {
					font: {
						size: 11,
					},
					color: '#718096',
					callback: function (value) {
						return value + ' zł'
					},
				},
			},
			x: {
				grid: {
					display: false,
				},
				ticks: {
					font: {
						size: 10,
					},
					color: '#718096',
				},
			},
		},
	}

	const doughnutOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'right',
				labels: {
					boxWidth: 12,
					padding: 15,
					font: {
						size: 11,
					},
					color: '#4a5568',
				},
			},
			tooltip: {
				backgroundColor: 'rgba(255, 255, 255, 0.9)',
				titleColor: '#333',
				bodyColor: '#333',
				bodyFont: {
					weight: '600',
				},
				borderColor: 'rgba(52, 152, 219, 0.3)',
				borderWidth: 1,
				cornerRadius: 8,
				padding: 10,
				callbacks: {
					label: function (context) {
						const value = context.raw
						const total = context.dataset.data.reduce((a, b) => a + b, 0)
						const percentage = Math.round((value / total) * 100)
						return `${context.label}: ${formatCurrency(value)} (${percentage}%)`
					},
				},
			},
		},
		cutout: '70%',
	}

	const renderSharedBudgetsSummary = () => {
		return (
			<Card className="budget-card">
				<h2 className="sectionTitle">Budżety wspólne</h2>
				{sharedBudgets.length === 0 ? (
					<p className="emptyText">Brak budżetów wspólnych</p>
				) : (
					sharedBudgets.map(budget => {
						const budgetExpenses = expenses.filter(exp => exp.type === 'shared' && exp.sharedBudgetId === budget._id)
						const totalSpent = budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0)
						const remaining = budget.monthlyBudget - totalSpent
						const percentageUsed = (totalSpent / budget.monthlyBudget) * 100

						return (
							<div key={budget._id} className="budgetItem">
								<div className="budgetNameRow">
									<span className="budgetName">{budget.name}</span>
									<span
										className={`budgetBadge ${
											percentageUsed > 90 ? 'danger' : percentageUsed > 70 ? 'warning' : 'good'
										}`}>
										{Math.min(Math.round(percentageUsed), 100)}%
									</span>
								</div>
								<div className="budgetProgress">
									<div
										className={`progressBar ${
											percentageUsed > 90 ? 'danger' : percentageUsed > 70 ? 'warning' : 'good'
										}`}
										style={{ width: `${Math.min(percentageUsed, 100)}%` }}></div>
								</div>
								<div className="budgetDetails">
									<span className="budgetText">
										<span className="budgetLabel">Wydano:</span> {formatCurrency(totalSpent)}
									</span>
									<span className="budgetText">
										<span className="budgetLabel">Pozostało:</span> {formatCurrency(remaining)}
									</span>
								</div>
							</div>
						)
					})
				)}
			</Card>
		)
	}

	const renderSummaryCards = () => {
		return (
			<div className="dashboard-summary">
				<div className="summaryCardGrid">
					<div className="summaryCard">
						<div className="summaryCardIcon summaryCardIcon-total">
							<CreditCard size={24} />
						</div>
						<div className="summaryCardContent">
							<span className="summaryCardLabel">Suma wydatków</span>
							<span className="summaryCardValue">{formatCurrency(dashboardData?.totalSpent || 0)}</span>
						</div>
					</div>

					<div className="summaryCard">
						<div className="summaryCardIcon summaryCardIcon-avg">
							<Activity size={24} />
						</div>
						<div className="summaryCardContent">
							<span className="summaryCardLabel">Średni wydatek</span>
							<span className="summaryCardValue">{formatCurrency(dashboardData?.averageSpending || 0)}</span>
						</div>
					</div>

					<div className="summaryCard">
						<div className="summaryCardIcon summaryCardIcon-count">
							<Calendar size={24} />
						</div>
						<div className="summaryCardContent">
							<span className="summaryCardLabel">Liczba transakcji</span>
							<span className="summaryCardValue">{dashboardData?.transactionsCount || 0}</span>
						</div>
					</div>

					<div className="summaryCard">
						<div className="summaryCardIcon summaryCardIcon-max">
							<TrendingUp size={24} />
						</div>
						<div className="summaryCardContent">
							<span className="summaryCardLabel">Najwyższy wydatek</span>
							<span className="summaryCardValue">{formatCurrency(dashboardData?.highestExpense || 0)}</span>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="dashboard-bg">
			<Head>
				<title>Dashboard</title>
				<style>{`
					/* Reset stylów dla elementów dashboardu */
					.dashboard-bg * {
						margin: 0;
						padding: 0;
						box-sizing: border-box;
					}

					/* Ukryj domyślne style dla list */
					.dashboard-bg ul,
					.dashboard-bg ol {
						list-style: none;
						margin: 0;
						padding: 0;
					}

					/* Wymuś style dla kart */
					.summaryCardGrid {
						display: grid !important;
						grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
						gap: 24px !important;
						width: 100% !important;
						margin: 24px 0 !important;
						padding: 0 !important;
					}

					.summaryCard {
						background: white !important;
						border-radius: 16px !important;
						padding: 24px !important;
						display: flex !important;
						align-items: center !important;
						gap: 16px !important;
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
						transition: all 0.3s ease !important;
						margin: 0 !important;
					}

					.summaryCardIcon {
						width: 48px !important;
						height: 48px !important;
						border-radius: 12px !important;
						display: flex !important;
						align-items: center !important;
						justify-content: center !important;
						flex-shrink: 0 !important;
					}

					.summaryCardContent {
						display: flex !important;
						flex-direction: column !important;
						gap: 4px !important;
					}

					.summaryCardLabel {
						font-size: 0.875rem !important;
						color: #64748b !important;
						font-weight: 500 !important;
					}

					.summaryCardValue {
						font-size: 1.5rem !important;
						font-weight: 600 !important;
						color: #1e293b !important;
					}
				`}</style>
			</Head>
			<div className="dashboard-center">
				<div className="header">
					<h1 className="welcomeText">Witaj, {session?.user?.name || 'Użytkowniku'}!</h1>
					<p className="dateText">
						{new Date().toLocaleDateString('pl-PL', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}
					</p>
				</div>

				<div className="dashboard-toolbar">
					<div className="periodSelector">
						<span className="periodLabel">Okres:</span>
						<div className="periodButtons">
							<button
								className={`periodButton ${selectedPeriod === 'month' ? 'active' : ''}`}
								onClick={() => setSelectedPeriod('month')}>
								30 dni
							</button>
							<button
								className={`periodButton ${selectedPeriod === 'quarter' ? 'active' : ''}`}
								onClick={() => setSelectedPeriod('quarter')}>
								3 miesiące
							</button>
							<button
								className={`periodButton ${selectedPeriod === 'year' ? 'active' : ''}`}
								onClick={() => setSelectedPeriod('year')}>
								Rok
							</button>
						</div>
					</div>

					<div className="quickActions">
						<button onClick={() => router.push('/scan')} className="customButton customButton-scan">
							<span className="buttonIcon">
								<Camera size={16} />
							</span>
							<span className="buttonText">Skanuj paragon</span>
						</button>

						<button onClick={() => router.push('/expenses/add')} className="customButton customButton-add">
							<span className="buttonIcon">
								<Plus size={16} />
							</span>
							<span className="buttonText">Dodaj wydatek</span>
						</button>

						<button onClick={() => router.push('/budgets')} className="customButton customButton-manage">
							<span className="buttonIcon">
								<Briefcase size={16} />
							</span>
							<span className="buttonText">Zarządzaj budżetem</span>
						</button>
					</div>
				</div>

				{renderSummaryCards()}

				<div className="dashboard-cards">
					<div className="dashboard-col dashboard-col-wide">
						<Card className="chart-card">
							<div className="chartsHeader">
								<h2 className="chartsSectionTitle">Analiza wydatków</h2>
								<div className="filtersRow">
									<div className="filterItem">
										<label className="filterLabel">Typ:</label>
										<select value={expenseType} onChange={e => setExpenseType(e.target.value)} className="filterSelect">
											<option value="all">Wszystkie</option>
											<option value="personal">Osobiste</option>
											<option value="shared">Wspólne</option>
										</select>
									</div>
									{expenseType === 'shared' && (
										<div className="filterItem">
											<label className="filterLabel">Budżet:</label>
											<select
												value={selectedBudget}
												onChange={e => setSelectedBudget(e.target.value)}
												className="filterSelect">
												<option value="all">Wszystkie</option>
												{sharedBudgets.map(budget => (
													<option key={budget._id} value={budget._id}>
														{budget.name}
													</option>
												))}
											</select>
										</div>
									)}
								</div>
							</div>
							<div className="chartsGrid">
								<div className="chartWrapper">
									<h3 className="chartTitle">Trend wydatków</h3>
									<div className="chartContainer">
										{isBrowser && expenses.length > 0 ? (
											<Line data={getChartData(getFilteredExpenses())} options={lineOptions} />
										) : (
											<div className="emptyChartContainer">
												<p>Brak danych</p>
											</div>
										)}
									</div>
								</div>
								<div className="chartWrapper">
									<h3 className="chartTitle">Wydatki według kategorii</h3>
									<div className="chartContainer">
										{isBrowser && dashboardData?.categoriesSpending?.length > 0 ? (
											<Doughnut data={getPieChartData(getFilteredExpenses())} options={doughnutOptions} />
										) : (
											<div className="emptyChartContainer">
												<p>Brak danych</p>
											</div>
										)}
									</div>
								</div>
							</div>
						</Card>
					</div>

					<div className="dashboard-col">
						{renderSharedBudgetsSummary()}

						<Card className="transactions-card">
							<div className="cardHeader">
								<h2 className="sectionTitle">Ostatnie transakcje</h2>
								<button className="refreshButton" onClick={fetchDashboardData}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										width="16"
										height="16"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round">
										<path d="M23 4v6h-6"></path>
										<path d="M1 20v-6h6"></path>
										<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
										<path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
									</svg>
								</button>
							</div>
							<div className="transactionsList">
								{dashboardData.recentTransactions.length === 0 ? (
									<p className="emptyText">Brak transakcji do wyświetlenia</p>
								) : (
									dashboardData.recentTransactions.map(transaction => {
										const category = getCategoryById(transaction.categoryId)
										return (
											<div key={transaction._id} className="transactionItem">
												<div
													className="transactionIcon"
													style={{ backgroundColor: category.color + '20', color: category.color }}>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														width="16"
														height="16"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round">
														<rect x="2" y="5" width="20" height="14" rx="2" />
														<line x1="2" y1="10" x2="22" y2="10" />
													</svg>
												</div>
												<div className="transactionDetails">
													<span className="transactionStore">{transaction.store}</span>
													<div className="transactionMeta">
														<span className="transactionCategory">{category.name}</span>
														<span className="transactionDate">{formatDate(transaction.date)}</span>
													</div>
												</div>
												<span className="transactionAmount">{formatCurrency(transaction.amount)}</span>
											</div>
										)
									})
								)}
							</div>
							<div className="cardFooter">
								<button onClick={() => router.push('/expenses')} className="viewAllButton">
									Zobacz wszystkie transakcje
								</button>
							</div>
						</Card>
					</div>
				</div>

				<style jsx>{`
					.dashboard-bg {
						min-height: 100vh;
						background: #f7f9fb;
						font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
						overflow-y: auto;
						overflow-x: hidden;
						width: 100%;
						position: relative;
					}

					.dashboard-center {
						max-width: 1200px;
						margin: 0 auto;
						padding: 24px 16px;
						min-height: 100vh;
						display: flex;
						flex-direction: column;
					}

					.header {
						background: linear-gradient(135deg, #3498db, #2980b9);
						color: #fff;
						border-radius: 18px;
						padding: 28px 24px;
						margin-bottom: 24px;
						text-align: center;
						box-shadow: 0 4px 20px rgba(52, 152, 219, 0.15);
					}

					.welcomeText {
						font-size: 2rem;
						font-weight: 700;
						margin: 0 0 12px 0;
						text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
					}

					.dateText {
						font-size: 1.1rem;
						opacity: 0.9;
						margin: 0;
					}

					.dashboard-toolbar {
						display: flex;
						justify-content: space-between;
						align-items: center;
						flex-wrap: wrap;
						gap: 20px;
						margin-bottom: 32px;
						padding: 24px;
						background: #ffffff;
						border-radius: 16px;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
					}

					.periodSelector {
						display: flex;
						align-items: center;
						gap: 12px;
					}

					.periodLabel {
						font-size: 1.1rem;
						font-weight: 500;
						color: #2d3748;
					}

					.periodButtons {
						display: flex;
						gap: 8px;
					}

					.periodButton {
						padding: 8px 18px;
						border-radius: 20px;
						border: none;
						background: #edf2f7;
						color: #4a5568;
						font-weight: 500;
						cursor: pointer;
						transition: all 0.2s ease;
						font-size: 0.95rem;
					}

					.periodButton:hover {
						background: #e2e8f0;
					}

					.periodButton.active {
						background: #3498db;
						color: #fff;
						box-shadow: 0 2px 8px rgba(52, 152, 219, 0.25);
					}

					.quickActions {
						display: flex;
						gap: 16px;
						flex-wrap: wrap;
						padding: 8px;
					}

					.quickActions {
						display: flex;
						gap: 16px;
						padding: 16px;
					}

					.customButton {
						display: inline-flex;
						align-items: center;
						gap: 12px;
						padding: 12px 24px;
						border-radius: 8px;
						font-weight: 500;
						font-size: 14px;
						line-height: 1;
						transition: all 0.2s ease;
						white-space: nowrap;
						background: #3498db;
						color: white;
						border: none;
						cursor: pointer;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
					}

					.customButton:hover {
						transform: translateY(-2px);
						box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
						opacity: 0.95;
					}

					.customButton-scan {
						background: #4834d4;
					}

					.customButton-add {
						background: #2ecc71;
					}

					.customButton-manage {
						background: #e67e22;
					}

					.buttonIcon {
						display: flex;
						align-items: center;
						justify-content: center;
						width: 20px;
						height: 20px;
					}

					.buttonText {
						font-weight: 500;
					}

					.actionButton:hover {
						transform: translateY(-1px);
					}

					.actionIcon {
						display: inline-flex;
						width: 24px;
						height: 24px;
						align-items: center;
						justify-content: center;
					}

					.actionIcon svg {
						width: 16px;
						height: 16px;
					}

					.summaryCardGrid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
						gap: 24px;
						margin-bottom: 32px;
						padding: 0 8px;
					}

					.summaryCard {
						background: white;
						border-radius: 16px;
						padding: 24px;
						display: flex;
						align-items: flex-start;
						gap: 16px;
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
						transition: all 0.3s ease;
					}

					.summaryCard:hover {
						transform: translateY(-2px);
						box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
					}

					.summaryCardIcon {
						width: 48px;
						height: 48px;
						border-radius: 12px;
						display: flex;
						align-items: center;
						justify-content: center;
						flex-shrink: 0;
					}

					.summaryCardIcon svg {
						width: 24px;
						height: 24px;
					}

					.summaryCardContent {
						flex: 1;
						min-width: 0;
						display: flex;
						flex-direction: column;
						gap: 8px;
					}

					.summaryCardValue {
						font-size: 1.5rem;
						font-weight: 600;
						color: #1e293b;
						line-height: 1.2;
					}

					.summaryCardLabel {
						font-size: 0.875rem;
						color: #64748b;
						line-height: 1.2;
					}

					.summaryCardIcon-total {
						background-color: rgba(59, 130, 246, 0.1);
						color: #3b82f6;
					}

					.summaryCardIcon-avg {
						background-color: rgba(16, 185, 129, 0.1);
						color: #10b981;
					}

					.summaryCardIcon-count {
						background-color: rgba(139, 92, 246, 0.1);
						color: #8b5cf6;
					}

					.summaryCardIcon-max {
						background-color: rgba(245, 158, 11, 0.1);
						color: #f59e0b;
					}

					.dashboard-cards {
						display: flex;
						gap: 24px;
						margin-bottom: 32px;
						padding: 24px;
						flex: 1;
						background: #ffffff;
						border-radius: 16px;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
					}

					.dashboard-col {
						flex: 1;
						display: flex;
						flex-direction: column;
						gap: 24px;
						min-width: 300px;
						padding: 24px;
					}

					.dashboard-col-wide {
						flex: 2;
						min-width: 500px;
					}

					.chart-card {
						background: white;
						border-radius: 16px;
						padding: 24px;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
					}

					.chartsHeader {
						margin-bottom: 16px;
					}

					.chartsSectionTitle {
						font-size: 1.25rem;
						font-weight: 600;
						color: #1e293b;
						margin-bottom: 16px;
					}

					.filtersRow {
						display: flex;
						gap: 12px;
						align-items: center;
						margin-bottom: 24px;
					}

					.filterItem {
						display: flex;
						align-items: center;
						gap: 8px;
					}

					.filterLabel {
						font-size: 0.875rem;
						color: #64748b;
					}

					.filterSelect {
						padding: 6px 12px;
						border-radius: 8px;
						border: 1px solid #e2e8f0;
						background: #f8fafc;
						font-size: 0.875rem;
						color: #1e293b;
						outline: none;
					}

					.filterSelect:focus {
						border-color: #3b82f6;
						box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
					}

					.chartsGrid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
						gap: 24px;
					}

					.chartWrapper {
						background: #f8fafc;
						border-radius: 12px;
						padding: 16px;
					}

					.chartTitle {
						font-size: 1rem;
						font-weight: 500;
						color: #334155;
						margin-bottom: 16px;
					}

					.chartContainer {
						background: #f8fafc;
						border-radius: 16px;
						padding: 20px;
						height: 300px;
						margin-top: 20px;
					}

					.emptyChartContainer {
						height: 100%;
						display: flex;
						align-items: center;
						justify-content: center;
						color: #b0b0b0;
					}

					.sectionTitle {
						font-size: 1.125rem;
						font-weight: 600;
						color: #1e293b;
					}

					.cardHeader {
						display: flex;
						justify-content: space-between;
						align-items: center;
						margin-bottom: 16px;
					}

					.refreshButton {
						width: 32px;
						height: 32px;
						border-radius: 8px;
						border: none;
						background: #f1f5f9;
						color: #0ea5e9;
						display: flex;
						align-items: center;
						justify-content: center;
						cursor: pointer;
						transition: all 0.2s;
					}

					.refreshButton:hover {
						background: #e2e8f0;
					}

					.transactionsList {
						margin-top: 16px;
						max-height: 400px;
						overflow-y: auto;
						padding: 16px;
						background: #f8fafc;
						border-radius: 12px;
					}

					.transactionItem {
						display: flex;
						align-items: center;
						padding: 16px;
						gap: 16px;
						border-radius: 12px;
						background: white;
						margin-bottom: 12px;
						transition: all 0.2s ease;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
					}

					.transactionItem:hover {
						background: #f8fafc;
						transform: translateX(4px);
					}

					.transactionIcon {
						width: 36px;
						height: 36px;
						border-radius: 8px;
						display: flex;
						align-items: center;
						justify-content: center;
						flex-shrink: 0;
					}

					.transactionIcon svg {
						width: 16px;
						height: 16px;
					}

					.transactionDetails {
						flex: 1;
						min-width: 0;
					}

					.transactionStore {
						font-size: 0.875rem;
						font-weight: 500;
						color: #334155;
						margin-bottom: 2px;
					}

					.transactionMeta {
						display: flex;
						gap: 8px;
						align-items: center;
					}

					.transactionCategory {
						font-size: 0.75rem;
						color: #64748b;
						background: #f1f5f9;
						padding: 2px 6px;
						border-radius: 4px;
					}

					.transactionDate {
						font-size: 0.75rem;
						color: #94a3b8;
					}

					.transactionAmount {
						font-size: 0.875rem;
						font-weight: 600;
						color: #0ea5e9;
					}

					.cardFooter {
						margin-top: 24px;
						padding: 16px;
						display: flex;
						justify-content: center;
						border-top: 1px solid #e2e8f0;
					}

					.viewAllButton {
						font-size: 0.9rem;
						padding: 12px 24px;
						background: #f8fafc;
						border: 1px solid #e2e8f0;
						border-radius: 8px;
						color: #3498db;
						font-weight: 500;
						cursor: pointer;
						transition: all 0.2s ease;
						display: inline-flex;
						align-items: center;
						justify-content: center;
						text-decoration: none;
						margin-top: 16px;
					}

					.viewAllButton:hover {
						background: #f1f5f9;
						border-color: #cbd5e1;
						transform: translateY(-1px);
					}

					.budgetItem {
						background: #f8fafc;
						border-radius: 10px;
						padding: 16px;
						margin-bottom: 12px;
					}

					.budgetItem:last-child {
						margin-bottom: 0;
					}

					.budgetItem:hover {
						background-color: #edf2f7;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
					}

					.budgetNameRow {
						display: flex;
						justify-content: space-between;
						align-items: center;
						margin-bottom: 8px;
					}

					.budgetName {
						font-size: 0.875rem;
						font-weight: 500;
						color: #334155;
					}

					.budgetBadge {
						font-size: 0.75rem;
						padding: 2px 8px;
						border-radius: 6px;
						font-weight: 500;
					}

					.budgetBadge.good {
						background-color: rgba(46, 204, 113, 0.15);
						color: #2ecc71;
					}

					.budgetBadge.warning {
						background-color: rgba(241, 196, 15, 0.15);
						color: #f1c40f;
					}

					.budgetBadge.danger {
						background-color: rgba(231, 76, 60, 0.15);
						color: #e74c3c;
					}

					.budgetProgress {
						height: 8px;
						background: #edf2f7;
						border-radius: 4px;
						margin-bottom: 8px;
						overflow: hidden;
					}

					.progressBar {
						height: 100%;
						border-radius: 4px;
						transition: width 0.3s ease;
					}

					.progressBar.good {
						background: #2ecc71;
					}

					.progressBar.warning {
						background: #f1c40f;
					}

					.progressBar.danger {
						background: #e74c3c;
					}

					.budgetDetails {
						display: flex;
						justify-content: space-between;
						font-size: 0.85rem;
					}

					.budgetText {
						color: #718096;
					}

					.budgetLabel {
						font-weight: 500;
						color: #4a5568;
					}

					.loadingContainer {
						display: flex;
						flex-direction: column;
						justify-content: center;
						align-items: center;
						height: 100vh;
						width: 100%;
					}

					.loadingSpinner {
						width: 40px;
						height: 40px;
						border: 3px solid rgba(52, 152, 219, 0.1);
						border-radius: 50%;
						border-top-color: #3498db;
						animation: spin 1s linear infinite;
						margin-bottom: 16px;
					}

					@keyframes spin {
						to {
							transform: rotate(360deg);
						}
					}

					.loadingText {
						font-size: 1.1rem;
						color: #3498db;
						text-align: center;
					}

					.emptyText {
						text-align: center;
						color: #718096;
						margin: 20px 0;
					}

					@media (max-width: 1024px) {
						.dashboard-cards {
							flex-direction: column;
						}

						.dashboard-col,
						.dashboard-col-wide {
							min-width: 100%;
						}

						.chartContainer {
							height: 250px;
						}
					}

					@media (max-width: 768px) {
						.dashboard-center {
							padding: 16px 12px;
						}

						.header {
							padding: 20px 16px;
							margin-bottom: 20px;
						}

						.welcomeText {
							font-size: 1.6rem;
						}

						.dashboard-toolbar {
							flex-direction: column;
							align-items: stretch;
						}

						.periodSelector {
							flex-direction: column;
							align-items: stretch;
						}

						.periodButtons {
							flex-wrap: wrap;
						}

						.quickActions {
							flex-direction: column;
						}

						.actionButton {
							width: 100%;
							justify-content: center;
						}

						.summaryCardGrid {
							grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
							gap: 16px;
							padding: 0;
						}

						.summaryCard {
							padding: 16px;
						}

						.summaryCardIcon {
							width: 40px;
							height: 40px;
						}

						.summaryCardIcon svg {
							width: 20px;
							height: 20px;
						}

						.summaryCardValue {
							font-size: 1.25rem;
						}

						.summaryCardLabel {
							font-size: 0.8125rem;
						}
					}

					/* Scrollbar styles */
					.transactionsList::-webkit-scrollbar {
						width: 6px;
					}

					.transactionsList::-webkit-scrollbar-track {
						background: #f1f5f9;
						border-radius: 10px;
					}

					.transactionsList::-webkit-scrollbar-thumb {
						background: #cbd5e1;
						border-radius: 10px;
					}

					.transactionsList::-webkit-scrollbar-thumb:hover {
						background: #94a3b8;
					}

					.dashboard-summary {
						padding: 20px 0;
						width: 100%;
					}

					.summaryCardGrid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
						gap: 24px;
						width: 100%;
					}

					.summaryCard {
						background: white;
						border-radius: 16px;
						padding: 24px;
						display: flex;
						align-items: center;
						gap: 16px;
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
						transition: all 0.3s ease;
					}

					.summaryCard:hover {
						transform: translateY(-2px);
						box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
					}

					.summaryCardIcon {
						width: 48px;
						height: 48px;
						border-radius: 12px;
						display: flex;
						align-items: center;
						justify-content: center;
						flex-shrink: 0;
					}

					.summaryCardContent {
						display: flex;
						flex-direction: column;
						gap: 4px;
					}

					.summaryCardLabel {
						font-size: 0.875rem;
						color: #64748b;
						font-weight: 500;
					}

					.summaryCardValue {
						font-size: 1.5rem;
						font-weight: 600;
						color: #1e293b;
					}

					.summaryCardIcon-total {
						background-color: rgba(59, 130, 246, 0.1);
						color: #3b82f6;
					}

					.summaryCardIcon-avg {
						background-color: rgba(16, 185, 129, 0.1);
						color: #10b981;
					}

					.summaryCardIcon-count {
						background-color: rgba(139, 92, 246, 0.1);
						color: #8b5cf6;
					}

					.summaryCardIcon-max {
						background-color: rgba(245, 158, 11, 0.1);
						color: #f59e0b;
					}

					@media (max-width: 768px) {
						.summaryCardGrid {
							grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
							gap: 16px;
						}

						.summaryCard {
							padding: 16px;
						}

						.summaryCardIcon {
							width: 40px;
							height: 40px;
						}

						.summaryCardValue {
							font-size: 1.25rem;
						}
					}
				`}</style>
			</div>
		</div>
	)
}
