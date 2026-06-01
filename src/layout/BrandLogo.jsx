import gestaoMesaLogo from "../assets/gestao-a-mesa-logo.png";

export function BrandLogo({ small = false }) {
  return (
    <img
      src={gestaoMesaLogo}
      alt="Gestão à Mesa"
      className={small ? "brand-logo small" : "brand-logo"}
    />
  );
}
