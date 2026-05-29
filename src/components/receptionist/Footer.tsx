const Footer = () => (
  <footer style={{
    textAlign: 'center',
    padding: '14px 24px',
    fontSize: '12px',
    color: 'var(--text-muted, #94a3b8)',
    borderTop: '1px solid var(--border, #e2e8f0)',
    background: 'var(--surface, #fff)',
    fontWeight: 500,
  }}>
    &copy; {new Date().getFullYear()} HMS — Hospital Management System. All rights reserved.
  </footer>
);

export default Footer;
