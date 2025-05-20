import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Edit2, Trash2, X } from 'react-feather'
import styles from './Categories.module.css'

const CategoryModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
	const [formData, setFormData] = useState({
		name: '',
		color: '#3498db',
		budget: '',
		budgetPeriod: 'monthly',
	})

	useEffect(() => {
		if (initialData) {
			setFormData(initialData)
		}
	}, [initialData])

	const handleSubmit = e => {
		e.preventDefault()
		onSubmit(formData)
	}

	if (!isOpen) return null

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContainer}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>{initialData ? 'Edytuj kategorię' : 'Dodaj kategorię'}</h2>
					<button className={styles.modalClose} onClick={onClose}>
						<X size={24} />
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Nazwa kategorii</label>
						<Input
							type="text"
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							required
						/>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.label}>Kolor</label>
						<input
							type="color"
							value={formData.color}
							onChange={e => setFormData({ ...formData, color: e.target.value })}
							className={styles.colorInput}
						/>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.label}>Budżet (opcjonalnie)</label>
						<Input
							type="number"
							value={formData.budget}
							onChange={e => setFormData({ ...formData, budget: e.target.value })}
							placeholder="0.00"
							step="0.01"
							min="0"
						/>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.label}>Okres budżetowy</label>
						<select
							value={formData.budgetPeriod}
							onChange={e => setFormData({ ...formData, budgetPeriod: e.target.value })}
							className={styles.select}>
							<option value="monthly">Miesięczny</option>
							<option value="yearly">Roczny</option>
						</select>
					</div>

					<div className={styles.modalActions}>
						<Button type="button" variant="outline" onClick={onClose}>
							Anuluj
						</Button>
						<Button type="submit">{initialData ? 'Zapisz zmiany' : 'Dodaj kategorię'}</Button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default function CategoriesPage() {
	const { data: session, status } = useSession()
	const router = useRouter()
	const [categories, setCategories] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [error, setError] = useState(null)
	const [editingCategory, setEditingCategory] = useState(null)

	useEffect(() => {
		if (session) {
			fetchCategories()
		}
	}, [session])

	const fetchCategories = async () => {
		try {
			const response = await fetch('/api/categories')
			const data = await response.json()

			if (data.success) {
				setCategories(data.data)
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError('Nie udało się pobrać kategorii')
			console.error('Błąd podczas pobierania kategorii:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const handleModalSubmit = async formData => {
		try {
			const url = editingCategory ? `/api/categories/${editingCategory._id}` : '/api/categories'
			const method = editingCategory ? 'PUT' : 'POST'

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			})

			const data = await response.json()

			if (data.success) {
				if (editingCategory) {
					setCategories(categories.map(cat => (cat._id === editingCategory._id ? data.data : cat)))
				} else {
					setCategories([...categories, data.data])
				}
				handleCloseModal()
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError(`Nie udało się ${editingCategory ? 'zaktualizować' : 'dodać'} kategorii`)
			console.error('Błąd podczas operacji na kategorii:', error)
		}
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingCategory(null)
	}

	const handleEditClick = category => {
		setEditingCategory(category)
		setIsModalOpen(true)
	}

	const handleDeleteCategory = async categoryId => {
		if (!window.confirm('Czy na pewno chcesz usunąć tę kategorię?')) {
			return
		}

		try {
			const response = await fetch(`/api/categories/${categoryId}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (data.success) {
				setCategories(categories.filter(cat => cat._id !== categoryId))
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError('Nie udało się usunąć kategorii')
			console.error('Błąd podczas usuwania kategorii:', error)
		}
	}

	if (status === 'loading' || isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie kategorii...</p>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>Kategorie wydatków</h1>
				<Button onClick={() => setIsModalOpen(true)}>Dodaj kategorię</Button>
			</div>

			{error && (
				<Card className={styles.errorCard}>
					<p className={styles.errorText}>{error}</p>
				</Card>
			)}

			<Card>
				<p className={styles.cardDescription}>
					Kategorie pozwalają na lepsze zarządzanie i analizę wydatków. Możesz również ustalić budżet dla każdej
					kategorii.
				</p>
			</Card>

			<div className={styles.categoriesContainer}>
				{categories.length > 0 ? (
					categories.map(category => (
						<Card key={category._id} className={styles.categoryCard}>
							<div className={styles.categoryHeader}>
								<div className={styles.categoryInfo}>
									<div className={styles.categoryColor} style={{ backgroundColor: category.color }} />
									<div className={styles.categoryTextContainer}>
										<h3 className={styles.categoryName}>{category.name}</h3>
										{category.budget && (
											<p className={styles.categoryBudget}>
												Budżet: {category.budget} zł / {category.budgetPeriod === 'monthly' ? 'miesiąc' : 'rok'}
											</p>
										)}
									</div>
								</div>
								<div className={styles.categoryActions}>
									<Button
										onClick={() => handleEditClick(category)}
										variant="outline"
										size="small"
										className={styles.actionButton}>
										<Edit2 size={16} />
									</Button>
									<Button
										onClick={() => handleDeleteCategory(category._id)}
										variant="danger"
										size="small"
										className={styles.actionButton}>
										<Trash2 size={16} />
									</Button>
								</div>
							</div>
						</Card>
					))
				) : (
					<div className={styles.emptyState}>
						<p className={styles.emptyStateText}>Nie masz jeszcze żadnych kategorii. Dodaj pierwszą kategorię!</p>
					</div>
				)}
			</div>

			<CategoryModal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				onSubmit={handleModalSubmit}
				initialData={editingCategory}
			/>
		</div>
	)
}
