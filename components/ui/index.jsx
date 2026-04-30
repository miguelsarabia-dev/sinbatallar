// Componentes reutilizables para Sin Batallar
import React from 'react';

// Exportar componentes de UI
export { default as Modal } from './Modal';
export { default as PaymentModal } from './PaymentModal';
export { default as PaymentInfoDropdown } from './PaymentInfoDropdown';
export { default as CalificacionBadge } from './CalificacionBadge';
export { default as NotificationPrompt } from './NotificationPrompt';

// Input con icono reutilizable
export function InputWithIcon({ 
  icon: Icon, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  required = false, 
  disabled = false,
  className = "",
  ...props 
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-secondary text-lg" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full py-3.5 ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 mb-1 border-[1.5px] border-input-border rounded-lg bg-input-bg text-foreground text-base outline-none transition-colors focus:border-primary disabled:opacity-70 ${className}`}
        required={required}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}

// Botón primario reutilizable
export function PrimaryButton({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  type = "button",
  className = "",
  ...props 
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3.5 bg-primary text-foreground border-none rounded-lg font-bold text-lg cursor-pointer tracking-wider transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70 shadow-lg ${className}`}
      {...props}
    >
      {loading ? 'Cargando...' : children}
    </button>
  );
}

// Botón secundario reutilizable
export function SecondaryButton({ 
  children, 
  onClick, 
  disabled = false, 
  className = "",
  ...props 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-3.5 px-6 bg-input-border text-foreground border-none rounded-lg font-bold text-lg cursor-pointer transition-colors hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-70 shadow-lg ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Card contenedor reutilizable
export function Card({ children, className = "", ...props }) {
  return (
    <div 
      className={`bg-card-bg text-foreground p-8 rounded-[18px] shadow-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Mensaje de error reutilizable
export function ErrorMessage({ message, className = "" }) {
  if (!message) return null;
  return (
    <div className={`text-error mb-1 text-center font-medium ${className}`}>
      {message}
    </div>
  );
}

// Mensaje de éxito reutilizable
export function SuccessMessage({ message, className = "" }) {
  if (!message) return null;
  return (
    <div className={`text-success mb-1 text-center font-semibold ${className}`}>
      {message}
    </div>
  );
}

// Spinner de carga reutilizable
export function LoadingSpinner({ size = "h-8 w-8", className = "" }) {
  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${size} ${className}`}></div>
  );
}

// Layout principal para formularios
export function FormLayout({ title, children, className = "" }) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-background p-4 ${className}`}>
      <div className="mb-4 text-center">
        <span className="font-montserrat font-black text-4xl text-primary tracking-wider shadow-lg uppercase block">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// Input de contraseña con toggle de visibilidad
export function PasswordInput({ 
  value, 
  onChange, 
  placeholder = "Contraseña", 
  showPassword, 
  togglePassword,
  required = false,
  disabled = false,
  className = "",
  ...props 
}) {
  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full py-3.5 pl-10 pr-10 mb-1 border-[1.5px] border-input-border rounded-lg bg-input-bg text-foreground text-base outline-none transition-colors focus:border-primary disabled:opacity-70 ${className}`}
        required={required}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        onClick={togglePassword}
        className="absolute right-3.5 top-1/2 transform -translate-y-1/2 bg-transparent border-none text-secondary cursor-pointer text-lg p-0"
        tabIndex={-1}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {/* El icono debe ser pasado desde el componente padre */}
      </button>
    </div>
  );
}
