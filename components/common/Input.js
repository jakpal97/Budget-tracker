import React from 'react'
import styles from './Input.module.css'

const Input = ({
	label,
	value,
	onChange,
	onChangeText,
	placeholder,
	secureTextEntry = false,
	keyboardType = 'default',
	multiline = false,
	numberOfLines = 1,
	error,
	disabled = false,
	icon,
	autoCapitalize = 'none',
	style,
	inputStyle,
	labelStyle,
	required = false,
	maxLength,
	onBlur,
	onFocus,
}) => {
	// Obsługa zarówno onChange jak i onChangeText dla kompatybilności
	const handleChange = e => {
		if (onChange) {
			onChange(e)
		}
		if (onChangeText) {
			onChangeText(e.target.value)
		}
	}

	return (
		<div className={`${styles.container} ${style || ''}`}>
			{label && (
				<label className={`${styles.label} ${labelStyle || ''}`}>
					{label} {required && <span className={styles.required}>*</span>}
				</label>
			)}
			<div
				className={`${styles.inputContainer} 
          ${error ? styles.inputError : ''} 
          ${disabled ? styles.inputDisabled : ''}`}>
				{icon && <div className={styles.iconContainer}>{icon}</div>}
				{multiline ? (
					<textarea
						className={`${styles.input} ${styles.multilineInput} ${icon ? styles.inputWithIcon : ''} ${
							inputStyle || ''
						}`}
						value={value}
						onChange={handleChange}
						placeholder={placeholder}
						disabled={disabled}
						maxLength={maxLength}
						onBlur={onBlur}
						onFocus={onFocus}
						rows={numberOfLines}
					/>
				) : (
					<input
						className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${inputStyle || ''}`}
						type={secureTextEntry ? 'password' : keyboardType === 'numeric' ? 'number' : 'text'}
						value={value}
						onChange={handleChange}
						placeholder={placeholder}
						disabled={disabled}
						maxLength={maxLength}
						onBlur={onBlur}
						onFocus={onFocus}
						autoCapitalize={autoCapitalize}
					/>
				)}
			</div>
			{error && <p className={styles.errorText}>{error}</p>}
		</div>
	)
}

export default Input
