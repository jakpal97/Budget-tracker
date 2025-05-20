import React from 'react'
import styles from './Button.module.css'

const Button = ({
	children,
	onClick,
	variant = 'primary', // primary, secondary, danger, success
	size = 'medium', // small, medium, large
	fullWidth = false,
	disabled = false,
	loading = false,
	icon = null,
	style,
	textStyle,
	className = '',
	...props
}) => {
	const buttonClass = `${styles.button} ${styles[variant]} ${styles[size]} ${className}`

	return (
		<button className={buttonClass} onClick={onClick} disabled={disabled || loading} {...props}>
			{loading ? (
				<div className="loading-spinner" />
			) : (
				<>
					{icon && <span className="button-icon">{icon}</span>}
					{children}
				</>
			)}

			<style jsx>{`
				.button {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding: 10px 20px;
					border-radius: 12px;
					font-weight: 500;
					cursor: pointer;
					transition: all 0.2s ease;
					border: none;
					font-size: 0.95rem;
					gap: 8px;
				}

				.button:hover:not(:disabled) {
					transform: translateY(-1px);
				}

				.button:disabled {
					opacity: 0.6;
					cursor: not-allowed;
				}

				.primary {
					background: #3498db;
					color: white;
				}

				.primary:hover:not(:disabled) {
					background: #2980b9;
				}

				.secondary {
					background: #f1f5f9;
					color: #475569;
				}

				.secondary:hover:not(:disabled) {
					background: #e2e8f0;
				}

				.danger {
					background: #ef4444;
					color: white;
				}

				.danger:hover:not(:disabled) {
					background: #dc2626;
				}

				.success {
					background: #22c55e;
					color: white;
				}

				.success:hover:not(:disabled) {
					background: #16a34a;
				}

				.outline {
					background: transparent;
					border: 1px solid #e2e8f0;
					color: #475569;
				}

				.outline:hover:not(:disabled) {
					background: #f8fafc;
				}

				.small {
					padding: 6px 12px;
					font-size: 0.875rem;
				}

				.medium {
					padding: 10px 20px;
					font-size: 0.95rem;
				}

				.large {
					padding: 12px 24px;
					font-size: 1rem;
				}

				.button-icon {
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.loading-spinner {
					width: 16px;
					height: 16px;
					border: 2px solid rgba(255, 255, 255, 0.3);
					border-radius: 50%;
					border-top-color: white;
					animation: spin 0.8s linear infinite;
				}

				@keyframes spin {
					to {
						transform: rotate(360deg);
					}
				}
			`}</style>
		</button>
	)
}

export default Button
