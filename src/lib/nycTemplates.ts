// Starting points for reminders. They contain no dates and no legal statements: the owner picks every date and confirms
// the requirements with an attorney, accountant, or the agency. Source for the list: common NYC owner checklists.
import type { ReminderRow } from "./owner";
export interface Template { id: string; title: string; kind: ReminderRow["kind"]; repeat: "none" | "monthly" | "quarterly" | "yearly"; hint: string; link?: string; }
export const NYC_TEMPLATES: Template[] = [
  { id: "hpd-reg", title: "HPD property registration", kind: "other", repeat: "yearly", hint: "Usually renewed every year, and when ownership or managing agent changes.", link: "https://www.nyc.gov/site/hpd/index.page" },
  { id: "dhcr", title: "DHCR rent registration (rent-stabilized units)", kind: "other", repeat: "yearly", hint: "Only if you have registered rent-stabilized units.", link: "https://hcr.ny.gov/rent-registration" },
  { id: "boiler", title: "Boiler inspection and filing", kind: "inspection", repeat: "yearly", hint: "For buildings with a boiler." },
  { id: "heat-service", title: "Service heating system before heat season", kind: "inspection", repeat: "yearly", hint: "Heat season is commonly Oct 1 – May 31; many owners service in late summer." },
  { id: "gas", title: "Gas piping inspection (Local Law 152)", kind: "inspection", repeat: "none", hint: "Periodic, on a cycle that depends on your community district." },
  { id: "facade", title: "Facade inspection (FISP / Local Law 11)", kind: "inspection", repeat: "none", hint: "Applies to taller buildings, on a multi-year cycle." },
  { id: "elevator", title: "Elevator inspection", kind: "inspection", repeat: "yearly", hint: "Only if the building has an elevator." },
  { id: "window", title: "Window guard notice to tenants", kind: "other", repeat: "yearly", hint: "Annual tenant notice or inquiry." },
  { id: "lead", title: "Lead paint notice to tenants", kind: "other", repeat: "yearly", hint: "Annual tenant notice or inquiry." },
  { id: "ie", title: "Income & expense filing with the Dept. of Finance", kind: "other", repeat: "yearly", hint: "Applies to some buildings. Ask your accountant." },
  { id: "ins", title: "Building insurance renewal", kind: "insurance", repeat: "yearly", hint: "Your policy’s renewal date." },
  { id: "tax", title: "Property tax payment due", kind: "other", repeat: "quarterly", hint: "Check your tax bill for your due dates." },
];
