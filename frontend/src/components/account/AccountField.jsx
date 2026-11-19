import { useState } from 'react';

export default function AccountField({ name, label, error, hint, togglePassword, type = 'text', ...props }) {
  const [visible, setVisible] = useState(false);
  return <div className="orbit-field">
    <label htmlFor={name}>{label}</label>
    <div className="orbit-input"><input id={name} name={name} type={visible ? 'text' : type} required aria-invalid={Boolean(error)} aria-describedby={[error ? name + '-error' : '', hint ? name + '-hint' : ''].filter(Boolean).join(' ') || undefined} {...props} />
      {togglePassword && <button type="button" className="orbit-password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ẩn ' + label.toLowerCase() : 'Hiện ' + label.toLowerCase()}>{visible ? 'Ẩn' : 'Hiện'}</button>}
    </div>
    {hint && <p className="address-help" id={name + '-hint'}>{hint}</p>}
    {error && <p className="orbit-field-error" id={name + '-error'}>{error}</p>}
  </div>;
}
