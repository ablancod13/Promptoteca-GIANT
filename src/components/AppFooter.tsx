import Image from "next/image";
import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Image src="/giant-logo.png" alt="" width={78} height={43} />
          <div>
            <strong>GIANT</strong>
            <span>Grupo de trabajo de Inteligencia Artificial y Nuevas Tecnologías de SEIMC.</span>
            <small>SEIMC · Sociedad Española de Enfermedades Infecciosas y Microbiología Clínica.</small>
          </div>
        </div>
        <div className="footer-actions">
          <Link className="button footer-button" href="/quienes-somos">
            Quiénes somos
          </Link>
          <Link className="footer-terms-link" href="/legal/terminos">
            Términos de uso
          </Link>
        </div>
      </div>
    </footer>
  );
}
