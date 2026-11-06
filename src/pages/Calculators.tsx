import { useState } from "react";
import { calcMonthlyPayment, fmtMoney } from "../lib/finance";
import { AmortCalc, RefiBox } from "../components/OwnerTabs";
import { EstimateBadge } from "../components/Disclaimers";
export default function Calculators() {
  const [price, setPrice] = useState(1000000); const [down, setDown] = useState(25); const [rate, setRate] = useState(6.75); const [yrs, setYrs] = useState(30);
  const [rent, setRent] = useState(7000); const [vac, setVac] = useState(5); const [opex, setOpex] = useState(30000);
  const loan = price * (1 - down / 100); const pay = calcMonthlyPayment(loan, rate, yrs); const noi = rent * 12 * (1 - vac / 100) - opex; const cf = noi - pay * 12;
  const n = (set: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(Number(e.target.value));
  return (<><h1>Deal calculator <EstimateBadge /></h1>
    <div className="card"><div className="grid">
      <div><label>Price<input type="number" value={price} onChange={n(setPrice)} /></label></div><div><label>Down %<input type="number" value={down} onChange={n(setDown)} /></label></div>
      <div><label>Rate %<input type="number" step="0.01" value={rate} onChange={n(setRate)} /></label></div><div><label>Term (yrs)<input type="number" value={yrs} onChange={n(setYrs)} /></label></div>
      <div><label>Rent/mo<input type="number" value={rent} onChange={n(setRent)} /></label></div><div><label>Vacancy %<input type="number" value={vac} onChange={n(setVac)} /></label></div>
      <div><label>Annual operating costs<input type="number" value={opex} onChange={n(setOpex)} /></label></div></div></div>
    <div className="grid">{[["Loan", fmtMoney(loan)], ["Payment / mo", fmtMoney(pay)], ["NOI", fmtMoney(noi)], ["Cash flow / yr", fmtMoney(cf)], ["Cap rate", (price > 0 ? (noi / price) * 100 : 0).toFixed(2) + "%"], ["DSCR", pay > 0 ? (noi / (pay * 12)).toFixed(2) : "—"]].map(([l, v]) => <div className="card stat" key={l}><div className="l">{l}</div><div className="v">{v}</div></div>)}</div>
    <p className="note">Illustrative math from the numbers above. Rates, taxes, closing costs and rent-regulation limits are not included.</p>
    <h1 style={{ marginTop: 40 }}>Loan tools</h1>
    <AmortCalc />
    <div className="card"><h2>Refinance what-if <EstimateBadge /></h2><RefiBox start={{ balance: 400000, payment: 2900, months: 300 }} /></div></>);
}
