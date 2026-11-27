import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import * as XLSX from "xlsx";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";

// Same shape as the Leads import columns (src/pages/Leads.tsx LEAD_IMPORT_COLUMNS).
const COLUMNS: ImportColumn[] = [
  { key: "Name", sample: "Rahul", required: true, aliases: ["Lead Name", "Full Name"] },
  { key: "Phone", sample: "9876543210", aliases: ["phonenumber", "Mobile", "Mobile No", "No", "Number"] },
  { key: "Email", sample: "a@b.com", aliases: ["E-mail"] },
  { key: "Company", sample: "Acme", aliases: ["Business", "Bussiness"] },
  { key: "City", sample: "Ahmedabad", aliases: ["Location"] },
  { key: "Tags", sample: "hot", core: false },
];

// The "billing sphere leads" sheet: Name / No. / Location / Bussiness (+ one unknown column).
const xlsxFile = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "No.", "Location", "Bussiness", "Remarks"],
    ["Thabsheera p ", 8089703282, "Malappuram", "Computer software developers", "call later"],
    ["Dharmik agravat", 9068795938, "Mathura", "Billing software Dealers", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const bin = XLSX.write(wb, { type: "binary", bookType: "xlsx" });
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
  return new File([bytes], "billing sphere leads.xlsx");
};

const csvFile = (text: string) => new File([text], "leads.csv", { type: "text/csv" });

const upload = (container: HTMLElement, file: File) => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
};

describe("ImportDialog — popup + column mapping", () => {
  it("opens the popup with the sample-file builder", () => {
    render(<ImportDialog title="Import Leads" columns={COLUMNS} onData={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /import leads/i }));
    expect(screen.getByText(/drag & drop your file here/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download sample data/i })).toBeInTheDocument();
    // core columns listed; required one marked
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText(/show 1 more optional fields/i)).toBeInTheDocument();
  });

  it("auto-maps No./Location/Bussiness and puts the phone under 'Phone'", async () => {
    const onData = vi.fn();
    const { container } = render(<ImportDialog title="Import Leads" columns={COLUMNS} onData={onData} />);
    upload(container, xlsxFile());

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Import Field Mapping")).toBeInTheDocument();
    expect(within(dialog).getByText(/2 row\(s\) found/)).toBeInTheDocument();
    // the column no CRM field takes is reported, the mapped ones are not
    expect(within(dialog).getByText(/will NOT be imported/i).parentElement).toHaveTextContent("Remarks");
    expect(within(dialog).getByText(/will NOT be imported/i).parentElement).not.toHaveTextContent("No.");

    fireEvent.click(within(dialog).getByRole("button", { name: /complete import/i }));
    await waitFor(() => expect(onData).toHaveBeenCalledTimes(1));
    const rows = onData.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      Name: "Thabsheera p ",
      Phone: "8089703282",
      City: "Malappuram",
      Company: "Computer software developers",
    });
    expect(rows[1].Phone).toBe("9068795938");
  });

  it("warns when a required field can't be matched", async () => {
    const { container } = render(<ImportDialog title="Import Leads" columns={COLUMNS} onData={vi.fn()} />);
    upload(container, csvFile("Customer,Mobile\nRavi,9000000001\n"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/required field not mapped/i)).toHaveTextContent("Name");
  });

  it("matches header names regardless of case/spacing (CSV)", async () => {
    const onData = vi.fn();
    const { container } = render(<ImportDialog title="Import Leads" columns={COLUMNS} onData={onData} />);
    upload(container, csvFile("full name,MOBILE NO,e-mail\nRavi Patel,9000000001,ravi@x.com\n"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /complete import/i }));
    await waitFor(() => expect(onData).toHaveBeenCalled());
    expect(onData.mock.calls[0][0][0]).toMatchObject({ Name: "Ravi Patel", Phone: "9000000001", Email: "ravi@x.com" });
  });

  it("reads an Excel-saved CSV (UTF-8 BOM, CRLF, quoted comma) like the billing sphere sheet", async () => {
    const onData = vi.fn();
    const { container } = render(<ImportDialog title="Import Leads" columns={COLUMNS} onData={onData} />);
    const csv = "﻿Name,No.,Location,Bussiness\r\nThabsheera p,8089703282,Malappuram,\"Billing, Software\"\r\nYUva,7736178088,Pallakkkad,Billing software\r\n";
    upload(container, csvFile(csv));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/2 row\(s\) found/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /complete import/i }));
    await waitFor(() => expect(onData).toHaveBeenCalled());
    const rows = onData.mock.calls[0][0];
    expect(rows[0]).toMatchObject({ Name: "Thabsheera p", Phone: "8089703282", City: "Malappuram", Company: "Billing, Software" });
    expect(rows[1].Phone).toBe("7736178088");
  });

  it("skipMapping hands rows over without the mapping step", async () => {
    const onData = vi.fn();
    const { container } = render(<ImportDialog title="Import" columns={COLUMNS} onData={onData} skipMapping />);
    upload(container, csvFile("Name\nRavi\n"));
    await waitFor(() => expect(onData).toHaveBeenCalled());
    expect(screen.queryByText("Import Field Mapping")).not.toBeInTheDocument();
  });
});
