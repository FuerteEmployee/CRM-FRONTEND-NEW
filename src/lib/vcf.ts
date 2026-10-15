// Minimal vCard (.vcf) parser. Returns rows keyed like the customer import
// spreadsheet columns so they can go straight to POST /clients/import.

const decodeQuotedPrintable = (s: string) => {
  try {
    const bytes = s
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return decodeURIComponent(escape(bytes));
  } catch {
    return s;
  }
};

const unescapeValue = (s: string) =>
  s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

export const parseVcf = (text: string): Record<string, string>[] => {
  // Unfold continuation lines (RFC 6350) and quoted-printable soft breaks.
  const unfolded = text.replace(/\r\n|\r/g, "\n").replace(/\n[ \t]/g, "");

  // Join quoted-printable soft line breaks (line ends with "=") — only on QP
  // lines, so base64 photo padding is left alone.
  const physical = unfolded.split("\n");
  const logical: string[] = [];
  for (let i = 0; i < physical.length; i++) {
    let l = physical[i];
    if (/ENCODING=QUOTED-PRINTABLE/i.test(l)) {
      while (l.endsWith("=") && i + 1 < physical.length) l = l.slice(0, -1) + physical[++i];
    }
    logical.push(l);
  }

  const rows: Record<string, string>[] = [];
  let card: string[] | null = null;

  for (const rawLine of logical) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^BEGIN:VCARD/i.test(line)) {
      card = [];
    } else if (/^END:VCARD/i.test(line)) {
      if (card) {
        const row = cardToRow(card);
        if (row) rows.push(row);
      }
      card = null;
    } else if (card) {
      card.push(line);
    }
  }
  return rows;
};

const cardToRow = (lines: string[]): Record<string, string> | null => {
  let fn = "";
  let nameParts = "";
  let org = "";
  const phones: string[] = [];
  let email = "";
  let website = "";
  let adr: string[] = [];

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const head = line.slice(0, idx);
    let value = line.slice(idx + 1);
    const [propRaw, ...params] = head.split(";");
    const prop = propRaw.split(".").pop()!.toUpperCase(); // strip "item1." group prefix
    if (params.some((p) => /ENCODING=QUOTED-PRINTABLE/i.test(p))) value = decodeQuotedPrintable(value);

    switch (prop) {
      case "FN":
        fn = unescapeValue(value);
        break;
      case "N": {
        const [last, first, middle] = value.split(";").map(unescapeValue);
        nameParts = [first, middle, last].filter(Boolean).join(" ");
        break;
      }
      case "ORG":
        org = unescapeValue(value.split(";")[0]);
        break;
      case "TEL": {
        const num = value.replace(/^tel:/i, "").replace(/[^\d+]/g, "");
        if (num) phones.push(num);
        break;
      }
      case "EMAIL":
        if (!email) email = unescapeValue(value).toLowerCase();
        break;
      case "URL":
        if (!website) website = unescapeValue(value);
        break;
      case "ADR":
        if (!adr.length) adr = value.split(";").map(unescapeValue);
        break;
    }
  }

  const person = fn || nameParts;
  const company = org || person;
  if (!company) return null;

  // Normalize to a bare number: drop +91 / leading 0 on Indian numbers.
  let phone = phones[0] || "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) phone = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) phone = digits.slice(1);
  else if (digits.length === 10) phone = digits;

  // ADR: [pobox, ext, street, city, state, zip, country]
  return {
    "Company Name": company,
    "Connect Person": person,
    "Phone Number": phone,
    Email: email,
    Website: website,
    Address: [adr[1], adr[2]].filter(Boolean).join(", "),
    City: adr[3] || "",
    State: adr[4] || "",
    "Zip Code": adr[5] || "",
    Country: adr[6] || "",
  };
};
