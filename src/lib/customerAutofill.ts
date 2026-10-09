// What a document form (invoice, estimate, proposal, credit note, quotation...)
// fills in when a customer is picked — one place, so every form uses the same
// customer fields (CRM-BACKEND/src/models/Client.js) the same way.
// Everything filled here stays editable on the form.

type AnyCustomer = Record<string, any> | null | undefined;

const clean = (v: unknown) => String(v ?? "").trim();

/** Billing address if the customer has one, else their plain address. */
export const customerBillingParts = (c: AnyCustomer) => {
  if (!c) return { street: "", city: "", state: "", zip: "", country: "" };
  const hasBilling = [c.billing_street, c.billing_city, c.billing_state, c.billing_zip].some((v) => clean(v));
  return hasBilling
    ? { street: clean(c.billing_street), city: clean(c.billing_city), state: clean(c.billing_state), zip: clean(c.billing_zip), country: clean(c.billing_country || c.country) }
    : { street: clean(c.address), city: clean(c.city), state: clean(c.state), zip: clean(c.zip), country: clean(c.country) };
};

/** Shipping address if set, else the billing/plain address. */
export const customerShippingParts = (c: AnyCustomer) => {
  if (!c) return customerBillingParts(c);
  const hasShipping = [c.shipping_street, c.shipping_city, c.shipping_state, c.shipping_zip].some((v) => clean(v));
  return hasShipping
    ? { street: clean(c.shipping_street), city: clean(c.shipping_city), state: clean(c.shipping_state), zip: clean(c.shipping_zip), country: clean(c.shipping_country || c.country) }
    : customerBillingParts(c);
};

/** One-block address text: "street, city, state - zip, country". */
export const formatCustomerAddress = (c: AnyCustomer, kind: "billing" | "shipping" = "billing") => {
  const p = kind === "shipping" ? customerShippingParts(c) : customerBillingParts(c);
  const stateZip = [p.state, p.zip].filter(Boolean).join(" - ");
  return [p.street, p.city, stateZip, p.country].filter(Boolean).join(", ");
};

/** The customer's assigned sales person: { id, name } (empty strings when none). */
export const customerSalesPerson = (c: AnyCustomer) => {
  const sp = c?.sales_person;
  if (!sp) return { id: "", name: "" };
  if (typeof sp === "string") return { id: sp, name: "" };
  return { id: clean(sp._id), name: `${clean(sp.firstname)} ${clean(sp.lastname)}`.trim() };
};

/** All the buyer details a form may want, with "" for anything missing. */
export const customerDetails = (c: AnyCustomer) => ({
  company: clean(c?.company),
  contactPerson: clean(c?.contact_person),
  phone: clean(c?.phonenumber),
  email: clean(c?.email),
  gstNumber: clean(c?.gst_number).toUpperCase(),
  vat: clean(c?.vat),
  pan: clean(c?.pan_number).toUpperCase(),
  currency: clean(c?.currency),
  billing: customerBillingParts(c),
  shipping: customerShippingParts(c),
  billingText: formatCustomerAddress(c, "billing"),
  salesPerson: customerSalesPerson(c),
});
